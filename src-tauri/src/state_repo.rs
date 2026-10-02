//! `state.json` の読み書きだけを担う。リンクやライブラリには触れない。
use std::fs;
use std::io;

use crate::error::SymlinkError;
use crate::layout::Layout;
use crate::model::State;

pub fn load_state(layout: &Layout) -> Result<Option<State>, SymlinkError> {
    match fs::read(layout.state_path()) {
        Ok(bytes) => Ok(Some(serde_json::from_slice(&bytes)?)),
        Err(err) if err.kind() == io::ErrorKind::NotFound => Ok(None),
        Err(err) => Err(err.into()),
    }
}

pub fn require_state(layout: &Layout) -> Result<State, SymlinkError> {
    load_state(layout)?.ok_or(SymlinkError::NotAdopted)
}

pub fn save_state(layout: &Layout, state: &State) -> Result<(), SymlinkError> {
    fs::create_dir_all(layout.root())?;
    let tmp = layout.root().join("state.json.tmp");
    fs::write(&tmp, serde_json::to_vec_pretty(state)?)?;
    Ok(fs::rename(tmp, layout.state_path())?)
}

#[cfg(all(test, unix))]
mod tests {
    use super::*;
    use crate::agent::Agent;
    use crate::profile_ops::default_state;
    use crate::testutil::{fixture, names, put_state, write_with};

    #[test]
    fn load_returns_none_when_no_state_file_exists() {
        let (_tmp, layout) = fixture(Agent::Claude);
        assert!(load_state(&layout).unwrap().is_none());
    }

    #[test]
    fn load_reads_a_state_file_written_by_hand() {
        let (_tmp, layout) = fixture(Agent::Claude);
        let state = default_state(Default::default());
        put_state(&layout, &state);
        assert_eq!(load_state(&layout).unwrap(), Some(state));
    }

    #[test]
    fn load_reports_corrupt_json_as_an_error() {
        let (_tmp, layout) = fixture(Agent::Claude);
        write_with(&layout.state_path(), "{not json");
        assert!(matches!(load_state(&layout), Err(SymlinkError::Json(_))));
    }

    #[test]
    fn require_reports_not_adopted_when_missing() {
        let (_tmp, layout) = fixture(Agent::Claude);
        assert!(matches!(
            require_state(&layout),
            Err(SymlinkError::NotAdopted)
        ));
    }

    #[test]
    fn save_creates_the_root_and_leaves_no_temporary_file() {
        let (_tmp, layout) = fixture(Agent::Claude);
        let state = default_state(Default::default());
        save_state(&layout, &state).unwrap();

        assert_eq!(names(layout.root().to_path_buf()), ["state.json"]);
        let raw = std::fs::read(layout.state_path()).unwrap();
        assert_eq!(serde_json::from_slice::<State>(&raw).unwrap(), state);
    }

    #[test]
    fn save_replaces_an_existing_state() {
        let (_tmp, layout) = fixture(Agent::Claude);
        put_state(&layout, &default_state(Default::default()));
        let next = State {
            active: "other".into(),
            profiles: vec![],
        };
        save_state(&layout, &next).unwrap();
        assert_eq!(load_state(&layout).unwrap(), Some(next));
    }
}
