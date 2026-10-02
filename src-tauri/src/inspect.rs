//! ディスクの現況を読むだけの関数群。何も書き込まない。
use std::fs;
use std::io;
use std::path::Path;

use crate::agent::Kind;
use crate::error::SymlinkError;
use crate::fsops::is_symlink;
use crate::layout::{is_ignored, Layout};
use crate::model::{Items, KindStatus, Overview};
use crate::state_repo::load_state;

/// ディレクトリ直下の名前(ソート済み、無視対象は除く)。存在しなければ空。
pub fn list_entries(dir: &Path) -> Result<Vec<String>, SymlinkError> {
    let entries = match fs::read_dir(dir) {
        Ok(entries) => entries,
        Err(err) if err.kind() == io::ErrorKind::NotFound => return Ok(Vec::new()),
        Err(err) => return Err(err.into()),
    };
    let mut names = Vec::new();
    for entry in entries {
        let name = entry?.file_name().to_string_lossy().into_owned();
        if !is_ignored(&name) {
            names.push(name);
        }
    }
    names.sort();
    Ok(names)
}

pub fn library(layout: &Layout) -> Result<Items, SymlinkError> {
    let mut items = Items::default();
    for kind in Kind::ALL {
        *items.get_mut(kind) = list_entries(&layout.library_dir(kind))?;
    }
    Ok(items)
}

/// このアプリが `library` の同名項目へ向けて置いたリンクか。
pub fn is_owned(layout: &Layout, kind: Kind, name: &str) -> bool {
    let path = layout.agent_dir(kind).join(name);
    is_symlink(&path)
        && fs::read_link(&path).is_ok_and(|t| t == layout.library_dir(kind).join(name))
}

/// Agent 側に置かれた、取り込み対象(システム管理でも、このアプリのリンクでもない)の項目。
pub fn unmanaged_items(layout: &Layout) -> Result<Items, SymlinkError> {
    let mut items = Items::default();
    for kind in Kind::ALL {
        for name in list_entries(&layout.agent_dir(kind))? {
            if !layout.is_system(kind, &name) && !is_owned(layout, kind, &name) {
                items.get_mut(kind).push(name);
            }
        }
    }
    Ok(items)
}

pub fn kind_status(layout: &Layout, kind: Kind) -> Result<KindStatus, SymlinkError> {
    let dir = layout.agent_dir(kind);
    let mut status = KindStatus {
        kind,
        dir_path: dir.to_string_lossy().into_owned(),
        dir_is_symlink: is_symlink(&dir),
        linked: Vec::new(),
        system: Vec::new(),
        unmanaged: Vec::new(),
    };
    for name in list_entries(&dir)? {
        if layout.is_system(kind, &name) {
            status.system.push(name);
        } else if is_owned(layout, kind, &name) {
            status.linked.push(name);
        } else {
            status.unmanaged.push(name);
        }
    }
    Ok(status)
}

pub fn overview(layout: &Layout) -> Result<Overview, SymlinkError> {
    let state = load_state(layout)?;
    Ok(Overview {
        adopted: state.is_some(),
        active: state.as_ref().map(|s| s.active.clone()),
        profiles: state.map(|s| s.profiles).unwrap_or_default(),
        library: library(layout)?,
        links: Kind::ALL
            .into_iter()
            .map(|kind| kind_status(layout, kind))
            .collect::<Result<_, _>>()?,
    })
}

#[cfg(all(test, unix))]
mod tests {
    use super::*;
    use crate::agent::Agent;
    use crate::fsops::symlink;
    use crate::profile_ops::default_state;
    use crate::testutil::{fixture, put_library, put_state, write};

    /// `library` にある項目へ、このアプリのリンクを手で置く。
    fn own(layout: &Layout, kind: Kind, name: &str) {
        std::fs::create_dir_all(layout.agent_dir(kind)).unwrap();
        symlink(
            &layout.library_dir(kind).join(name),
            &layout.agent_dir(kind).join(name),
        )
        .unwrap();
    }

