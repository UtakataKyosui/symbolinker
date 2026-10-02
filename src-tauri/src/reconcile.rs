//! Profile の内容と Agent 側のリンクを合わせる。検査(読むだけ)と書き込みを別の関数にしてある。
use std::fs;

use crate::agent::Kind;
use crate::error::SymlinkError;
use crate::fsops::{is_symlink, remove_symlink, symlink, validate_name};
use crate::inspect::{is_owned, list_entries};
use crate::layout::{is_ignored, Layout};
use crate::model::Profile;

/// 項目が有効化できる名前で、`library` に実在するか。
pub fn check_item(layout: &Layout, kind: Kind, name: &str) -> Result<(), SymlinkError> {
    validate_name(name)?;
    if layout.is_system(kind, name) || is_ignored(name) {
        return Err(SymlinkError::InvalidName(name.to_owned()));
    }
    if fs::symlink_metadata(layout.library_dir(kind).join(name)).is_err() {
        return Err(SymlinkError::ItemNotFound(name.to_owned()));
    }
    Ok(())
}

pub fn check_set_items(layout: &Layout, profile: &Profile) -> Result<(), SymlinkError> {
    for kind in Kind::ALL {
        for name in profile.enabled.get(kind) {
            check_item(layout, kind, name)?;
        }
    }
    Ok(())
}

/// `write_links` の前に、全ての種類についてリンクを置けるか検査する(読むだけ)。
pub fn check_link_targets(layout: &Layout, profile: &Profile) -> Result<(), SymlinkError> {
    for kind in Kind::ALL {
        let dir = layout.agent_dir(kind);
        if is_symlink(&dir) {
            return Err(SymlinkError::ForeignLink(dir.display().to_string()));
        }
        for name in profile.enabled.get(kind) {
            check_item(layout, kind, name)?;
            let path = dir.join(name);
            if fs::symlink_metadata(&path).is_ok() && !is_owned(layout, kind, name) {
                return Err(SymlinkError::AlreadyExists(path.display().to_string()));
            }
        }
    }
    Ok(())
}

/// Profile の有効項目に合わせてリンクを増減する。このアプリが置いたリンク以外は触らない。
/// 事前に `check_link_targets` を通しておくこと。
pub fn write_links(layout: &Layout, profile: &Profile) -> Result<(), SymlinkError> {
    for kind in Kind::ALL {
        let dir = layout.agent_dir(kind);
        let wanted = profile.enabled.get(kind);
        fs::create_dir_all(&dir)?;

        for name in list_entries(&dir)? {
            if is_owned(layout, kind, &name) && !wanted.contains(&name) {
                remove_symlink(&dir.join(&name))?;
            }
        }
        for name in wanted {
            if !is_owned(layout, kind, name) {
                symlink(&layout.library_dir(kind).join(name), &dir.join(name))?;
            }
        }
    }
    Ok(())
}

/// 1 種類分の、このアプリが置いたリンクを全て外す。ライブラリと Profile は変えない。
pub fn remove_owned_links(layout: &Layout, kind: Kind) -> Result<(), SymlinkError> {
    let dir = layout.agent_dir(kind);
    for name in list_entries(&dir)? {
        if is_owned(layout, kind, &name) {
            remove_symlink(&dir.join(name))?;
        }
    }
    Ok(())
}

#[cfg(all(test, unix))]
mod tests {
    use super::*;
    use crate::agent::Agent;
    use crate::testutil::{fixture, names, only, put_library, write, write_with};

    fn profile(enabled: crate::model::Items) -> Profile {
        Profile {
            name: "s".into(),
            enabled,
        }
    }

    #[test]
    fn check_item_accepts_existing_library_items() {
        let (_tmp, layout) = fixture(Agent::Claude);
        put_library(&layout, Kind::Skills, "a");
        assert!(check_item(&layout, Kind::Skills, "a").is_ok());
    }

    #[test]
    fn check_item_rejects_unknown_unsafe_system_and_ignored_names() {
        let (_tmp, layout) = fixture(Agent::Codex);
        put_library(&layout, Kind::Skills, ".system");
        put_library(&layout, Kind::Skills, ".DS_Store");
        assert!(matches!(
            check_item(&layout, Kind::Skills, "nope"),
            Err(SymlinkError::ItemNotFound(_))
        ));
        assert!(matches!(
            check_item(&layout, Kind::Skills, "../x"),
            Err(SymlinkError::InvalidName(_))
        ));
        assert!(matches!(
            check_item(&layout, Kind::Skills, ".system"),
            Err(SymlinkError::InvalidName(_))
        ));
        assert!(matches!(
            check_item(&layout, Kind::Skills, ".DS_Store"),
            Err(SymlinkError::InvalidName(_))
        ));
    }

    #[test]
    fn check_set_items_checks_every_kind() {
        let (_tmp, layout) = fixture(Agent::Claude);
        put_library(&layout, Kind::Skills, "a");
        assert!(check_set_items(&layout, &profile(only(Kind::Skills, &["a"]))).is_ok());
        assert!(matches!(
            check_set_items(&layout, &profile(only(Kind::Hooks, &["missing"]))),
            Err(SymlinkError::ItemNotFound(_))
        ));
    }

