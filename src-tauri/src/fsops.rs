use std::fs;
use std::io;
use std::path::{Component, Path, PathBuf};

use crate::error::SymlinkError;

pub fn validate_name(name: &str) -> Result<(), SymlinkError> {
    let mut components = Path::new(name).components();
    match (components.next(), components.next()) {
        // components() は末尾の `/` を無視するので、元の文字列との一致も確認する
        (Some(Component::Normal(part)), None) if part == name => Ok(()),
        _ => Err(SymlinkError::InvalidName(name.to_owned())),
    }
}

pub fn symlink(source: &Path, link: &Path) -> io::Result<()> {
    #[cfg(unix)]
    {
        std::os::unix::fs::symlink(source, link)
    }
    #[cfg(windows)]
    {
        if source.is_dir() {
            std::os::windows::fs::symlink_dir(source, link)
        } else {
            std::os::windows::fs::symlink_file(source, link)
        }
    }
}

pub fn remove_symlink(link: &Path) -> io::Result<()> {
    #[cfg(windows)]
    if link.is_dir() {
        return fs::remove_dir(link);
    }
    fs::remove_file(link)
}

pub fn is_symlink(path: &Path) -> bool {
    fs::symlink_metadata(path).is_ok_and(|meta| meta.file_type().is_symlink())
}

/// 取り込み用に `src` を `dst` へ移動する。データは削除せず、検証後にのみ元を消す。
pub fn move_entry(src: &Path, dst: &Path) -> Result<(), SymlinkError> {
    if fs::symlink_metadata(dst).is_ok() {
        return Err(SymlinkError::AlreadyExists(dst.display().to_string()));
    }
    if is_symlink(src) {
        // 相対リンクは移動すると壊れるので、絶対パスに直して作り直す
        let target = fs::read_link(src)?;
        let absolute = if target.is_absolute() {
            target
        } else {
            let parent = fs::canonicalize(src.parent().unwrap_or(Path::new(".")))?;
            normalize(&parent.join(target))
        };
        symlink(&absolute, dst)?;
        return Ok(remove_symlink(src)?);
    }
    match fs::rename(src, dst) {
        Ok(()) => Ok(()),
        Err(err) if err.kind() == io::ErrorKind::CrossesDevices => {
            copy_recursive(src, dst)?;
            if fs::symlink_metadata(src)?.is_dir() {
                fs::remove_dir_all(src)?;
            } else {
                fs::remove_file(src)?;
            }
            Ok(())
        }
        Err(err) => Err(err.into()),
    }
}

/// `..` を字面で畳む。移動後にリンク経由で `..` が別の場所へ辿られるのを防ぐ。
fn normalize(path: &Path) -> PathBuf {
    let mut out = PathBuf::new();
    for component in path.components() {
        match component {
            Component::ParentDir => {
                out.pop();
            }
            Component::CurDir => {}
            other => out.push(other),
        }
    }
    out
}

fn copy_recursive(src: &Path, dst: &Path) -> io::Result<()> {
    let meta = fs::symlink_metadata(src)?;
    if meta.file_type().is_symlink() {
        symlink(&fs::read_link(src)?, dst)
    } else if meta.is_dir() {
        fs::create_dir(dst)?;
        for entry in fs::read_dir(src)? {
            let entry = entry?;
            copy_recursive(&entry.path(), &dst.join(entry.file_name()))?;
        }
        Ok(())
    } else {
        fs::copy(src, dst).map(|_| ())
    }
}

#[cfg(all(test, unix))]
mod tests {
    use super::*;

    fn write(path: &Path, content: &str) {
        fs::create_dir_all(path.parent().unwrap()).unwrap();
        fs::write(path, content).unwrap();
    }

    #[test]
    fn validate_name_accepts_only_a_single_normal_component() {
        for ok in ["a", "SKILL.md", ".system", "名前"] {
            assert!(validate_name(ok).is_ok(), "{ok}");
        }
        for bad in ["", ".", "..", "../x", "a/b", "/abs", "a/"] {
            assert!(
                matches!(validate_name(bad), Err(SymlinkError::InvalidName(_))),
                "{bad:?}"
            );
        }
    }

    #[test]
    fn normalize_folds_parent_and_current_dir_lexically() {
        assert_eq!(normalize(Path::new("/a/b/../c")), Path::new("/a/c"));
        assert_eq!(normalize(Path::new("/a/./b/../../c")), Path::new("/c"));
        assert_eq!(normalize(Path::new("/a/b")), Path::new("/a/b"));
        assert_eq!(normalize(Path::new("/../a")), Path::new("/a"));
    }

