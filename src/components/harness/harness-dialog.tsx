import { useState } from "react";
import { Download, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Picker } from "@/components/harness/primitives";
import { downloadJson } from "@/lib/download-json";
import { useHarness } from "@/lib/harness-context";

export function HarnessDialog() {
  const { dialog, setDialog } = useHarness();
  return (
    <Dialog
      open={dialog !== null}
      onOpenChange={(open) => {
        if (!open) setDialog(null);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {dialog === "apply"
              ? "Review Harness Configuration"
              : dialog === "target"
                ? "Add Agent Target"
                : "New Lifecycle Hook"}
          </DialogTitle>
          <DialogDescription>
            {dialog === "apply"
              ? "Export this preview configuration for your harness. Filesystem changes are not executed by this UI."
              : "Add a configuration entry to the local UI preview."}
          </DialogDescription>
        </DialogHeader>
        {dialog === "apply" ? <ApplyReview /> : <DraftForm key={dialog} kind={dialog} />}
      </DialogContent>
    </Dialog>
  );
}

function ApplyReview() {
  const { skills, hooks, targets, activeProfile, enabledHooks, root, vault, setDialog, setNotice } =
    useHarness();
  return (
    <>
      <div className="detail-rows">
        <div>
          <span>Selected profile</span>
          <strong>{activeProfile.name}</strong>
        </div>
        <div>
          <span>Enabled skills</span>
          <strong>{skills.filter((s) => s.enabled).length}</strong>
        </div>
        <div>
          <span>Enabled hooks</span>
          <strong>{enabledHooks}</strong>
        </div>
        <div>
          <span>Unresolved definitions</span>
          <span className="text-amber">
            {skills.filter((s) => s.status === "Broken" || s.status === "Collision").length}
          </span>
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={() => setDialog(null)}>
          Cancel
        </Button>
        <Button
          onClick={() => {
            downloadJson("harness-config.json", {
              mode: "preview",
              profile: activeProfile.name,
              skills,
              hooks,
              targets,
              workspace: root,
              vault,
            });
            setDialog(null);
            setNotice("Harness configuration exported.");
          }}
        >
          <Download />
          Export Configuration
        </Button>
      </DialogFooter>
    </>
  );
}

function DraftForm({ kind }: { kind: "target" | "hook" | null }) {
  const { hooks, setHooks, targets, setTargets, setDialog, setNotice } = useHarness();
  const [draftName, setDraftName] = useState("");
  const [draftPath, setDraftPath] = useState("");
  const [draftEvent, setDraftEvent] = useState("on-file-write");

  function saveDraft() {
    if (!draftName.trim() || (kind === "target" && !draftPath.trim())) return;
    if (kind === "target") {
      if (targets.some((t) => t.path === draftPath.trim())) {
        setNotice("This target directory is already configured.");
        return;
      }
      setTargets((previous) => [
        ...previous,
        {
          name: draftName.trim(),
          path: draftPath.trim(),
          detail: "Ready to configure",
          healthy: true,
        },
      ]);
    }
    if (kind === "hook") {
      if (hooks.some((h) => h.id === draftName.trim())) {
        setNotice("This hook identifier already exists.");
        return;
      }
      setHooks((previous) => [
        ...previous,
        {
          id: draftName.trim(),
          event: draftEvent,
          description: "Custom lifecycle rule. Configure the executable in your harness.",
          group:
            draftEvent === "on-file-write"
              ? "file"
              : draftEvent === "on-tool-failure"
                ? "error"
                : "tool",
          runtime: "Local Shell",
          timeout: "1000ms",
          order: "P10",
          enabled: false,
        },
      ]);
    }
    setNotice(`${kind === "target" ? "Target" : "Hook"} added to preview.`);
    setDialog(null);
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        saveDraft();
      }}
    >
      <label className="form-field">
        {kind === "target" ? "Target name" : "Hook identifier"}
        <Input
          autoFocus
          required
          value={draftName}
          onChange={(e) => setDraftName(e.target.value)}
          placeholder={kind === "target" ? "Codex Workspace" : "my-custom-hook"}
        />
      </label>
      {kind === "target" ? (
        <label className="form-field">
          Target directory
          <Input
            required
            value={draftPath}
            onChange={(e) => setDraftPath(e.target.value)}
            placeholder="~/.codex/skills"
          />
        </label>
      ) : (
        <div className="form-field">
          <span>Lifecycle event</span>
          <Picker
            label="Hook lifecycle event"
            value={draftEvent}
            options={["on-file-write", "post-tool-call", "pre-destructive-tool", "on-tool-failure"]}
            onChange={setDraftEvent}
          />
        </div>
      )}
      <DialogFooter>
        <Button variant="outline" onClick={() => setDialog(null)}>
          Cancel
        </Button>
        <Button type="submit">
          <Plus />
          Add {kind === "target" ? "Target" : "Hook"}
        </Button>
      </DialogFooter>
    </form>
  );
}
