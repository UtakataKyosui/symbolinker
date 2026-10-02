import { useState } from "react";
import { Box, ChevronRight, FolderInput, Link, Link2Off, RefreshCw, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Metric, PageHeading, Panel, Picker, Status } from "@/components/harness/primitives";
import { isEnabled, toggleItem } from "@/lib/agent-profiles";
import { useHarness } from "@/lib/harness-context";
import type { Overview } from "@/bindings";

type SkillStatus = "Linked" | "Inactive" | "Unmanaged";

type SkillEntry = {
  name: string;
  status: SkillStatus;
  inLibrary: boolean;
};

function buildEntries(overview: Overview): SkillEntry[] {
  const skillLinks = overview.links.find((l) => l.kind === "skills");
  const active = overview.profiles.find((p) => p.name === overview.active);
  const linkedSet = new Set(skillLinks?.linked ?? []);
  const unmanagedSet = new Set(skillLinks?.unmanaged ?? []);

  const entries: SkillEntry[] = overview.library.skills.map((name) => ({
    name,
    inLibrary: true,
    status: linkedSet.has(name) ? "Linked" : "Inactive",
  }));

  for (const name of unmanagedSet) {
    if (!active?.enabled.skills.includes(name)) {
      entries.push({ name, inLibrary: false, status: "Unmanaged" });
    }
  }

  return entries;
}

