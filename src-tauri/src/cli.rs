//! GUI なしで動くヘッドレス CLI。`Layout` を組み立てて `service` / `inspect` を呼ぶ薄い層。
use std::ffi::OsString;
use std::fs;
use std::io::Write;
use std::path::PathBuf;

use clap::{Parser, Subcommand};
use serde::de::DeserializeOwned;
use serde::Serialize;

use crate::agent::{Agent, Kind};
use crate::error::SymlinkError;
use crate::layout::Layout;
use crate::model::{HookMeta, Overview, Profile};
use crate::{hook_meta, inspect, service};

const APP_IDENTIFIER: &str = "com.taikiamo.symlinker";

#[derive(Debug, Parser)]
#[command(
    name = "symlinker-cli",
    about = "Agent の Harness を管理するヘッドレス CLI"
)]
struct Cli {
    /// 対象の Agent (claude / codex)
    #[arg(long, value_parser = parse_agent)]
    agent: Agent,
    /// Agent 設定ディレクトリを上書きする
    #[arg(long)]
    config_dir: Option<PathBuf>,
    /// 管理ルート(library/ と state.json)を直接指定する
    #[arg(long)]
    root: Option<PathBuf>,
    /// stdout に JSON を 1 値出力する
    #[arg(long)]
    json: bool,
    #[command(subcommand)]
    command: Command,
}

#[derive(Debug, Subcommand)]
enum Command {
    /// 取り込み状況・Profile・Library・Kind ごとの状態を表示する
    Overview,
    /// Unmanaged Item を Library へ移し、`default` Profile を作って有効化する
    Adopt,
    /// Unmanaged Item を Library へ移し、Active Profile に追加する
    Import,
    /// Profile を Active Profile にしてリンクを張り替える
    Activate { profile: String },
    /// Active Profile に合わせて全 Kind のリンクを書き直す
    Reconcile,
    /// 1 つの Kind のアプリ製リンクをすべて外す
    Unlink {
        #[arg(value_parser = parse_kind)]
        kind: Kind,
    },
    /// Profile の操作
    #[command(subcommand)]
    Profile(ProfileCommand),
    /// Hook メタデータの操作
    #[command(subcommand)]
    HookMeta(HookMetaCommand),
}

#[derive(Debug, Subcommand)]
enum ProfileCommand {
    /// Profile JSON を読み込んで保存する(完全置き換え)
    Save {
        #[arg(long)]
        file: PathBuf,
    },
    /// Profile を削除する
    Delete { profile: String },
}

#[derive(Debug, Subcommand)]
enum HookMetaCommand {
    /// Hook のメタデータを取得する
    Get { item: String },
    /// HookMeta JSON を読み込んで保存する(完全置き換え)
    Save {
        item: String,
        #[arg(long)]
        file: PathBuf,
    },
}

fn parse_agent(value: &str) -> Result<Agent, String> {
    match value {
        "claude" => Ok(Agent::Claude),
        "codex" => Ok(Agent::Codex),
        _ => Err("claude または codex を指定してください".into()),
    }
}

fn parse_kind(value: &str) -> Result<Kind, String> {
    Kind::ALL
        .into_iter()
        .find(|kind| kind.dir_name() == value)
        .ok_or_else(|| "skills / agents / hooks / rules のいずれかを指定してください".into())
}

/// 失敗は終了コードと stderr 向けメッセージの組で表す。
struct Failure {
    code: i32,
    message: String,
}

impl From<SymlinkError> for Failure {
    fn from(err: SymlinkError) -> Self {
        Failure {
            code: err.exit_code(),
            message: err.to_string(),
        }
    }
}

fn usage_failure(message: String) -> Failure {
    Failure { code: 2, message }
}

fn layout_for(cli: &Cli) -> Result<Layout, SymlinkError> {
    let config_dir = match &cli.config_dir {
        Some(dir) => dir.clone(),
        None => cli.agent.config_dir()?,
    };
    let root = match &cli.root {
        Some(root) => root.clone(),
        None => dirs::data_dir()
            .ok_or(SymlinkError::HomeDirNotFound)?
            .join(APP_IDENTIFIER)
            .join("managed")
            .join(cli.agent.slug()),
    };
    Ok(Layout::new(
        cli.agent,
        std::path::absolute(config_dir)?,
        std::path::absolute(root)?,
    ))
}

fn read_json<T: DeserializeOwned>(file: &PathBuf) -> Result<T, Failure> {
    let text = fs::read_to_string(file).map_err(|err| {
        let failure = Failure::from(SymlinkError::from(err));
        Failure {
            message: format!("{} を読めません: {}", file.display(), failure.message),
            ..failure
        }
    })?;
    serde_json::from_str(&text)
        .map_err(|err| usage_failure(format!("{} の JSON が不正です: {err}", file.display())))
}

