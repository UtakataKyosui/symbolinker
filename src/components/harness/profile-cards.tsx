import { enabledCount } from "@/lib/agent-profiles";
import { Status } from "@/components/harness/primitives";
import { useOverview, useActivateProfile } from "@/lib/use-overview";

export function ProfileCards() {
  const { data: overview } = useOverview();
  const activateProfile = useActivateProfile();
  const profiles = overview?.profiles ?? [];
  const active = overview?.active ?? null;

  if (profiles.length === 0) {
    return <p className="muted">No profiles defined.</p>;
  }

  return (
    <div className="profile-cards">
      {profiles.map((p) => (
        <button
          key={p.name}
          className={`profile-card ${active === p.name ? "is-active" : ""}`}
          onClick={() => void activateProfile.mutateAsync(p.name)}
        >
          <div className="flex items-center justify-between gap-2">
            <strong>{p.name}</strong>
            <Status tone={active === p.name ? "cyan" : "muted"}>
              {active === p.name ? "Active" : "Switch"}
            </Status>
          </div>
          <div className="profile-meta">
            <span>
              Skills: <b>{p.enabled.skills.length}</b>
            </span>
            <span>
              Hooks: <b>{p.enabled.hooks.length}</b>
            </span>
            <span>
              Rules: <b>{p.enabled.rules.length}</b>
            </span>
          </div>
          <div className="profile-meta">
            <span>
              Total: <b>{enabledCount(p)}</b> items enabled
            </span>
          </div>
        </button>
      ))}
    </div>
  );
}
