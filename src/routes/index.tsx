import { createFileRoute } from "@tanstack/react-router";
import {
  Activity,
  Box,
  FolderInput,
  GitBranch,
  Layers,
  RefreshCw,
  SlidersHorizontal,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Metric, PageHeading, Panel, Status } from "@/components/harness/primitives";
import { ProfileCards } from "@/components/harness/profile-cards";
import { useHarness } from "@/lib/harness-context";
import type { Agent, KindStatus } from "@/bindings";

export const Route = createFileRoute("/")({
  component: DashboardPage,
});

const KIND_LABELS: Record<string, string> = {
  skills: "Skills",
  agents: "Sub-Agents",
  hooks: "Hooks",
  rules: "Rules",
};

const AGENT_CONFIG: Record<Agent, string> = {
  claude: "~/.claude",
  codex: "~/.codex",
};

function KindRow({ ks }: { ks: KindStatus }) {
  const label = KIND_LABELS[ks.kind] ?? ks.kind;
  return (
    <div className="target-row">
      <div className="target-symbol">
        <Layers />
      </div>
      <div className="target-content">
        <div>
          <strong>{label}</strong>
          <Status tone={ks.dirIsSymlink ? "amber" : "cyan"}>
            {ks.dirIsSymlink ? "Dir is symlink" : `${ks.linked.length} linked`}
          </Status>
          {ks.unmanaged.length > 0 && <Status tone="amber">{ks.unmanaged.length} unmanaged</Status>}
        </div>
        <code>{ks.dirPath}</code>
      </div>
    </div>
  );
}

function DashboardPage() {
  const { agent, overview, loading, refresh, setDialog } = useHarness();

  const totalLinked = overview?.links.reduce((sum, l) => sum + l.linked.length, 0) ?? 0;
  const totalLibrary = overview
    ? overview.library.skills.length +
      overview.library.agents.length +
      overview.library.hooks.length +
      overview.library.rules.length
    : 0;
  const totalUnmanaged = overview?.links.reduce((sum, l) => sum + l.unmanaged.length, 0) ?? 0;

  return (
    <>
      <PageHeading
        eyebrow="Overview"
        title="Dashboard"
        description={`Manage symlinks for the ${agent} agent harness.`}
        actions={
          <>
            <Button variant="outline" onClick={() => void refresh()} disabled={loading}>
              <RefreshCw />
              Refresh
            </Button>
            {overview && !overview.adopted && (
              <Button onClick={() => setDialog("adopt")}>
                <Box />
                Adopt Agent
              </Button>
            )}
            {overview?.adopted && totalUnmanaged > 0 && (
              <Button variant="outline" onClick={() => setDialog("import")}>
                <FolderInput />
                Import ({totalUnmanaged})
              </Button>
            )}
          </>
        }
      />
      <div className="metrics-grid">
        <Metric
          title="Library items"
          icon={<Box />}
          value={`${totalLibrary}`}
          badge="Managed"
          note="Skills · Agents · Hooks · Rules"
          trend="cyan"
        />
        <Metric
          title="Active symlinks"
          icon={<Zap />}
          value={`${totalLinked}`}
          badge="Linked"
          note="Placed by active profile"
          trend="blue"
        />
        <Metric
          title="Unmanaged items"
          icon={<FolderInput />}
          value={`${totalUnmanaged}`}
          badge={totalUnmanaged > 0 ? "Import needed" : "Clean"}
          note="Not yet in library"
          trend={totalUnmanaged > 0 ? "amber" : "cyan"}
        />
        <Metric
          title="Active profile"
          icon={<SlidersHorizontal />}
          value={overview?.active ?? "—"}
          badge={overview?.adopted ? "Live" : "Not adopted"}
          note={overview ? `${overview.profiles.length} profiles defined` : "No data"}
          trend="cyan"
          compact
        />
      </div>
      <div className="dashboard-columns">
        <div className="column-stack">
          <Panel
            title="Kind Status"
            icon={<Activity />}
            extra={<code className="micro muted">{AGENT_CONFIG[agent]}</code>}
          >
            <p className="panel-description">
              Symlink state per item kind in the agent config directory.
            </p>
            {overview ? (
              <div className="target-list">
                {overview.links.map((ks) => (
                  <KindRow key={ks.kind} ks={ks} />
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <Activity />
                <h3>{loading ? "Loading…" : "No data"}</h3>
                {!loading && <p>Start the Tauri backend to connect.</p>}
              </div>
            )}
          </Panel>
          <Panel title="Registry" icon={<GitBranch />}>
            {overview ? (
              <div className="topography">
                <div>
                  <Layers />
                  <strong>Library</strong>
                  <code>
                    {overview.library.skills.length}s · {overview.library.agents.length}a ·{" "}
                    {overview.library.hooks.length}h · {overview.library.rules.length}r
                  </code>
                </div>
              </div>
            ) : (
              <p className="muted">Not connected.</p>
            )}
          </Panel>
        </div>
        <div className="column-stack">
          <Panel title="Profile Switcher" icon={<SlidersHorizontal />}>
            <p className="panel-description">
              Switch the active profile to apply different item sets.
            </p>
            <ProfileCards />
            {overview?.adopted && (
              <Button
                variant="outline"
                size="xs"
                className="mt-3"
                onClick={() => setDialog("new-profile")}
              >
                New Profile
              </Button>
            )}
          </Panel>
        </div>
      </div>
    </>
  );
}