fn to_json<T: Serialize>(value: &T) -> Result<String, Failure> {
    serde_json::to_string_pretty(value).map_err(|err| SymlinkError::from(err).into())
}

/// `json` なら JSON 1 値、そうでなければ `human` を返す。
fn render<T: Serialize>(
    json: bool,
    value: &T,
    human: impl FnOnce() -> String,
) -> Result<String, Failure> {
    if json {
        to_json(value)
    } else {
        Ok(human())
    }
}

fn done(json: bool, message: &str) -> String {
    if json {
        "null".into()
    } else {
        message.into()
    }
}

fn names(items: &[String]) -> String {
    if items.is_empty() {
        "-".into()
    } else {
        items.join(", ")
    }
}

fn format_overview(overview: &Overview) -> String {
    let mut lines = vec![format!("adopted: {}", overview.adopted)];
    lines.push(format!(
        "active: {}",
        overview.active.as_deref().unwrap_or("-")
    ));
    lines.push(format!(
        "profiles: {}",
        names(
            &overview
                .profiles
                .iter()
                .map(|p| p.name.clone())
                .collect::<Vec<_>>()
        )
    ));
    for kind in Kind::ALL {
        lines.push(format!(
            "library/{}: {}",
            kind.dir_name(),
            names(overview.library.get(kind))
        ));
    }
    for status in &overview.links {
        let dir = status.kind.dir_name();
        let note = if status.dir_is_symlink {
            " (dir is symlink)"
        } else {
            ""
        };
        lines.push(format!("{dir}{note}:"));
        lines.push(format!("  linked: {}", names(&status.linked)));
        lines.push(format!("  system: {}", names(&status.system)));
        lines.push(format!("  unmanaged: {}", names(&status.unmanaged)));
    }
    lines.join("\n")
}

fn format_hook_meta(meta: &HookMeta) -> String {
    let opt = |v: Option<String>| v.unwrap_or_else(|| "-".into());
    [
        format!("event: {}", opt(meta.event.clone())),
        format!("runtime: {}", opt(meta.runtime.clone())),
        format!("timeout: {}", opt(meta.timeout.map(|v| v.to_string()))),
        format!("order: {}", opt(meta.order.map(|v| v.to_string()))),
        format!("description: {}", opt(meta.description.clone())),
    ]
    .join("\n")
}

fn execute(cli: &Cli) -> Result<String, Failure> {
    let layout = layout_for(cli)?;
    let json = cli.json;
    match &cli.command {
        Command::Overview => {
            let overview = inspect::overview(&layout)?;
            render(json, &overview, || format_overview(&overview))
        }
        Command::Adopt => {
            service::adopt(&layout)?;
            Ok(done(json, "adopt が完了しました"))
        }
        Command::Import => {
            service::import_unmanaged(&layout)?;
            Ok(done(json, "import が完了しました"))
        }
        Command::Activate { profile } => {
            service::activate_profile(&layout, profile)?;
            Ok(done(json, &format!("Profile {profile} を有効にしました")))
        }
        Command::Reconcile => {
            service::reconcile(&layout)?;
            Ok(done(json, "reconcile が完了しました"))
        }
        Command::Unlink { kind } => {
            service::unlink_kind(&layout, *kind)?;
            Ok(done(
                json,
                &format!("{} のリンクを外しました", kind.dir_name()),
            ))
        }
        Command::Profile(ProfileCommand::Save { file }) => {
            let profile: Profile = read_json(file)?;
            let name = profile.name.clone();
            service::save_profile(&layout, profile)?;
            Ok(done(json, &format!("Profile {name} を保存しました")))
        }
        Command::Profile(ProfileCommand::Delete { profile }) => {
            service::delete_profile(&layout, profile)?;
            Ok(done(json, &format!("Profile {profile} を削除しました")))
        }
        Command::HookMeta(HookMetaCommand::Get { item }) => {
            let meta = hook_meta::load(&layout, item)?;
            render(json, &meta, || format_hook_meta(&meta))
        }
        Command::HookMeta(HookMetaCommand::Save { item, file }) => {
            let meta: HookMeta = read_json(file)?;
            hook_meta::save(&layout, item, &meta)?;
            Ok(done(json, &format!("{item} のメタデータを保存しました")))
        }
    }
}

fn write_stdout(text: &str, out: &mut dyn Write, err: &mut dyn Write) -> i32 {
    match out.write_all(text.as_bytes()).and_then(|()| out.flush()) {
        Ok(()) => 0,
        Err(error) => {
            let failure = Failure::from(SymlinkError::from(error));
            let _ = writeln!(err, "{}", failure.message);
            failure.code
        }
    }
}

