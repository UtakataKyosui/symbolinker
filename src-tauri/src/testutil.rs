//! テスト用の fixture。他モジュールの書き込み関数は使わず、素の fs 操作だけで状態を作る。
use std::fs;
use std::path::{Path, PathBuf};

use crate::agent::{Agent, Kind};
use crate::layout::Layout;
use crate::model::{Items, State};

pub fn fixture(agent: Agent) -> (tempfile::TempDir, Layout) {
    let tmp = tempfile::tempdir().unwrap();
    let layout = Layout::new(
        agent,
        tmp.path().join(format!(".{}", agent.slug())),
        tmp.path().join("managed"),
    );
    (tmp, layout)
}

pub fn write_with(path: &Path, content: &str) {
    fs::create_dir_all(path.parent().unwrap()).unwrap();
    fs::write(path, content).unwrap();
}

pub fn write(path: &Path) {
    write_with(path, "x");
}

pub fn only(kind: Kind, names: &[&str]) -> Items {
    let mut items = Items::default();
    *items.get_mut(kind) = names.iter().map(|n| n.to_string()).collect();
    items
}

pub fn put_state(layout: &Layout, state: &State) {
    write_with(&layout.state_path(), &serde_json::to_string(state).unwrap());
}

/// `library/<kind>/<name>/SKILL.md` を作る。
pub fn put_library(layout: &Layout, kind: Kind, name: &str) {
    write(&layout.library_dir(kind).join(name).join("SKILL.md"));
}

/// ディレクトリ直下の名前(フィルタなし、ソート済み)。
pub fn names(dir: PathBuf) -> Vec<String> {
    let mut names: Vec<_> = fs::read_dir(dir)
        .map(|rd| {
            rd.map(|e| e.unwrap().file_name().to_string_lossy().into_owned())
                .collect()
        })
        .unwrap_or_default();
    names.sort();
    names
}
