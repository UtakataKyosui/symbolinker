mod agent;
mod commands;
mod error;
mod fsops;
mod hook_meta;
mod import;
mod inspect;
mod layout;
mod model;
mod reconcile;
mod service;
mod profile_ops;
mod state_repo;
#[cfg(all(test, unix))]
mod testutil;

use specta_typescript::Typescript;
use tauri_specta::{collect_commands, collect_events, Builder};

use crate::model::OverviewChanged;

#[tauri::command]
#[specta::specta]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[cfg(any(debug_assertions, test))]
const BINDINGS_PATH: &str = "../src/bindings.ts";

fn specta_builder() -> Builder<tauri::Wry> {
    Builder::<tauri::Wry>::new()
        .commands(collect_commands![
            greet,
            commands::agent_overview,
            commands::adopt,
            commands::import_unmanaged,
            commands::save_profile,
            commands::delete_profile,
            commands::activate_profile,
            commands::unlink_kind,
            commands::get_hook_meta,
            commands::save_hook_meta,
        ])
        .events(collect_events![OverviewChanged])
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let builder = specta_builder();

    #[cfg(debug_assertions)]
    builder
        .export(Typescript::default(), BINDINGS_PATH)
        .expect("failed to export typescript bindings");

    tauri::Builder::default()
        .plugin(tauri_plugin_cli::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(builder.invoke_handler())
        .setup(move |app| {
            builder.mount_events(app);
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[cfg(test)]
mod tests {
    use super::*;

    /// bindings.ts を再生成する。`cargo test regenerate_bindings -- --ignored` で実行する。
    #[test]
    #[ignore]
    fn regenerate_bindings() {
        specta_builder()
            .export(Typescript::default(), BINDINGS_PATH)
            .expect("failed to export typescript bindings");
    }

    /// 生成結果がコミット済みの bindings.ts と一致することを確認する。書き換えはしない。
    #[test]
    fn committed_bindings_match_the_registered_commands() {
        let out = tempfile::tempdir().unwrap();
        let generated = out.path().join("bindings.ts");
        specta_builder()
            .export(Typescript::default(), &generated)
            .expect("failed to export typescript bindings");

        let committed = std::fs::read_to_string(BINDINGS_PATH)
            .expect("src/bindings.ts is missing; run the app in debug once to generate it");
        assert_eq!(
            std::fs::read_to_string(generated).unwrap(),
            committed,
            "src/bindings.ts is stale; run the app in debug to regenerate it"
        );
    }
}