    #[test]
    fn list_entries_is_sorted_skips_ignored_and_tolerates_missing_dir() {
        let (tmp, _layout) = fixture(Agent::Claude);
        write(&tmp.path().join("d/b"));
        write(&tmp.path().join("d/a"));
        write(&tmp.path().join("d/.DS_Store"));
        write(&tmp.path().join("d/.system"));

        assert_eq!(
            list_entries(&tmp.path().join("d")).unwrap(),
            [".system", "a", "b"]
        );
        assert!(list_entries(&tmp.path().join("missing"))
            .unwrap()
            .is_empty());
    }

    #[test]
    fn library_lists_items_per_kind() {
        let (_tmp, layout) = fixture(Agent::Claude);
        put_library(&layout, Kind::Skills, "s2");
        put_library(&layout, Kind::Skills, "s1");
        put_library(&layout, Kind::Rules, "r");

        let items = library(&layout).unwrap();
        assert_eq!(items.skills, ["s1", "s2"]);
        assert_eq!(items.rules, ["r"]);
        assert!(items.agents.is_empty() && items.hooks.is_empty());
    }

    #[test]
    fn is_owned_requires_a_link_to_the_same_named_library_item() {
        let (tmp, layout) = fixture(Agent::Claude);
        put_library(&layout, Kind::Skills, "a");
        own(&layout, Kind::Skills, "a");
        let dir = layout.agent_dir(Kind::Skills);
        symlink(&tmp.path().join("elsewhere"), &dir.join("foreign")).unwrap();
        write(&dir.join("real/x"));

        assert!(is_owned(&layout, Kind::Skills, "a"));
        assert!(!is_owned(&layout, Kind::Skills, "foreign"));
        assert!(!is_owned(&layout, Kind::Skills, "real"));
        assert!(!is_owned(&layout, Kind::Skills, "missing"));
    }

    #[test]
    fn unmanaged_items_excludes_system_entries_and_owned_links() {
        let (tmp, layout) = fixture(Agent::Codex);
        put_library(&layout, Kind::Skills, "owned");
        own(&layout, Kind::Skills, "owned");
        let dir = layout.agent_dir(Kind::Skills);
        write(&dir.join(".system/x"));
        write(&dir.join("mine/x"));
        symlink(&tmp.path().join("elsewhere"), &dir.join("foreign")).unwrap();

        assert_eq!(
            unmanaged_items(&layout).unwrap().skills,
            ["foreign", "mine"]
        );
    }

    #[test]
    fn kind_status_classifies_each_entry() {
        let (tmp, layout) = fixture(Agent::Codex);
        put_library(&layout, Kind::Skills, "owned");
        own(&layout, Kind::Skills, "owned");
        let dir = layout.agent_dir(Kind::Skills);
        write(&dir.join(".system/x"));
        write(&dir.join("mine/x"));

        let status = kind_status(&layout, Kind::Skills).unwrap();
        assert_eq!(status.linked, ["owned"]);
        assert_eq!(status.system, [".system"]);
        assert_eq!(status.unmanaged, ["mine"]);
        assert!(!status.dir_is_symlink);
        assert_eq!(status.dir_path, dir.to_string_lossy());

        std::fs::remove_dir_all(&dir).unwrap();
        symlink(&tmp.path().join("dotfiles"), &dir).unwrap();
        assert!(kind_status(&layout, Kind::Skills).unwrap().dir_is_symlink);
    }

    #[test]
    fn overview_reports_not_adopted_without_a_state_file() {
        let (_tmp, layout) = fixture(Agent::Claude);
        let o = overview(&layout).unwrap();
        assert!(!o.adopted && o.active.is_none() && o.profiles.is_empty());
        assert_eq!(o.links.len(), 4);
    }

    #[test]
    fn overview_reports_sets_and_library_when_adopted() {
        let (_tmp, layout) = fixture(Agent::Claude);
        put_library(&layout, Kind::Agents, "x");
        let state = default_state(library(&layout).unwrap());
        put_state(&layout, &state);

        let o = overview(&layout).unwrap();
        assert!(o.adopted);
        assert_eq!(o.active.as_deref(), Some("default"));
        assert_eq!(o.profiles, state.profiles);
        assert_eq!(o.library.agents, ["x"]);
    }
}
