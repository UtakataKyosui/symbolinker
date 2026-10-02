import { createFileRoute } from "@tanstack/react-router";
import { Folder, RefreshCw, Workflow } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { PageHeading, Panel, Status } from "@/components/harness/primitives";
import { useAgent } from "@/lib/agent-context";
import { useOverview, useUnlinkKind } from "@/lib/use-overview";
import type { Kind } from "@/bindings";

export const Route = createFileRoute("/settings")({
  component: SettingsPage,
});

const KIND_LABELS: Record<Kind, string> = {
  skills: "Skills",
  agents: "Sub-Agents",
  hooks: "Hooks",
  rules: "Rules",
};

function SettingsPage() {
  const { agent } = useAgent();
  const { data: overview, isFetching, refetch } = useOverview();
  const unlinkKind = useUnlinkKind();

  const configDir = `~/.${agent}`;

  return (
    <>
      <PageHeading
        eyebrow="Workspace / Configuration"
        title="Settings"
        description="View agent configuration paths and manage symlink state."
      />
      <div className="settings-layout">
        <Panel title="Agent Configuration" icon={<Folder />}>
          <div className="detail-rows">
            <div>
              <span>Agent</span>
              <code>{agent}</code>
            </div>
            <div>
              <span>Config directory</span>
              <code>{configDir}</code>
            </div>
            <div>
              <span>Adopted</span>
              <Status tone={overview?.adopted ? "cyan" : "amber"}>
                {overview?.adopted ? "Yes" : "No"}
              </Status>
            </div>
            <div>
              <span>Active profile</span>
              <code>{overview?.active ?? "—"}</code>
            </div>
          </div>
          <Separator className="my-5" />
          <div className="section-label">Kind directories</div>
          {overview ? (
            <div className="detail-rows">
              {overview.links.map((ks) => (
                <div key={ks.kind}>
                  <span>{KIND_LABELS[ks.kind]}</span>
                  <div className="flex flex-col gap-1 items-end">
                    <code className="text-xs">{ks.dirPath}</code>
                    {ks.dirIsSymlink && <Status tone="amber">Dir is symlink — unmanaged</Status>}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="muted">Connect the Tauri backend to see paths.</p>
          )}
          <Separator className="my-5" />
          <Button variant="outline" onClick={() => void refetch()} disabled={isFetching}>
            <RefreshCw />
            Refresh
          </Button>
        </Panel>
        <div className="column-stack">
          <Panel title="Danger Zone" icon={<Workflow />}>
            <p className="panel-description muted">
              These operations remove symlinks placed by this app. The library and profile
              definitions are not modified.
            </p>
            {overview?.links.map((ks) => (
              <div key={ks.kind} className="setting-row">
                <div>
                  <strong>Unlink {KIND_LABELS[ks.kind]}</strong>
                  <p className="muted">
                    Remove {ks.linked.length} owned link{ks.linked.length !== 1 ? "s" : ""} from{" "}
                    <code>
                      {configDir}/{ks.kind}
                    </code>
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="xs"
                  disabled={ks.linked.length === 0 || unlinkKind.isPending}
                  onClick={() => void unlinkKind.mutateAsync(ks.kind)}
                >
                  Unlink
                </Button>
              </div>
            ))}
          </Panel>
          <Panel title="About" icon={<Workflow />}>
            <div className="about-mark">
              <Workflow />
            </div>
            <h3>SymlinkHarness</h3>
            <p className="muted leading-relaxed mt-3">
              Manages Coding Agent harness items (Skills, Hooks, Rules, Sub-Agents) via symbolic
              links. Powered by Tauri 2, React 19, and shadcn/ui.
            </p>
            <Separator className="my-5" />
            <Status>React 19</Status> <Status>shadcn/ui</Status> <Status>Tauri 2</Status>
          </Panel>
        </div>
      </div>
    </>
  );
}
