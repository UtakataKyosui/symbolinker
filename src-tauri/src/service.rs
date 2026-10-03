//! 個別の関数(読む / 純粋に変換する / 書く)を、決まった順序で組み合わせる層。
//! ここ以外のモジュールは、他の関心の状態を変更しない。
//!
//! 状態を変える操作は共通して「リンク先を検査 → 状態を保存 → リンクを書く」の順で行う。
//! 検査に失敗した場合、状態ファイルもリンクも変わらない。
use crate::agent::Kind;
use crate::error::SymlinkError;
use crate::import::{check_importable, move_to_library};
use crate::inspect::{library, unmanaged_items};
use crate::layout::Layout;
use crate::model::{Profile, State};
use crate::profile_ops;
use crate::reconcile::{check_link_targets, check_set_items, write_links};
use crate::state_repo::{load_state, require_state, save_state};

fn commit(layout: &Layout, state: &State) -> Result<(), SymlinkError> {
    let active = profile_ops::active_profile(state)?;
    check_link_targets(layout, active)?;
    save_state(layout, state)?;
    write_links(layout, active)
}

/// ユーザーが置いた項目をライブラリへ移し、`default` Profile を作って有効化する。
pub fn adopt(layout: &Layout) -> Result<(), SymlinkError> {
    if load_state(layout)?.is_some() {
        return Err(SymlinkError::AlreadyAdopted);
    }
    let unmanaged = unmanaged_items(layout)?;
    check_importable(layout, &unmanaged)?;
    move_to_library(layout, &unmanaged)?;
    commit(layout, &profile_ops::default_state(library(layout)?))
}

/// 取り込み後に置かれた項目をライブラリへ移し、有効な Profile にだけ追加する。
pub fn import_unmanaged(layout: &Layout) -> Result<(), SymlinkError> {
    let state = require_state(layout)?;
    let unmanaged = unmanaged_items(layout)?;
    check_importable(layout, &unmanaged)?;
    move_to_library(layout, &unmanaged)?;
    commit(layout, &profile_ops::enable_in_active(&state, &unmanaged)?)
}

pub fn save_profile(layout: &Layout, profile: Profile) -> Result<(), SymlinkError> {
    let state = require_state(layout)?;
    profile_ops::check_set_name(&profile.name)?;
    check_set_items(layout, &profile)?;

    let is_active = state.active == profile.name;
    let next = profile_ops::upsert_profile(&state, profile);
    if is_active {
        commit(layout, &next)
    } else {
        save_state(layout, &next)
    }
}

pub fn delete_profile(layout: &Layout, name: &str) -> Result<(), SymlinkError> {
    let state = require_state(layout)?;
    save_state(layout, &profile_ops::remove_profile(&state, name)?)
}

pub fn activate_profile(layout: &Layout, name: &str) -> Result<(), SymlinkError> {
    let state = require_state(layout)?;
    commit(layout, &profile_ops::activate(&state, name)?)
}

/// 有効な Profile に合わせて全 Kind のリンクを書き直す。状態は保存しない。
pub fn reconcile(layout: &Layout) -> Result<(), SymlinkError> {
    let state = require_state(layout)?;
    let active = profile_ops::active_profile(&state)?;
    check_link_targets(layout, active)?;
    write_links(layout, active)
}

pub fn unlink_kind(layout: &Layout, kind: Kind) -> Result<(), SymlinkError> {
    crate::reconcile::remove_owned_links(layout, kind)
}

#[cfg(all(test, unix))]
mod tests {
    use super::*;
    use crate::agent::Agent;
    use crate::fsops::{is_symlink, symlink};
    use crate::inspect::overview;
    use crate::testutil::{fixture, names, only, put_library, put_state, write, write_with};
    use std::fs;
    use std::path::Path;