/// CLI を実行して終了コードを返す。出力は `out` / `err` に書く。
pub fn run<I, T>(args: I, out: &mut dyn Write, err: &mut dyn Write) -> i32
where
    I: IntoIterator<Item = T>,
    T: Into<OsString> + Clone,
{
    let cli = match Cli::try_parse_from(args) {
        Ok(cli) => cli,
        Err(e) => {
            if !e.use_stderr() {
                return write_stdout(&e.to_string(), out, err);
            }
            let _ = write!(err, "{e}");
            return 2;
        }
    };
    match execute(&cli) {
        Ok(text) => write_stdout(&format!("{text}\n"), out, err),
        Err(failure) => {
            let _ = writeln!(err, "{}", failure.message);
            failure.code
        }
    }
}

pub fn main_with_env() -> i32 {
    run(
        std::env::args_os(),
        &mut std::io::stdout(),
        &mut std::io::stderr(),
    )
}

#[cfg(all(test, unix))]
mod tests {
    use super::*;
    use std::path::Path;

    struct Env {
        tmp: tempfile::TempDir,
    }

    impl Env {
        fn new() -> Self {
            Env {
                tmp: tempfile::tempdir().unwrap(),
            }
        }

        fn config(&self) -> PathBuf {
            self.tmp.path().join(".claude")
        }

        fn run(&self, extra: &[&str]) -> (i32, String, String) {
            let mut args = vec![
                "symlinker-cli".to_string(),
                "--agent".into(),
                "claude".into(),
                "--config-dir".into(),
                self.config().display().to_string(),
                "--root".into(),
                self.tmp.path().join("managed").display().to_string(),
            ];
            args.extend(extra.iter().map(|s| s.to_string()));
            let (mut out, mut err) = (Vec::new(), Vec::new());
            let code = run(args, &mut out, &mut err);
            (
                code,
                String::from_utf8(out).unwrap(),
                String::from_utf8(err).unwrap(),
            )
        }

        fn put_skill(&self, name: &str) {
            let dir = self.config().join("skills").join(name);
            fs::create_dir_all(&dir).unwrap();
            fs::write(dir.join("SKILL.md"), "x").unwrap();
        }
    }

    fn write_file(path: &Path, text: &str) -> String {
        fs::write(path, text).unwrap();
        path.display().to_string()
    }

    #[test]
    fn overview_works_before_adopt() {
        let env = Env::new();
        let (code, out, _) = env.run(&["--json", "overview"]);
        assert_eq!(code, 0);
        let value: serde_json::Value = serde_json::from_str(&out).unwrap();
        assert_eq!(value["adopted"], false);
    }

    #[test]
    fn adopt_then_overview_lists_the_default_profile() {
        let env = Env::new();
        env.put_skill("alpha");
        let (code, out, _) = env.run(&["--json", "adopt"]);
        assert_eq!((code, out.trim()), (0, "null"));
        let (_, out, _) = env.run(&["--json", "overview"]);
        let value: serde_json::Value = serde_json::from_str(&out).unwrap();
        assert_eq!(value["active"], "default");
        assert_eq!(value["library"]["skills"][0], "alpha");
    }

    #[test]
    fn domain_rejections_exit_with_3_and_leave_stdout_empty() {
        let env = Env::new();
        let (code, out, err) = env.run(&["--json", "import"]);
        assert_eq!(code, 3);
        assert!(out.is_empty());
        assert!(!err.is_empty());
    }

    #[test]
    fn usage_errors_exit_with_2() {
        let env = Env::new();
        assert_eq!(env.run(&["unlink", "bogus"]).0, 2);
        assert_eq!(
            run(
                ["symlinker-cli", "overview"],
                &mut Vec::new(),
                &mut Vec::new()
            ),
            2
        );
        assert_eq!(
            run(
                ["symlinker-cli", "--agent", "gemini", "overview"],
                &mut Vec::new(),
                &mut Vec::new()
            ),
            2
        );
    }

    #[test]
    fn profile_save_and_delete_round_trip() {
        let env = Env::new();
        env.put_skill("alpha");
        assert_eq!(env.run(&["adopt"]).0, 0);
        let file = write_file(
            &env.tmp.path().join("p.json"),
            r#"{"name":"work","enabled":{"skills":["alpha"],"agents":[],"hooks":[],"rules":[]}}"#,
        );
        assert_eq!(env.run(&["profile", "save", "--file", &file]).0, 0);
        assert_eq!(env.run(&["activate", "work"]).0, 0);
        assert_eq!(env.run(&["profile", "delete", "work"]).0, 3);
        assert_eq!(env.run(&["activate", "default"]).0, 0);
        assert_eq!(env.run(&["profile", "delete", "work"]).0, 0);
    }

