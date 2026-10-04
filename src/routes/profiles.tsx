import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Plus, SlidersHorizontal, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageHeading, Panel, Status } from "@/components/harness/primitives";
import { ProfileCards } from "@/components/harness/profile-cards";
import { isEnabled, toggleItem, enabledCount } from "@/lib/agent-profiles";
import { useUIState } from "@/lib/ui-state-context";
import { useOverview, useSaveProfile, useDeleteProfile } from "@/lib/use-overview";
import type { Kind, Profile } from "@/bindings";

export const Route = createFileRoute("/profiles")({
  component: ProfilesPage,
});

const ALL_KINDS: Kind[] = ["skills", "agents", "hooks", "rules"];
const KIND_LABELS: Record<Kind, string> = {
  skills: "Skills",
  agents: "Sub-Agents",
  hooks: "Hooks",
  rules: "Rules",
};

function ProfilesPage() {
  const { setDialog } = useUIState();
  const { data: overview } = useOverview();
  const saveProfile = useSaveProfile();
  const deleteProfile = useDeleteProfile();
  const [editingName, setEditingName] = useState<string | null>(null);

  const profiles = overview?.profiles ?? [];
  const active = overview?.active ?? null;
  const editingProfile = profiles.find((p) => p.name === editingName) ?? null;

  async function handleToggle(profile: Profile, kind: Kind, name: string, enabled: boolean) {
    await saveProfile.mutateAsync(toggleItem(profile, kind, name, enabled));
  }

  async function handleDelete(name: string) {
    if (name === active) return;
    await deleteProfile.mutateAsync(name);
    if (editingName === name) setEditingName(null);
  }

  function allItemsForKind(kind: Kind): string[] {
    return overview?.library[kind] ?? [];
  }

  return (
    <>
      <PageHeading
        eyebrow="Orchestration / Profiles"
        title="Profiles"
        description="Define item bundles per profile and switch between them."
        actions={
          overview?.adopted && (
            <Button onClick={() => setDialog("new-profile")}>
              <Plus />
              New Profile
            </Button>
          )
        }
      />
      {overview && !overview.adopted ? (
        <div className="empty-state">
          <SlidersHorizontal />
          <h3>Agent not adopted</h3>
          <p>Adopt the agent to start managing profiles.</p>
        </div>
      ) : (
        <div className="profiles-layout">
          <Panel
            title="Profile Editor"
            icon={<SlidersHorizontal />}
            extra={
              editingProfile && (
                <span className="micro muted">
                  Editing: <strong>{editingProfile.name}</strong>
                </span>
              )
            }
          >
            {profiles.length === 0 ? (
              <div className="empty-state">
                <SlidersHorizontal />
                <h3>No profiles yet</h3>
                <Button size="xs" onClick={() => setDialog("new-profile")}>
                  Create first profile
                </Button>
              </div>
            ) : (
              <>
                <div className="profile-selector">
                  {profiles.map((p) => (
                    <button
                      key={p.name}
                      className={`profile-tab ${editingName === p.name ? "profile-tab-active" : ""}`}
                      aria-pressed={editingName === p.name}
                      onClick={() => setEditingName(p.name)}
                    >
                      <span className="min-w-0">{p.name}</span>
                      {active === p.name && <Status tone="cyan">Active</Status>}
                    </button>
                  ))}
                </div>
                {editingProfile ? (
                  <>
                    <div className="profile-editor-header">
                      <div>
                        <strong>{editingProfile.name}</strong>
                        <span className="muted micro">
                          {" "}
                          · {enabledCount(editingProfile)} items enabled
                        </span>
                      </div>
                      <div className="flex gap-2">
                        {active !== editingProfile.name && (
                          <Button
                            variant="ghost"
                            size="xs"
                            className="text-amber"
                            onClick={() => void handleDelete(editingProfile.name)}
                          >
                            <Trash2 size={14} />
                            Delete
                          </Button>
                        )}
                      </div>
                    </div>
                    {ALL_KINDS.map((kind) => {
                      const items = allItemsForKind(kind);
                      if (items.length === 0) return null;
                      return (
                        <div key={kind} className="kind-section">
                          <div className="section-label">{KIND_LABELS[kind]}</div>
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="check-column">
                                  <Checkbox
                                    aria-label={`Toggle all ${kind}`}
                                    checked={items.every((name) =>
                                      isEnabled(editingProfile, kind, name),
                                    )}
                                    onCheckedChange={(checked) => {
                                      let profile = editingProfile;
                                      for (const name of items) {
                                        profile = toggleItem(profile, kind, name, !!checked);
                                      }
                                      void saveProfile.mutateAsync(profile);
                                    }}
                                  />
                                </TableHead>
                                <TableHead>Name</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {items.map((name) => (
                                <TableRow key={name}>
                                  <TableCell>
                                    <Checkbox
                                      aria-label={`Enable ${name} in ${editingProfile.name}`}
                                      checked={isEnabled(editingProfile, kind, name)}
                                      onCheckedChange={(checked) =>
                                        void handleToggle(editingProfile, kind, name, !!checked)
                                      }
                                    />
                                  </TableCell>
                                  <TableCell>
                                    <code>{name}</code>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      );
                    })}
                  </>
                ) : (
                  <p className="muted">Select a profile to edit its items.</p>
                )}
              </>
            )}
          </Panel>
          <div className="column-stack">
            <Panel title="Active Profile" icon={<SlidersHorizontal />}>
              <p className="panel-description">Click a profile card to activate it.</p>
              <ProfileCards />
            </Panel>
          </div>
        </div>
      )}
    </>
  );
}
