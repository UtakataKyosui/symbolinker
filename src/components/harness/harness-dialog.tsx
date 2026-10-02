import { useState } from "react";
import { FolderInput, PackagePlus, Plus } from "lucide-react";
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
import { useUIState } from "@/lib/ui-state-context";
import { useAdopt, useImportUnmanaged, useSaveProfile } from "@/lib/use-overview";
import { errorMessage } from "@/lib/agent-result";
import type { Items } from "@/bindings";

const EMPTY_ITEMS: Items = { skills: [], agents: [], hooks: [], rules: [] };

export function HarnessDialog() {
  const { dialog, setDialog } = useUIState();
  return (
    <Dialog
      open={dialog !== null}
      onOpenChange={(open) => {
        if (!open) setDialog(null);
      }}
    >
      <DialogContent>
        {dialog === "adopt" && <AdoptDialog />}
        {dialog === "import" && <ImportDialog />}
        {dialog === "new-profile" && <NewProfileDialog />}
      </DialogContent>
    </Dialog>
  );
}

function AdoptDialog() {
  const { setDialog, setNotice } = useUIState();
  const adopt = useAdopt();

  async function handleAdopt() {
    try {
      await adopt.mutateAsync();
      setDialog(null);
      setNotice("Agent adopted. Default profile created.");
    } catch {
      /* error shown via adopt.error below */
    }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Adopt Agent</DialogTitle>
        <DialogDescription>
          Move all existing items from the agent config directory into the managed library and
          create a default profile with everything enabled. This is a one-time operation per agent.
        </DialogDescription>
      </DialogHeader>
      {adopt.error && <p className="text-xs text-amber mt-2">{errorMessage(adopt.error)}</p>}
      <DialogFooter>
        <Button variant="outline" onClick={() => setDialog(null)}>
          Cancel
        </Button>
        <Button onClick={() => void handleAdopt()} disabled={adopt.isPending}>
          <PackagePlus />
          Adopt
        </Button>
      </DialogFooter>
    </>
  );
}

function ImportDialog() {
  const { setDialog, setNotice } = useUIState();
  const importUnmanaged = useImportUnmanaged();

  async function handleImport() {
    try {
      await importUnmanaged.mutateAsync();
      setDialog(null);
      setNotice("Unmanaged items imported into the active profile.");
    } catch {
      /* error shown via importUnmanaged.error below */
    }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Import Unmanaged Items</DialogTitle>
        <DialogDescription>
          Move newly placed items from the agent config directory into the library and add them to
          the active profile.
        </DialogDescription>
      </DialogHeader>
      {importUnmanaged.error && (
        <p className="text-xs text-amber mt-2">{errorMessage(importUnmanaged.error)}</p>
      )}
      <DialogFooter>
        <Button variant="outline" onClick={() => setDialog(null)}>
          Cancel
        </Button>
        <Button onClick={() => void handleImport()} disabled={importUnmanaged.isPending}>
          <FolderInput />
          Import
        </Button>
      </DialogFooter>
    </>
  );
}

function NewProfileDialog() {
  const { setDialog, setNotice } = useUIState();
  const saveProfile = useSaveProfile();
  const [name, setName] = useState("");

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    try {
      await saveProfile.mutateAsync({ name: trimmed, enabled: EMPTY_ITEMS });
      setDialog(null);
      setNotice(`Profile "${trimmed}" created.`);
    } catch {
      /* error shown via saveProfile.error below */
    }
  }

  return (
    <form onSubmit={(e) => void handleSave(e)}>
      <DialogHeader>
        <DialogTitle>New Profile</DialogTitle>
        <DialogDescription>
          Create a new empty profile. Items can be added from the Profiles page.
        </DialogDescription>
      </DialogHeader>
      <label className="form-field mt-4">
        Profile name
        <Input
          autoFocus
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="my-profile"
        />
      </label>
      {saveProfile.error && (
        <p className="text-xs text-amber mt-2">{errorMessage(saveProfile.error)}</p>
      )}
      <DialogFooter className="mt-4">
        <Button variant="outline" type="button" onClick={() => setDialog(null)}>
          Cancel
        </Button>
        <Button type="submit" disabled={saveProfile.isPending || !name.trim()}>
          <Plus />
          Create Profile
        </Button>
      </DialogFooter>
    </form>
  );
}