    #[test]
    fn adopt_moves_user_items_into_a_default_set_and_links_them_back() {
        let (tmp, layout) = fixture(Agent::Claude);
        write(&tmp.path().join(".claude/skills/a/SKILL.md"));
        write(&tmp.path().join(".claude/skills/b/SKILL.md"));
        write(&tmp.path().join(".claude/rules/r.md"));

        adopt(&layout).unwrap();

        let o = overview(&layout).unwrap();
        assert_eq!(o.active.as_deref(), Some("default"));
        assert_eq!(o.library.skills, ["a", "b"]);
        assert_eq!(o.profiles[0].enabled, o.library);
        assert_eq!(o.links[0].linked, ["a", "b"]);
        assert!(o.links.iter().all(|l| l.unmanaged.is_empty()));
        assert!(tmp.path().join(".claude/skills/a/SKILL.md").is_file());
        assert!(tmp.path().join(".claude/rules/r.md").is_file());
        assert!(matches!(adopt(&layout), Err(SymlinkError::AlreadyAdopted)));
    }

    #[test]
    fn adopt_leaves_agent_managed_entries_untouched() {
        for (agent, system) in [(Agent::Codex, ".system"), (Agent::Claude, "synced")] {
            let (tmp, layout) = fixture(agent);
            let dir = tmp.path().join(format!(".{}/skills", agent.slug()));
            write(&dir.join(system).join("marker"));
            write(&dir.join("mine/SKILL.md"));

            adopt(&layout).unwrap();

            assert!(!is_symlink(&dir) && !is_symlink(&dir.join(system)));
            assert!(dir.join(system).join("marker").is_file());
            let o = overview(&layout).unwrap();
            assert_eq!(o.library.skills, ["mine"]);
            assert_eq!(o.links[0].system, [system]);
        }
    }

    #[test]
    fn adopt_refuses_a_symlinked_directory_and_changes_nothing() {
        let (tmp, layout) = fixture(Agent::Claude);
        fs::create_dir_all(tmp.path().join("dotfiles")).unwrap();
        write(&tmp.path().join(".claude/skills/a/SKILL.md"));
        symlink(
            &tmp.path().join("dotfiles"),
            &tmp.path().join(".claude/rules"),
        )
        .unwrap();

        assert!(matches!(adopt(&layout), Err(SymlinkError::ForeignLink(_))));
        assert!(tmp.path().join(".claude/skills/a/SKILL.md").is_file());
        assert!(load_state(&layout).unwrap().is_none());
    }

    #[test]
    fn adopt_keeps_relative_symlink_entries_working() {
        let (tmp, layout) = fixture(Agent::Claude);
        write(&tmp.path().join("shared/s/SKILL.md"));
        fs::create_dir_all(tmp.path().join(".claude/skills")).unwrap();
        symlink(
            Path::new("../../shared/s"),
            &tmp.path().join(".claude/skills/s"),
        )
        .unwrap();

        adopt(&layout).unwrap();
        assert!(tmp.path().join(".claude/skills/s/SKILL.md").is_file());
    }

    #[test]
    fn adopt_preserves_file_bytes() {
        let (tmp, layout) = fixture(Agent::Codex);
        let policy = "{\"allow\": [\"a\"]}\n";
        write_with(
            &tmp.path().join(".codex/hooks/outbound_policy.json"),
            policy,
        );

        adopt(&layout).unwrap();

        let via_link = tmp.path().join(".codex/hooks/outbound_policy.json");
        assert_eq!(fs::read_to_string(via_link).unwrap(), policy);
    }

    #[test]
    fn adopt_can_resume_after_a_partial_move() {
        let (tmp, layout) = fixture(Agent::Claude);
        write(&tmp.path().join(".claude/skills/b/SKILL.md"));
        // a は library へ移った後で中断した状態
        put_library(&layout, Kind::Skills, "a");

        adopt(&layout).unwrap();

        assert_eq!(overview(&layout).unwrap().library.skills, ["a", "b"]);
        assert_eq!(names(tmp.path().join(".claude/skills")), ["a", "b"]);
    }

