import { Status } from "@/components/harness/primitives";
import { useHarness } from "@/lib/harness-context";
import { profiles } from "@/lib/harness-data";

export function ProfileCards() {
  const { skills, activeProfile, chooseProfile } = useHarness();
  return (
    <div className="profile-cards">
      {profiles.map((p) => (
        <button
          key={p.name}
          className={`profile-card ${activeProfile.name === p.name ? "is-active" : ""}`}
          onClick={() => chooseProfile(p.name)}
        >
          <div className="flex items-center justify-between gap-2">
            <strong>{p.name}</strong>
            <Status tone={activeProfile.name === p.name ? "cyan" : "muted"}>
              {activeProfile.name === p.name ? "Active" : "Switch"}
            </Status>
          </div>
          <div className="tag-list">
            {p.tags.map((tag, i) => (
              <span key={tag} className={i === 2 ? "accent-tag" : ""}>
                {tag}
              </span>
            ))}
          </div>
          <div className="profile-meta">
            <span>
              Skills: <b>{skills.filter((skill) => skill.matrix[profiles.indexOf(p)]).length}</b>
            </span>
            <span>
              Hooks: <b>{p.hooks}</b>
            </span>
            <span>{p.note}</span>
          </div>
        </button>
      ))}
    </div>
  );
}
