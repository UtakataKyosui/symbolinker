//! Agent 側のユーザー項目を `library` へ取り込む。検査(読むだけ)と移動(書き込み)は別の関数。
use std::fs;
use std::io;

use crate::agent::Kind;
use crate::error::SymlinkError;
use crate::fsops::move_entry;
use crate::layout::Layout;
use crate::model::Items;

/// 何も動かす前に、取り込めない状態を全て弾く。
pub fn check_importable(layout: &Layout, items: &Items) -> Result<(), SymlinkError> {
    for kind in Kind::ALL {
        let dir = layout.agent_dir(kind);
        match fs::symlink_metadata(&dir) {
            Err(err) if err.kind() == io::ErrorKind::NotFound => {}
            Err(err) => return Err(err.into()),
            Ok(meta) if meta.file_type().is_symlink() => {
                return Err(SymlinkError::ForeignLink(dir.display().to_string()))
            }
            Ok(meta) if !meta.is_dir() => {
                return Err(SymlinkError::AlreadyExists(dir.display().to_string()))
            }
            Ok(_) => {}
        }
        for name in items.get(kind) {
            let dest = layout.library_dir(kind).join(name);
            if fs::symlink_metadata(&dest).is_ok() {
                return Err(SymlinkError::AlreadyExists(dest.display().to_string()));
            }
        }
    }
    Ok(())
}

/// `items` に挙げた項目だけを Agent 側から `library` へ移す。
pub fn move_to_library(layout: &Layout, items: &Items) -> Result<(), SymlinkError> {
    for kind in Kind::ALL {
        let library = layout.library_dir(kind);
        for name in items.get(kind) {
            fs::create_dir_all(&library)?;
            move_entry(&layout.agent_dir(kind).join(name), &library.join(name))?;
        }
    }
    Ok(())
}

#[cfg(all(test, unix))]
mod tests {
    use super::*;
    use crate::agent::Agent;
    use crate::fsops::symlink;
    use crate::testutil::{fixture, names, only, put_library, write};

    #[test]
    fn check_importable_accepts_a_plain_directory_and_a_missing_one() {
        let (_tmp, layout) = fixture(Agent::Claude);
        write(&layout.agent_dir(Kind::Skills).join("a/x"));
        assert!(check_importable(&layout, &only(Kind::Skills, &["a"])).is_ok());
    }

    #[test]
    fn check_importable_rejects_a_symlinked_directory() {
        let (tmp, layout) = fixture(Agent::Claude);
        std::fs::create_dir_all(layout.agent_dir(Kind::Rules).parent().unwrap()).unwrap();
        symlink(&tmp.path().join("dotfiles"), &layout.agent_dir(Kind::Rules)).unwrap();
        assert!(matches!(
            check_importable(&layout, &Items::default()),
            Err(SymlinkError::ForeignLink(_))
        ));
    }

    #[test]
    fn check_importable_rejects_a_regular_file_in_place_of_a_directory() {
        let (_tmp, layout) = fixture(Agent::Claude);
        write(&layout.agent_dir(Kind::Hooks));
        assert!(matches!(
            check_importable(&layout, &Items::default()),
            Err(SymlinkError::AlreadyExists(_))
        ));
    }

    #[test]
    fn check_importable_rejects_a_name_already_in_the_library() {
        let (_tmp, layout) = fixture(Agent::Claude);
        write(&layout.agent_dir(Kind::Skills).join("a/x"));
        put_library(&layout, Kind::Skills, "a");
        assert!(matches!(
            check_importable(&layout, &only(Kind::Skills, &["a"])),
            Err(SymlinkError::AlreadyExists(_))
        ));
    }

    #[test]
    fn check_importable_does_not_move_anything() {
        let (_tmp, layout) = fixture(Agent::Claude);
        write(&layout.agent_dir(Kind::Skills).join("a/x"));
        check_importable(&layout, &only(Kind::Skills, &["a"])).unwrap();
        assert!(layout.agent_dir(Kind::Skills).join("a/x").is_file());
        assert!(!layout.root().exists());
    }

    #[test]
    fn move_to_library_moves_only_the_listed_items() {
        let (_tmp, layout) = fixture(Agent::Codex);
        let dir = layout.agent_dir(Kind::Skills);
        write(&dir.join("a/x"));
        write(&dir.join("keep/x"));
        write(&dir.join(".system/x"));

        move_to_library(&layout, &only(Kind::Skills, &["a"])).unwrap();

        assert_eq!(names(layout.library_dir(Kind::Skills)), ["a"]);
        assert!(layout.library_dir(Kind::Skills).join("a/x").is_file());
        assert_eq!(names(dir), [".system", "keep"]);
    }

    #[test]
    fn move_to_library_creates_library_dirs_only_for_kinds_with_items() {
        let (_tmp, layout) = fixture(Agent::Claude);
        write(&layout.agent_dir(Kind::Rules).join("r.md"));
        move_to_library(&layout, &only(Kind::Rules, &["r.md"])).unwrap();
        assert!(layout.library_dir(Kind::Rules).is_dir());
        assert!(!layout.library_dir(Kind::Skills).exists());
    }
}