export function SkillsView({
  heading,
  inspected,
  onInspect,
}: {
  heading: { eyebrow: string; title: string; description: string };
  inspected: string | undefined;
  onInspect: (id: string | undefined) => void;
}) {
  const { overview, saveProfile, setDialog, refresh, query, setQuery } = useHarness();
  const [statusFilter, setStatusFilter] = useState("All states");
  const [selected, setSelected] = useState<string[]>([]);

  const active = overview?.profiles.find((p) => p.name === overview.active) ?? null;
  const entries = overview ? buildEntries(overview) : [];
  const skillLinks = overview?.links.find((l) => l.kind === "skills");

  const filteredEntries = entries.filter(
    (e) =>
      e.name.toLowerCase().includes(query.toLowerCase()) &&
      (statusFilter === "All states" || e.status === statusFilter),
  );

  const inspectedEntry = entries.find((e) => e.name === inspected);
  const linkedCount = skillLinks?.linked.length ?? 0;
  const unmanagedCount = skillLinks?.unmanaged.length ?? 0;

  async function toggleSkill(name: string, enabled: boolean) {
    if (!active) return;
    await saveProfile(toggleItem(active, "skills", name, enabled));
  }

  async function bulkEnable(enable: boolean) {
    if (!active) return;
    const eligible = selected.filter((name) => entries.some((e) => e.name === name && e.inLibrary));
    let profile = active;
    for (const name of eligible) {
      profile = toggleItem(profile, "skills", name, enable);
    }
    await saveProfile(profile);
    setSelected([]);
  }

  return (
    <>
      <PageHeading
        {...heading}
        actions={
          <>
            <Button variant="outline" onClick={() => void refresh()}>
              <RefreshCw />
              Scan
            </Button>
            {unmanagedCount > 0 && (
              <Button variant="outline" onClick={() => setDialog("import")}>
                <FolderInput />
                Import ({unmanagedCount} unmanaged)
              </Button>
            )}
            <Button
              variant="outline"
              disabled={!selected.length}
              onClick={() => void bulkEnable(false)}
            >
              <Link2Off />
              Unlink ({selected.length})
            </Button>
            <Button disabled={!selected.length} onClick={() => void bulkEnable(true)}>
              <Link />
              Bulk Link ({selected.length})
            </Button>
          </>
        }
      />
      <div className="metrics-grid small-metrics">
        <Metric
          title="Library skills"
          icon={<Box />}
          value={`${overview?.library.skills.length ?? 0}`}
          suffix="In library"
          badge="Registry"
          note="Imported & managed"
          trend="cyan"
        />
        <Metric
          title="Active symlinks"
          icon={<Link />}
          value={`${linkedCount}`}
          suffix="Linked"
          note="Enabled in active profile"
          trend="cyan"
        />
        <Metric
          title="Unmanaged items"
          icon={<FolderInput />}
          value={`${unmanagedCount}`}
          suffix="Unmanaged"
          badge={unmanagedCount > 0 ? "Import needed" : "Clean"}
          note="Not yet imported"
          trend={unmanagedCount > 0 ? "amber" : "cyan"}
        />
        <Metric
          title="Active profile"
          icon={<Box />}
          value={overview?.active ?? "—"}
          badge="Live"
          note={active ? `${active.enabled.skills.length} skills enabled` : "No profile"}
          trend="blue"
          compact
        />
      </div>
      <div className={`skills-layout ${inspectedEntry ? "with-inspector" : ""}`}>
        <section className="panel skill-registry">
          <div className="filter-bar">
            <div className="filter-search">
              <Search />
              <Input
                aria-label="Filter skills"
                placeholder="Filter skills by name..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <Picker
              label="Filter status"
              value={statusFilter}
              options={["All states", "Linked", "Inactive", "Unmanaged"]}
              onChange={setStatusFilter}
            />
          </div>
          <div className="selection-bar">
            <span>
              <Status>{selected.length} selected</Status>
            </span>
            <Button
              variant="ghost"
              size="xs"
              onClick={() => {
                setSelected([]);
                setQuery("");
                setStatusFilter("All states");
              }}
            >
              Reset filters
            </Button>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="check-column">
                  <Checkbox
                    aria-label="Select all visible skills"
                    checked={
                      filteredEntries.length > 0 &&
                      filteredEntries.every((e) => selected.includes(e.name))
                    }
                    onCheckedChange={(checked) =>
                      setSelected(
                        checked
                          ? [...new Set([...selected, ...filteredEntries.map((e) => e.name)])]
                          : selected.filter(
                              (name) => !filteredEntries.some((e) => e.name === name),
                            ),
                      )
                    }
                  />
                </TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Toggle Link</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEntries.map((e) => (
                <TableRow key={e.name} className={inspected === e.name ? "selected-row" : ""}>
                  <TableCell>
                    <Checkbox
                      aria-label={`Select ${e.name}`}
                      checked={selected.includes(e.name)}
                      onCheckedChange={(checked) =>
                        setSelected((prev) =>
                          checked ? [...prev, e.name] : prev.filter((n) => n !== e.name),
                        )
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <span
                      className={`state-text ${
                        e.status === "Linked"
                          ? "text-cyan"
                          : e.status === "Inactive"
                            ? "muted"
                            : "text-amber"
                      }`}
                    >
                      <i />
                      {e.status}
                    </span>
                  </TableCell>
                  <TableCell>
                    <button className="skill-name" onClick={() => onInspect(e.name)}>
                      {e.name}
                      <ChevronRight />
                    </button>
                    {e.status === "Unmanaged" && (
                      <p className="row-description muted">Not yet imported into the library.</p>
                    )}
                  </TableCell>
                  <TableCell>
                    {e.inLibrary ? (
                      <Switch
                        aria-label={`Toggle ${e.name}`}
                        checked={active ? isEnabled(active, "skills", e.name) : false}
                        onCheckedChange={(checked) => void toggleSkill(e.name, checked)}
                      />
                    ) : (
                      <span className="muted micro">Import first</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {!filteredEntries.length && (
            <div className="empty-state">
              <Search />
              <h3>No matching skills</h3>
              <p>Try another search or reset the filters.</p>
            </div>
          )}
          <div className="table-footer">
            <span>
              Showing {filteredEntries.length} of {entries.length} skills
            </span>
            <span className="text-cyan">{linkedCount} linked</span>
          </div>
        </section>
        {inspectedEntry && (
          <SkillInspector
            entry={inspectedEntry}
            activeProfileName={overview?.active ?? null}
            onClose={() => onInspect(undefined)}
          />
        )}
      </div>
    </>
  );
}

function SkillInspector({
  entry,
  activeProfileName,
  onClose,
}: {
  entry: SkillEntry;
  activeProfileName: string | null;
  onClose: () => void;
}) {
  const { overview, saveProfile } = useHarness();
  const active = overview?.profiles.find((p) => p.name === overview.active) ?? null;
  const enabled = active ? isEnabled(active, "skills", entry.name) : false;

  async function handleToggle(next: boolean) {
    if (!active) return;
    await saveProfile(toggleItem(active, "skills", entry.name, next));
  }

  return (
    <Panel
      title={entry.name}
      icon={<Box />}
      className="inspector-panel"
      extra={
        <Button size="icon-xs" variant="ghost" aria-label="Close inspector" onClick={onClose}>
          <X />
        </Button>
      }
    >
      <p className="muted text-xs mb-5">Skill Inspector · Library item</p>
      <div className="section-label">
        Status
        <Status
          tone={
            entry.status === "Linked" ? "cyan" : entry.status === "Unmanaged" ? "amber" : "muted"
          }
        >
          {entry.status}
        </Status>
      </div>
      <div className="detail-rows">
        <div>
          <span>In library</span>
          <span className={entry.inLibrary ? "text-cyan" : "text-amber"}>
            {entry.inLibrary ? "Yes" : "No — import required"}
          </span>
        </div>
        <div>
          <span>Active profile</span>
          <code>{activeProfileName ?? "—"}</code>
        </div>
      </div>
      <Separator className="my-5" />
      <div className="section-label">Profile membership</div>
      <div className="detail-rows">
        {overview?.profiles.map((p) => (
          <div key={p.name}>
            <span>{p.name}</span>
            <Status tone={isEnabled(p, "skills", entry.name) ? "cyan" : "muted"}>
              {isEnabled(p, "skills", entry.name) ? "Enabled" : "Disabled"}
            </Status>
          </div>
        ))}
      </div>
      {entry.inLibrary && (
        <>
          <Separator className="my-5" />
          <div className="inspector-bottom">
            <span>Enable in active profile</span>
            <Switch
              aria-label={`Enable ${entry.name}`}
              checked={enabled}
              onCheckedChange={(v) => void handleToggle(v)}
            />
          </div>
        </>
      )}
    </Panel>
  );
}
