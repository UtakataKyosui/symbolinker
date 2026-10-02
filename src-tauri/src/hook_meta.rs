//! Hook メタデータの読み書き。root/meta/hooks/<name>.json に保存する。
use std::fs;
use std::io;
use std::path::Path;

use crate::error::SymlinkError;
use crate::layout::Layout;
use crate::model::HookMeta;

/// hook name がパス区切り文字を含まない単純なファイル名であることを検証する。
/// `../state.json` のようなパストラバーサル攻撃を防ぐ。
fn validate_name(name: &str) -> Result<(), SymlinkError> {
    let p = Path::new(name);
    if p.components().count() == 1 && p.file_name().is_some_and(|f| f == name) {
        Ok(())
    } else {
        Err(SymlinkError::InvalidName(name.to_owned()))
    }
}

pub fn load(layout: &Layout, name: &str) -> Result<HookMeta, SymlinkError> {
    validate_name(name)?;
    let path = layout.hook_meta_path(name);
    match fs::read_to_string(&path) {
        Ok(s) => Ok(serde_json::from_str(&s)?),
        Err(err) if err.kind() == io::ErrorKind::NotFound => Ok(HookMeta::default()),
        Err(err) => Err(err.into()),
    }
}

pub fn save(layout: &Layout, name: &str, meta: &HookMeta) -> Result<(), SymlinkError> {
    validate_name(name)?;
    let path = layout.hook_meta_path(name);
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)?;
    }
    fs::write(&path, serde_json::to_string_pretty(meta)?)?;
    Ok(())
}

#[cfg(all(test, unix))]
mod tests {
    use super::*;
    use crate::agent::Agent;
    use crate::testutil::fixture;

    #[test]
    fn rejects_path_traversal_names() {
        let (_tmp, layout) = fixture(Agent::Claude);
        assert!(load(&layout, "../state.json").is_err());
        assert!(load(&layout, "hooks/evil").is_err());
        assert!(load(&layout, "").is_err());
    }

    #[test]
    fn returns_default_when_file_missing() {
        let (_tmp, layout) = fixture(Agent::Claude);
        assert_eq!(load(&layout, "myhook").unwrap(), HookMeta::default());
    }

    #[test]
    fn round_trips_metadata() {
        let (_tmp, layout) = fixture(Agent::Claude);
        let meta = HookMeta {
            event: Some("PreToolUse".into()),
            runtime: Some("bash".into()),
            timeout: Some(30u32),
            order: Some(1),
            description: Some("runs before tool".into()),
        };
        save(&layout, "myhook", &meta).unwrap();
        assert_eq!(load(&layout, "myhook").unwrap(), meta);
    }
}