    #[test]
    fn switching_sets_touches_only_owned_links_and_keeps_data() {
        let (tmp, layout) = fixture(Agent::Claude);
        write(&tmp.path().join(".claude/skills/a/SKILL.md"));
        write(&tmp.path().join(".claude/skills/b/SKILL.md"));
        adopt(&layout).unwrap();
        write(&tmp.path().join(".claude/skills/later/SKILL.md"));

        save_profile(
            &layout,
            Profile {
                name: "minimal".into(),
                enabled: only(Kind::Skills, &["a"]),
            },
        )
        .unwrap();
        activate_profile(&layout, "minimal").unwrap();

        assert_eq!(names(tmp.path().join(".claude/skills")), ["a", "later"]);
        assert!(layout
            .library_dir(Kind::Skills)
            .join("b/SKILL.md")
            .is_file());
        assert!(matches!(
            delete_profile(&layout, "minimal"),
            Err(SymlinkError::ProfileIsActive(_))
        ));
        activate_profile(&layout, "default").unwrap();
        assert_eq!(
            names(tmp.path().join(".claude/skills")),
            ["a", "b", "later"]
        );
        delete_profile(&layout, "minimal").unwrap();
    }

    #[test]
    fn editing_the_active_set_reapplies_links_immediately() {
        let (tmp, layout) = fixture(Agent::Claude);
        write(&tmp.path().join(".claude/agents/x.md"));
        adopt(&layout).unwrap();

        save_profile(
            &layout,
            Profile {
                name: "default".into(),
                enabled: Default::default(),
            },
        )
        .unwrap();

        assert!(names(tmp.path().join(".claude/agents")).is_empty());
        assert!(layout.library_dir(Kind::Agents).join("x.md").is_file());
    }

    #[test]
    fn saving_an_inactive_set_does_not_touch_the_links() {
        let (tmp, layout) = fixture(Agent::Claude);
        write(&tmp.path().join(".claude/skills/a/SKILL.md"));
        adopt(&layout).unwrap();

        save_profile(
            &layout,
            Profile {
                name: "other".into(),
                enabled: Default::default(),
            },
        )
        .unwrap();

        assert_eq!(names(tmp.path().join(".claude/skills")), ["a"]);
        assert_eq!(
            overview(&layout).unwrap().active.as_deref(),
            Some("default")
        );
    }

    #[test]
    fn a_rejected_link_check_leaves_the_saved_state_unchanged() {
        let (tmp, layout) = fixture(Agent::Claude);
        write(&tmp.path().join(".claude/skills/a/SKILL.md"));
        adopt(&layout).unwrap();
        save_profile(
            &layout,
            Profile {
                name: "empty".into(),
                enabled: Default::default(),
            },
        )
        .unwrap();
        activate_profile(&layout, "empty").unwrap();
        // a と同名のユーザー項目が後から置かれた
        write(&tmp.path().join(".claude/skills/a/own.md"));
        let before = load_state(&layout).unwrap();

        assert!(matches!(
            activate_profile(&layout, "default"),
            Err(SymlinkError::AlreadyExists(_))
        ));
        let enable_a = Profile {
            name: "empty".into(),
            enabled: only(Kind::Skills, &["a"]),
        };
        assert!(matches!(
            save_profile(&layout, enable_a),
            Err(SymlinkError::AlreadyExists(_))
        ));

        assert_eq!(load_state(&layout).unwrap(), before);
        assert!(tmp.path().join(".claude/skills/a/own.md").is_file());
    }

    #[test]
    fn a_rejected_set_is_not_persisted() {
        let (_tmp, layout) = fixture(Agent::Claude);
        adopt(&layout).unwrap();
        let before = load_state(&layout).unwrap();

        let unknown = Profile {
            name: "s".into(),
            enabled: only(Kind::Skills, &["missing"]),
        };
        assert!(matches!(
            save_profile(&layout, unknown),
            Err(SymlinkError::ItemNotFound(_))
        ));
        let escape = Profile {
            name: "s".into(),
            enabled: only(Kind::Rules, &["../x"]),
        };
        assert!(matches!(
            save_profile(&layout, escape),
            Err(SymlinkError::InvalidName(_))
        ));
        let blank = Profile {
            name: "  ".into(),
            enabled: Default::default(),
        };
        assert!(matches!(
            save_profile(&layout, blank),
            Err(SymlinkError::InvalidName(_))
        ));

        assert_eq!(load_state(&layout).unwrap(), before);
    }

