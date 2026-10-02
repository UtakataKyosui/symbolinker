import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  Box,
  CheckCheck,
  Folder,
  GitBranch,
  Layers,
  Link,
  Link2Off,
  Plus,
  RefreshCw,
  ShieldCheck,
  SlidersHorizontal,
  Terminal,
  TriangleAlert,
  Workflow,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Metric, PageHeading, Panel, Picker, Status } from "@/components/harness/primitives";
import { ProfileCards } from "@/components/harness/profile-cards";
import { downloadJson } from "@/lib/download-json";
import { useHarness } from "@/lib/harness-context";
import { profiles } from "@/lib/harness-data";

export const Route = createFileRoute("/")({
  component: DashboardPage,
});

function DashboardPage() {
  const {
    skills,
    hooks,
    targets,
    audit,
    vault,
    strictMode,
    activeProfile,
    linked,
    broken,
    enabledHooks,
    chooseProfile,
    rescan,
    setDialog,
    setNotice,
    setQuery,
  } = useHarness();
  const navigate = useNavigate();
  return (
    <>
      <PageHeading
        eyebrow="Orchestration Daemon"
        title="Workspace Overview & Targets"
        description="Monitor active symlinks, target agent harnesses, and symlink health diagnostics."
        actions={
          <>
            <Button variant="outline" onClick={rescan}>
              <RefreshCw />
              Rescan Symlinks
            </Button>
            <Picker
              label="Active profile"
              value={activeProfile.name}
              options={profiles.map((p) => p.name)}
              onChange={chooseProfile}
            />
            <Button onClick={() => setDialog("apply")}>
              <CheckCheck />
              Apply All Changes
            </Button>
          </>
        }
      />
      <div className="metrics-grid">
        <Metric
          title="Active skills linked"
          icon={<Box />}
          value={`${linked}`}
          suffix={`/ ${skills.length}`}
          badge="Healthy"
          note="Source capabilities mounted"
          trend="cyan"
        />
        <Metric
          title="Lifecycle hooks"
          icon={<Zap />}
          value={`${enabledHooks}`}
          suffix={`/ ${hooks.length}`}
          badge="Intercepting"
          note="pre · post · file-change"
          trend="blue"
        />
        <Metric
          title="Broken / stale links"
          icon={<Link2Off />}
          value={`${broken}`}
          suffix="Broken"
          badge="Action Needed"
          note="python-type-checker → target missing"
          trend="amber"
        />
        <Metric
          title="Active profile matrix"
          icon={<SlidersHorizontal />}
          value={activeProfile.name}
          badge="Live Preview"
          note={activeProfile.tags.join(" · ")}
          trend="cyan"
          compact
        />
      </div>
      <div className="dashboard-columns">
        <div className="column-stack">
          <Panel
            title="Target Agent Harnesses & Junction Status"
            icon={<Link />}
            extra={
              <Button variant="outline" size="xs" onClick={() => setDialog("target")}>
                <Plus />
                Add Target
              </Button>
            }
          >
            <p className="panel-description">
              Configured endpoints listening to linked capability presets
            </p>
            <div className="target-list">
              {targets.map((target, i) => (
                <div
                  className={`target-row ${!target.healthy ? "target-warning" : ""}`}
                  key={target.path}
                >
                  <div className="target-symbol">
                    {i === 0 ? (
                      <Folder />
                    ) : i === 1 ? (
                      <Workflow />
                    ) : i === 3 ? (
                      <Terminal />
                    ) : (
                      <Box />
                    )}
                  </div>
                  <div className="target-content">
                    <div>
                      <strong>{target.name}</strong>
                      <Status tone={target.healthy ? "cyan" : "amber"}>
                        {target.healthy ? "Healthy" : "Path Shift"}
                      </Status>
                    </div>
                    <code>
                      {target.path}
                      <span> · {target.detail}</span>
                    </code>
                  </div>
                  <Button
                    variant="outline"
                    size="xs"
                    onClick={() => {
                      if (!target.healthy) {
                        setQuery("");
                        void navigate({
                          to: "/inspector",
                          search: { skill: "python-type-checker" },
                        });
                      } else setNotice(`Preview target: ${target.path}`);
                    }}
                  >
                    {target.healthy ? <ShieldCheck /> : <TriangleAlert />}
                    {target.healthy ? "Verify" : "Inspect"}
                  </Button>
                </div>
              ))}
            </div>
          </Panel>
          <Panel
            title="Symlink Operations Audit Trail"
            icon={<Activity />}
            extra={<span className="micro muted">Preview fs events</span>}
          >
            <div className="audit-list">
              {audit.map((line, i) => (
                <div className="audit-row" key={`${line}-${i}`}>
                  <span className="muted">
                    {["10:42:18", "10:30:05", "09:15:42", "08:50:11", "08:42:10", "08:30:21"][i]}
                  </span>
                  <span className={line.startsWith("CONFLICT") ? "text-amber" : "text-cyan"}>
                    {line.split("  ")[0]}
                  </span>
                  <span>{line.split("  ")[1]}</span>
                  <span className="muted">{i === 2 ? "RESOLVED" : "0.4ms"}</span>
                </div>
              ))}
            </div>
          </Panel>
          <Panel
            title="Registry Topography"
            icon={<GitBranch />}
            extra={<span className="micro muted">Zero-copy junctions</span>}
          >
            <div className="topography">
              <div>
                <Layers />
                <strong>Global Vault</strong>
                <code>{vault}</code>
              </div>
              <span className="topology-line">
                <code>atomic symlink</code>
                <ArrowRight />
              </span>
              <div>
                <Workflow />
                <strong>Active Targets</strong>
                <code>Cursor / Claude / Codex</code>
              </div>
            </div>
          </Panel>
        </div>
        <div className="column-stack">
          <Panel title="Quick Profile Switcher" icon={<SlidersHorizontal />}>
            <p className="panel-description">Instant rule & hook presets for targeted tasks</p>
            <ProfileCards />
          </Panel>
          <Panel title="System Diagnostics" icon={<Activity />} extra={<Status>Preview</Status>}>
            <div className="detail-rows diagnostic-rows">
              <div>
                <span>Watcher Engine</span>
                <span className="text-cyan">Demo mode</span>
              </div>
              <div>
                <span>Target Permissions</span>
                <span>Not connected</span>
              </div>
              <div>
                <span>Collision Prevention</span>
                <span className="text-blue">{strictMode ? "Strict Mode" : "Disabled"}</span>
              </div>
              <div>
                <span>UI State Storage</span>
                <span>Local browser</span>
              </div>
            </div>
            <Button
              variant="link"
              size="xs"
              className="export-link"
              onClick={() =>
                downloadJson("harness-diagnostics.json", {
                  mode: "preview",
                  skills,
                  hooks,
                  targets,
                  profile: activeProfile.name,
                })
              }
            >
              Export Diagnostic Bundle
              <ArrowUpRight />
            </Button>
          </Panel>
        </div>
      </div>
    </>
  );
}