    #[test]
    fn is_symlink_does_not_follow_links() {
        let tmp = tempfile::tempdir().unwrap();
        let real = tmp.path().join("real");
        let link = tmp.path().join("link");
        let dangling = tmp.path().join("dangling");
        fs::create_dir(&real).unwrap();
        symlink(&real, &link).unwrap();
        symlink(&tmp.path().join("nowhere"), &dangling).unwrap();

        assert!(!is_symlink(&real));
        assert!(is_symlink(&link));
        assert!(is_symlink(&dangling));
        assert!(!is_symlink(&tmp.path().join("missing")));
    }

    #[test]
    fn move_entry_moves_files_and_directories_with_content() {
        let tmp = tempfile::tempdir().unwrap();
        write(&tmp.path().join("src/f.json"), "{\"k\":1}\n");
        write(&tmp.path().join("src/d/nested/x.md"), "body");

        move_entry(
            &tmp.path().join("src/f.json"),
            &tmp.path().join("dst_f.json"),
        )
        .unwrap();
        move_entry(&tmp.path().join("src/d"), &tmp.path().join("dst_d")).unwrap();

        assert_eq!(
            fs::read_to_string(tmp.path().join("dst_f.json")).unwrap(),
            "{\"k\":1}\n"
        );
        assert_eq!(
            fs::read_to_string(tmp.path().join("dst_d/nested/x.md")).unwrap(),
            "body"
        );
        assert!(fs::symlink_metadata(tmp.path().join("src/f.json")).is_err());
        assert!(fs::symlink_metadata(tmp.path().join("src/d")).is_err());
    }

    #[test]
    fn move_entry_refuses_to_overwrite_destination() {
        let tmp = tempfile::tempdir().unwrap();
        write(&tmp.path().join("src"), "new");
        write(&tmp.path().join("dst"), "old");

        assert!(matches!(
            move_entry(&tmp.path().join("src"), &tmp.path().join("dst")),
            Err(SymlinkError::AlreadyExists(_))
        ));
        assert_eq!(fs::read_to_string(tmp.path().join("src")).unwrap(), "new");
        assert_eq!(fs::read_to_string(tmp.path().join("dst")).unwrap(), "old");
    }

    #[test]
    fn move_entry_rewrites_symlinks_as_absolute_targets() {
        let tmp = tempfile::tempdir().unwrap();
        let base = fs::canonicalize(tmp.path()).unwrap();
        write(&base.join("shared/real.md"), "r");
        fs::create_dir_all(base.join("a/b")).unwrap();
        symlink(Path::new("../../shared/real.md"), &base.join("a/b/rel")).unwrap();
        symlink(&base.join("shared/real.md"), &base.join("a/b/abs")).unwrap();

        move_entry(&base.join("a/b/rel"), &base.join("moved_rel")).unwrap();
        move_entry(&base.join("a/b/abs"), &base.join("moved_abs")).unwrap();

        assert_eq!(
            fs::read_link(base.join("moved_rel")).unwrap(),
            base.join("shared/real.md")
        );
        assert_eq!(
            fs::read_link(base.join("moved_abs")).unwrap(),
            base.join("shared/real.md")
        );
        assert_eq!(fs::read_to_string(base.join("moved_rel")).unwrap(), "r");
        assert!(fs::symlink_metadata(base.join("a/b/rel")).is_err());
        assert!(base.join("shared/real.md").is_file());
    }

    #[test]
    fn copy_recursive_copies_tree_and_preserves_symlinks() {
        let tmp = tempfile::tempdir().unwrap();
        write(&tmp.path().join("src/a.txt"), "a");
        write(&tmp.path().join("src/sub/b.txt"), "b");
        symlink(Path::new("a.txt"), &tmp.path().join("src/link")).unwrap();

        copy_recursive(&tmp.path().join("src"), &tmp.path().join("dst")).unwrap();

        assert_eq!(
            fs::read_to_string(tmp.path().join("dst/a.txt")).unwrap(),
            "a"
        );
        assert_eq!(
            fs::read_to_string(tmp.path().join("dst/sub/b.txt")).unwrap(),
            "b"
        );
        assert_eq!(
            fs::read_link(tmp.path().join("dst/link")).unwrap(),
            Path::new("a.txt")
        );
        // コピー元は変更しない
        assert!(tmp.path().join("src/sub/b.txt").is_file());
    }

    #[test]
    fn remove_symlink_removes_link_but_not_target() {
        let tmp = tempfile::tempdir().unwrap();
        write(&tmp.path().join("dir/keep.md"), "k");
        symlink(&tmp.path().join("dir"), &tmp.path().join("link")).unwrap();

        remove_symlink(&tmp.path().join("link")).unwrap();

        assert!(fs::symlink_metadata(tmp.path().join("link")).is_err());
        assert!(tmp.path().join("dir/keep.md").is_file());
    }
}