    #[test]
    fn operations_before_adopt_report_not_adopted() {
        let (_tmp, layout) = fixture(Agent::Claude);
        let profile = Profile {
            name: "s".into(),
            enabled: Default::default(),
        };
        assert!(matches!(
            save_profile(&layout, profile),
            Err(SymlinkError::NotAdopted)
        ));
        assert!(matches!(
            delete_profile(&layout, "s"),
            Err(SymlinkError::NotAdopted)
        ));
        assert!(matches!(
            activate_profile(&layout, "s"),
            Err(SymlinkError::NotAdopted)
        ));
        assert!(matches!(
            import_unmanaged(&layout),
            Err(SymlinkError::NotAdopted)
        ));
    }

    #[test]
    fn unknown_set_names_are_rejected() {
        let (_tmp, layout) = fixture(Agent::Claude);
        adopt(&layout).unwrap();
        assert!(matches!(
            activate_profile(&layout, "nope"),
            Err(SymlinkError::ProfileNotFound(_))
        ));
        assert!(matches!(
            delete_profile(&layout, "nope"),
            Err(SymlinkError::ProfileNotFound(_))
        ));
    }

    #[test]
    fn import_unmanaged_adds_new_items_to_the_active_set_only() {
        let (tmp, layout) = fixture(Agent::Claude);
        write(&tmp.path().join(".claude/skills/a/SKILL.md"));
        adopt(&layout).unwrap();
        save_profile(
            &layout,
            Profile {
                name: "other".into(),
                enabled: Default::default(),
            },
        )
        .unwrap();
        write(&tmp.path().join(".claude/skills/later/SKILL.md"));
        write(&tmp.path().join(".claude/skills/synced/s.md"));

        import_unmanaged(&layout).unwrap();

        let o = overview(&layout).unwrap();
        assert_eq!(o.library.skills, ["a", "later"]);
        let enabled = |n: &str| {
            o.profiles
                .iter()
                .find(|s| s.name == n)
                .unwrap()
                .enabled
                .skills
                .clone()
        };
        assert_eq!(enabled("default"), ["a", "later"]);
        assert!(enabled("other").is_empty());
        assert!(o.links.iter().all(|l| l.unmanaged.is_empty()));
        assert!(tmp.path().join(".claude/skills/synced/s.md").is_file());
    }

    #[test]
    fn import_unmanaged_refuses_a_name_collision_and_moves_nothing() {
        let (tmp, layout) = fixture(Agent::Claude);
        put_library(&layout, Kind::Skills, "a");
        put_state(
            &layout,
            &profile_ops::default_state(library(&layout).unwrap()),
        );
        write(&tmp.path().join(".claude/skills/a/other.md"));
        write(&tmp.path().join(".claude/skills/b/SKILL.md"));

        assert!(matches!(
            import_unmanaged(&layout),
            Err(SymlinkError::AlreadyExists(_))
        ));
        assert!(tmp.path().join(".claude/skills/b/SKILL.md").is_file());
        assert!(tmp.path().join(".claude/skills/a/other.md").is_file());
    }

    #[test]
    fn unlink_kind_delegates_to_removing_owned_links() {
        let (tmp, layout) = fixture(Agent::Claude);
        write(&tmp.path().join(".claude/rules/r.md"));
        adopt(&layout).unwrap();
        write(&tmp.path().join(".claude/rules/mine.md"));

        unlink_kind(&layout, Kind::Rules).unwrap();

        assert_eq!(names(tmp.path().join(".claude/rules")), ["mine.md"]);
    }
}