    #[test]
    fn check_link_targets_rejects_a_symlinked_directory() {
        let (tmp, layout) = fixture(Agent::Claude);
        std::fs::create_dir_all(layout.agent_dir(Kind::Rules).parent().unwrap()).unwrap();
        symlink(&tmp.path().join("dotfiles"), &layout.agent_dir(Kind::Rules)).unwrap();
        assert!(matches!(
            check_link_targets(&layout, &profile(Default::default())),
            Err(SymlinkError::ForeignLink(_))
        ));
    }

    #[test]
    fn check_link_targets_rejects_a_user_entry_with_the_same_name() {
        let (_tmp, layout) = fixture(Agent::Claude);
        put_library(&layout, Kind::Skills, "a");
        write(&layout.agent_dir(Kind::Skills).join("a/own.md"));
        assert!(matches!(
            check_link_targets(&layout, &profile(only(Kind::Skills, &["a"]))),
            Err(SymlinkError::AlreadyExists(_))
        ));
    }

    #[test]
    fn check_link_targets_accepts_missing_and_already_owned_entries() {
        let (_tmp, layout) = fixture(Agent::Claude);
        put_library(&layout, Kind::Skills, "a");
        put_library(&layout, Kind::Skills, "b");
        let enabled = only(Kind::Skills, &["a", "b"]);
        write_links(&layout, &profile(only(Kind::Skills, &["a"]))).unwrap();
        assert!(check_link_targets(&layout, &profile(enabled)).is_ok());
    }

    #[test]
    fn check_link_targets_does_not_write_anything() {
        let (_tmp, layout) = fixture(Agent::Claude);
        put_library(&layout, Kind::Skills, "a");
        check_link_targets(&layout, &profile(only(Kind::Skills, &["a"]))).unwrap();
        assert!(!layout.agent_dir(Kind::Skills).exists());
    }

    #[test]
    fn write_links_creates_directory_and_links_for_enabled_items() {
        let (_tmp, layout) = fixture(Agent::Claude);
        put_library(&layout, Kind::Skills, "a");
        put_library(&layout, Kind::Skills, "b");

        write_links(&layout, &profile(only(Kind::Skills, &["a"]))).unwrap();

        assert_eq!(names(layout.agent_dir(Kind::Skills)), ["a"]);
        assert!(layout.agent_dir(Kind::Skills).join("a/SKILL.md").is_file());
        for kind in [Kind::Agents, Kind::Hooks, Kind::Rules] {
            assert!(layout.agent_dir(kind).is_dir());
        }
    }

    #[test]
    fn write_links_removes_only_owned_links_that_are_no_longer_wanted() {
        let (_tmp, layout) = fixture(Agent::Codex);
        put_library(&layout, Kind::Skills, "a");
        put_library(&layout, Kind::Skills, "b");
        write_links(&layout, &profile(only(Kind::Skills, &["a", "b"]))).unwrap();
        let dir = layout.agent_dir(Kind::Skills);
        write(&dir.join(".system/x"));
        write(&dir.join("mine/x"));

        write_links(&layout, &profile(only(Kind::Skills, &["a"]))).unwrap();

        assert_eq!(names(dir.clone()), [".system", "a", "mine"]);
        assert!(dir.join(".system/x").is_file() && dir.join("mine/x").is_file());
        assert!(layout
            .library_dir(Kind::Skills)
            .join("b/SKILL.md")
            .is_file());
    }

    #[test]
    fn write_links_is_idempotent() {
        let (_tmp, layout) = fixture(Agent::Claude);
        put_library(&layout, Kind::Hooks, "h.py");
        let s = profile(only(Kind::Hooks, &["h.py"]));
        write_links(&layout, &s).unwrap();
        write_links(&layout, &s).unwrap();
        assert_eq!(names(layout.agent_dir(Kind::Hooks)), ["h.py"]);
    }

    #[test]
    fn write_links_exposes_library_content_unchanged() {
        let (_tmp, layout) = fixture(Agent::Codex);
        write_with(
            &layout.library_dir(Kind::Hooks).join("policy.json"),
            "{\"a\": 1}\n",
        );
        write_links(&layout, &profile(only(Kind::Hooks, &["policy.json"]))).unwrap();
        let via_link = layout.agent_dir(Kind::Hooks).join("policy.json");
        assert_eq!(std::fs::read_to_string(via_link).unwrap(), "{\"a\": 1}\n");
    }

    #[test]
    fn remove_owned_links_keeps_user_entries_and_library() {
        let (_tmp, layout) = fixture(Agent::Claude);
        put_library(&layout, Kind::Rules, "r");
        write_links(&layout, &profile(only(Kind::Rules, &["r"]))).unwrap();
        write(&layout.agent_dir(Kind::Rules).join("mine.md"));

        remove_owned_links(&layout, Kind::Rules).unwrap();

        assert_eq!(names(layout.agent_dir(Kind::Rules)), ["mine.md"]);
        assert!(layout.library_dir(Kind::Rules).join("r/SKILL.md").is_file());
    }
}