    #[test]
    fn invalid_input_json_exits_with_2() {
        let env = Env::new();
        let file = write_file(&env.tmp.path().join("bad.json"), "{");
        assert_eq!(env.run(&["profile", "save", "--file", &file]).0, 2);
        assert_eq!(env.run(&["hook-meta", "save", "h", "--file", &file]).0, 2);
    }

    #[test]
    fn input_file_io_errors_exit_with_4() {
        let env = Env::new();
        for file in [
            env.tmp.path().to_path_buf(),
            env.tmp.path().join("missing.json"),
        ] {
            for command in [vec!["profile", "save"], vec!["hook-meta", "save", "h"]] {
                let mut args = command;
                let file = file.to_str().unwrap();
                args.extend(["--file", file]);
                let (code, out, err) = env.run(&args);
                assert_eq!(code, 4);
                assert!(out.is_empty());
                assert!(!err.is_empty());
            }
        }
    }

    #[test]
    fn stdout_write_and_flush_errors_exit_with_4() {
        struct FailingOutput {
            fail_on_flush: bool,
        }
        impl Write for FailingOutput {
            fn write(&mut self, bytes: &[u8]) -> std::io::Result<usize> {
                if self.fail_on_flush {
                    Ok(bytes.len())
                } else {
                    Err(std::io::ErrorKind::BrokenPipe.into())
                }
            }

            fn flush(&mut self) -> std::io::Result<()> {
                Err(std::io::ErrorKind::BrokenPipe.into())
            }
        }

        let env = Env::new();
        for command in ["overview", "--help"] {
            for fail_on_flush in [false, true] {
                let mut out = FailingOutput { fail_on_flush };
                let mut err = Vec::new();
                let code = run(
                    [
                        "symlinker-cli",
                        "--agent",
                        "claude",
                        "--config-dir",
                        env.tmp.path().to_str().unwrap(),
                        "--root",
                        env.tmp.path().to_str().unwrap(),
                        "--json",
                        command,
                    ],
                    &mut out,
                    &mut err,
                );
                assert_eq!(code, 4);
                assert!(!err.is_empty());
            }
        }
    }

    #[test]
    fn relative_paths_keep_links_working_after_adopt_and_reconcile() {
        let env = Env {
            tmp: tempfile::tempdir_in(".").unwrap(),
        };
        let relative = PathBuf::from(env.tmp.path().file_name().unwrap());
        let config = relative.join(".claude");
        let root = relative.join("managed");
        let run_command = |command: &str, kind: Option<&str>| {
            let mut args = vec![
                "symlinker-cli",
                "--agent",
                "claude",
                "--config-dir",
                config.to_str().unwrap(),
                "--root",
                root.to_str().unwrap(),
                command,
            ];
            args.extend(kind);
            run(args, &mut Vec::new(), &mut Vec::new())
        };
        env.put_skill("alpha");
        assert_eq!(run_command("adopt", None), 0);
        let link = env.config().join("skills/alpha");
        assert!(fs::read_link(&link).unwrap().is_absolute());
        assert_eq!(fs::read_to_string(link.join("SKILL.md")).unwrap(), "x");
        assert_eq!(run_command("unlink", Some("skills")), 0);
        assert!(!link.is_symlink());
        assert_eq!(run_command("reconcile", None), 0);
        assert_eq!(fs::read_to_string(link.join("SKILL.md")).unwrap(), "x");
    }

    #[test]
    fn hook_meta_defaults_then_round_trips() {
        let env = Env::new();
        let (code, out, _) = env.run(&["--json", "hook-meta", "get", "h"]);
        assert_eq!(code, 0);
        let value: serde_json::Value = serde_json::from_str(&out).unwrap();
        assert!(value["event"].is_null());
        let file = write_file(
            &env.tmp.path().join("m.json"),
            r#"{"event":"PreToolUse","timeout":5}"#,
        );
        assert_eq!(env.run(&["hook-meta", "save", "h", "--file", &file]).0, 0);
        let (_, out, _) = env.run(&["--json", "hook-meta", "get", "h"]);
        let value: serde_json::Value = serde_json::from_str(&out).unwrap();
        assert_eq!(value["event"], "PreToolUse");
        assert_eq!(env.run(&["hook-meta", "get", "../x"]).0, 3);
    }

    #[test]
    fn reconcile_restores_removed_links_and_unlink_removes_them() {
        let env = Env::new();
        env.put_skill("alpha");
        assert_eq!(env.run(&["adopt"]).0, 0);
        let link = env.config().join("skills").join("alpha");
        assert!(link.is_symlink());
        assert_eq!(env.run(&["unlink", "skills"]).0, 0);
        assert!(!link.exists());
        assert_eq!(env.run(&["reconcile"]).0, 0);
        assert!(link.is_symlink());
    }
}
