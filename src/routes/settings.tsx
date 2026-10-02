import { createFileRoute } from "@tanstack/react-router";
import { Check, Folder, Workflow } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { PageHeading, Panel, Status } from "@/components/harness/primitives";
import { useHarness } from "@/lib/harness-context";

export const Route = createFileRoute("/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const {
    root,
    setRoot,
    vault,
    setVault,
    autoSync,
    setAutoSync,
    strictMode,
    setStrictMode,
    setNotice,
  } = useHarness();
  return (
    <>
      <PageHeading
        eyebrow="Workspace / Configuration"
        title="Workspace Settings"
        description="Configure your local workspace, target directories, and interface preferences."
      />
      <div className="settings-layout">
        <Panel title="Workspace Configuration" icon={<Folder />}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setNotice("Workspace preferences saved in this browser.");
            }}
          >
            <label className="form-field">
              Workspace root
              <Input required value={root} onChange={(e) => setRoot(e.target.value)} />
              <span>Root directory used in the workspace status bar.</span>
            </label>
            <label className="form-field">
              Global skill vault
              <Input required value={vault} onChange={(e) => setVault(e.target.value)} />
              <span>Source directory for shared capability definitions.</span>
            </label>
            <Separator className="my-6" />
            <div className="setting-row">
              <div>
                <strong>Auto-sync on save</strong>
                <p>Preference for synchronizing definitions after edits.</p>
              </div>
              <Switch
                aria-label="Auto-sync on save"
                checked={autoSync}
                onCheckedChange={setAutoSync}
              />
            </div>
            <div className="setting-row">
              <div>
                <strong>Strict collision prevention</strong>
                <p>Require resolution of overlapping target definitions.</p>
              </div>
              <Switch
                aria-label="Strict collision prevention"
                checked={strictMode}
                onCheckedChange={setStrictMode}
              />
            </div>
            <Button type="submit">
              <Check />
              Save Preferences
            </Button>
          </form>
        </Panel>
        <Panel title="About this workspace" icon={<Workflow />}>
          <div className="about-mark">
            <Workflow />
          </div>
          <h3>AI Harness Switcher</h3>
          <p className="muted leading-relaxed mt-3">
            A local UI preview based on the Stitch SymlinkHarness designs. Skill toggles, profile
            selection, and preferences are stored in your browser. Filesystem operations and runtime
            execution require a backend connection.
          </p>
          <Separator className="my-5" />
          <Status>React 19</Status> <Status>shadcn/ui</Status> <Status>Tauri 2</Status>
        </Panel>
      </div>
    </>
  );
}
