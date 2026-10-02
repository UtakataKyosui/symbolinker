//! Profile(状態)に対する純粋な変換。I/O をせず、入力を変更せず、新しい `State` を返す。
use crate::agent::Kind;
use crate::error::SymlinkError;
use crate::model::{Profile, Items, State};

pub const DEFAULT_PROFILE: &str = "default";

pub fn default_state(library: Items) -> State {
    State {
        active: DEFAULT_PROFILE.to_owned(),
        profiles: vec![Profile {
            name: DEFAULT_PROFILE.to_owned(),
            enabled: library,
        }],
    }
}

pub fn active_profile(state: &State) -> Result<&Profile, SymlinkError> {
    state
        .profiles
        .iter()
        .find(|profile| profile.name == state.active)
        .ok_or_else(|| SymlinkError::ProfileNotFound(state.active.clone()))
}

pub fn check_set_name(name: &str) -> Result<(), SymlinkError> {
    if name.trim().is_empty() {
        return Err(SymlinkError::InvalidName(name.to_owned()));
    }
    Ok(())
}

pub fn upsert_profile(state: &State, profile: Profile) -> State {
    let mut next = state.clone();
    match next.profiles.iter_mut().find(|s| s.name == profile.name) {
        Some(existing) => *existing = profile,
        None => next.profiles.push(profile),
    }
    next
}

pub fn remove_profile(state: &State, name: &str) -> Result<State, SymlinkError> {
    if state.active == name {
        return Err(SymlinkError::ProfileIsActive(name.to_owned()));
    }
    let mut next = state.clone();
    next.profiles.retain(|profile| profile.name != name);
    if next.profiles.len() == state.profiles.len() {
        return Err(SymlinkError::ProfileNotFound(name.to_owned()));
    }
    Ok(next)
}

pub fn activate(state: &State, name: &str) -> Result<State, SymlinkError> {
    if !state.profiles.iter().any(|profile| profile.name == name) {
        return Err(SymlinkError::ProfileNotFound(name.to_owned()));
    }
    Ok(State {
        active: name.to_owned(),
        profiles: state.profiles.clone(),
    })
}

/// 有効な Profile にだけ `items` を追加する(重複なし、名前順)。他の Profile は変えない。
pub fn enable_in_active(state: &State, items: &Items) -> Result<State, SymlinkError> {
    active_profile(state)?;
    let mut next = state.clone();
    let active = next
        .profiles
        .iter_mut()
        .find(|profile| profile.name == state.active)
        .expect("active profile was checked above");
    for kind in Kind::ALL {
        let enabled = active.enabled.get_mut(kind);
        for name in items.get(kind) {
            if !enabled.contains(name) {
                enabled.push(name.clone());
            }
        }
        enabled.sort();
    }
    Ok(next)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn profile(name: &str, skills: &[&str]) -> Profile {
        Profile {
            name: name.to_owned(),
            enabled: Items {
                skills: skills.iter().map(|s| s.to_string()).collect(),
                ..Default::default()
            },
        }
    }

    fn state() -> State {
        State {
            active: "a".into(),
            profiles: vec![profile("a", &["x"]), profile("b", &[])],
        }
    }

    #[test]
    fn default_state_enables_everything_in_the_library_under_default() {
        let library = Items {
            rules: vec!["r".into()],
            ..Default::default()
        };
        let s = default_state(library.clone());
        assert_eq!(s.active, DEFAULT_PROFILE);
        assert_eq!(
            s.profiles,
            [Profile {
                name: DEFAULT_PROFILE.into(),
                enabled: library
            }]
        );
    }

    #[test]
    fn active_set_finds_the_active_one_or_reports_not_found() {
        assert_eq!(active_profile(&state()).unwrap().name, "a");
        let broken = State {
            active: "zzz".into(),
            ..state()
        };
        assert!(matches!(
            active_profile(&broken),
            Err(SymlinkError::ProfileNotFound(_))
        ));
    }

    #[test]
    fn check_set_name_rejects_blank_names() {
        assert!(check_set_name("ok").is_ok());
        for blank in ["", "  ", "\t"] {
            assert!(matches!(
                check_set_name(blank),
                Err(SymlinkError::InvalidName(_))
            ));
        }
    }

    #[test]
    fn upsert_set_inserts_or_replaces_without_mutating_input() {
        let before = state();
        let inserted = upsert_profile(&before, profile("c", &["n"]));
        assert_eq!(inserted.profiles.len(), 3);
        let replaced = upsert_profile(&before, profile("a", &["y", "z"]));
        assert_eq!(replaced.profiles.len(), 2);
        assert_eq!(replaced.profiles[0].enabled.skills, ["y", "z"]);
        assert_eq!(before, state());
    }

    #[test]
    fn remove_set_rejects_active_and_unknown() {
        let before = state();
        assert!(matches!(
            remove_profile(&before, "a"),
            Err(SymlinkError::ProfileIsActive(_))
        ));
        assert!(matches!(
            remove_profile(&before, "q"),
            Err(SymlinkError::ProfileNotFound(_))
        ));
        let after = remove_profile(&before, "b").unwrap();
        assert_eq!(after.profiles.len(), 1);
        assert_eq!(before, state());
    }

    #[test]
    fn activate_switches_only_the_active_name() {
        let before = state();
        let after = activate(&before, "b").unwrap();
        assert_eq!(after.active, "b");
        assert_eq!(after.profiles, before.profiles);
        assert!(matches!(
            activate(&before, "q"),
            Err(SymlinkError::ProfileNotFound(_))
        ));
        assert_eq!(before, state());
    }

    #[test]
    fn enable_in_active_adds_sorted_unique_items_to_the_active_set_only() {
        let before = state();
        let items = Items {
            skills: vec!["x".into(), "m".into()],
            rules: vec!["r".into()],
            ..Default::default()
        };

        let after = enable_in_active(&before, &items).unwrap();

        assert_eq!(after.profiles[0].enabled.skills, ["m", "x"]);
        assert_eq!(after.profiles[0].enabled.rules, ["r"]);
        assert_eq!(after.profiles[1], before.profiles[1]);
        assert_eq!(before, state());
    }

    #[test]
    fn enable_in_active_requires_a_valid_active_profile() {
        let broken = State {
            active: "zzz".into(),
            ..state()
        };
        assert!(matches!(
            enable_in_active(&broken, &Items::default()),
            Err(SymlinkError::ProfileNotFound(_))
        ));
    }
}
