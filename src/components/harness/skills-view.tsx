import { useState } from "react";
import {
  ArrowDown,
  Box,
  Check,
  ChevronRight,
  Copy,
  Folder,
  Layers,
  Link,
  Link2Off,
  RefreshCw,
  Search,
  Terminal,
  TriangleAlert,
  X,
} from "lucide-react";
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
import { useHarness } from "@/lib/harness-context";
import { skillPayload, type Skill } from "@/lib/harness-data";

export function SkillsView({
  heading,
  inspected,
  onInspect,
}: {
  heading: { eyebrow: string; title: string; description: string };
  inspected: string | undefined;
  onInspect: (id: string | undefined) => void;
}) {
  const { skills, query, setQuery, linked, broken, toggleSkill, rescan, setNotice } = useHarness();
  const [category, setCategory] = useState("All categories");
  const [stateFilter, setStateFilter] = useState("All states");
  const [selected, setSelected] = useState<string[]>([]);
  const inspectedSkill = skills.find((s) => s.id === inspected);
  const filteredSkills = skills.filter(
    (s) =>
      `${s.id} ${s.description} ${s.category} ${s.target}`
        .toLowerCase()
        .includes(query.toLowerCase()) &&
      (category === "All categories" || s.category === category) &&
      (stateFilter === "All states" || s.status === stateFilter),
  );

  function bulkLink(enabled: boolean) {
    const eligible = selected.filter((id) =>
      skills.some((s) => s.id === id && s.status !== "Broken" && s.status !== "Collision"),
    );
    eligible.forEach((id) => toggleSkill(id, enabled));
    setNotice(
      `${eligible.length} skills ${enabled ? "enabled" : "disabled"} in preview. Unresolved definitions are skipped.`,
    );
    setSelected([]);
  }

  return (
    <>
      <PageHeading
        {...heading}
        actions={
          <>
            <Button variant="outline" onClick={rescan}>
              <RefreshCw />
              Scan Disk
            </Button>
            <Button variant="outline" disabled={!selected.length} onClick={() => bulkLink(false)}>
              <Link2Off />
              Unlink ({selected.length})
            </Button>
            <Button disabled={!selected.length} onClick={() => bulkLink(true)}>
              <Link />
              Bulk Link ({selected.length})
            </Button>
          </>
        }
      />
      <div className="metrics-grid small-metrics">
        <Metric
          title="Registered skills"
          icon={<Box />}
          value={`${skills.length}`}
          suffix="Capabilities"
          badge="Registry"
          note="Workspace definitions"
          trend="cyan"
        />
        <Metric
          title="Active symlinks"
          icon={<Link />}
          value={`${linked}`}
          suffix="Mounted"
          note="Enabled connections"
          trend="cyan"
        />
        <Metric
          title="Dangling / broken"
          icon={<TriangleAlert />}
          value={`${broken}`}
          suffix="Broken"
          badge="Path Shift"
          note="Requires inspection"
          trend="amber"
        />
        <Metric
          title="Harness coverage"
          icon={<Layers />}
          value="4"
          suffix="Targets"
          note="Cursor · Claude · Codex · Local"
          trend="blue"
        />
      </div>
      <div className={`skills-layout ${inspectedSkill ? "with-inspector" : ""}`}>
        <section className="panel skill-registry">
          <div className="filter-bar">
            <div className="filter-search">
              <Search />
              <Input
                aria-label="Filter skills"
                placeholder="Filter skills by name, target, or category..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <Picker
              label="Filter category"
              value={category}
              options={["All categories", ...new Set(skills.map((s) => s.category))]}
              onChange={setCategory}
            />
            <Picker
              label="Filter status"
              value={stateFilter}
              options={["All states", "Mounted", "Unlinked", "Collision", "Broken"]}
              onChange={setStateFilter}
            />
          </div>
          <div className="selection-bar">
            <span>
              <Status>{selected.length} selected</Status>
              <span className="micro">
                Target Matrix: <code>.cursor/rules/*.mdc</code>
              </span>
            </span>
            <Button
              variant="ghost"
              size="xs"
              onClick={() => {
                setSelected([]);
                setQuery("");
                setCategory("All categories");
                setStateFilter("All states");
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
                      filteredSkills.length > 0 &&
                      filteredSkills.every((s) => selected.includes(s.id))
                    }
                    onCheckedChange={(checked) =>
                      setSelected(
                        checked
                          ? [...new Set([...selected, ...filteredSkills.map((s) => s.id)])]
                          : selected.filter((id) => !filteredSkills.some((s) => s.id === id)),
                      )
                    }
                  />
                </TableHead>
                <TableHead>State</TableHead>
                <TableHead>Capability / Descriptor</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Toggle Link</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSkills.map((s) => (
                <TableRow key={s.id} className={inspected === s.id ? "selected-row" : ""}>
                  <TableCell>
                    <Checkbox
                      aria-label={`Select ${s.id}`}
                      checked={selected.includes(s.id)}
                      onCheckedChange={(checked) =>
                        setSelected((previous) =>
                          checked ? [...previous, s.id] : previous.filter((id) => id !== s.id),
                        )
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <span
                      className={`state-text ${s.status === "Mounted" ? "text-cyan" : s.status === "Unlinked" ? "muted" : "text-amber"}`}
                    >
                      <i />
                      {s.status}
                    </span>
                  </TableCell>
                  <TableCell>
                    <button className="skill-name" onClick={() => onInspect(s.id)}>
                      {s.id}
                      <ChevronRight />
                    </button>
                    <p className="row-description">{s.description}</p>
                  </TableCell>
                  <TableCell>
                    <Status tone="muted">{s.category}</Status>
                    <span className="stack-label">{s.stack}</span>
                  </TableCell>
                  <TableCell>
                    <Switch
                      aria-label={`Toggle ${s.id}`}
                      checked={s.enabled}
                      disabled={s.status === "Broken" || s.status === "Collision"}
                      onCheckedChange={(checked) => toggleSkill(s.id, checked)}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {!filteredSkills.length && (
            <div className="empty-state">
              <Search />
              <h3>No matching capabilities</h3>
              <p>Try another search or reset the filters.</p>
            </div>
          )}
          <div className="table-footer">
            <span>
              Showing {filteredSkills.length} of {skills.length} registered skills
            </span>
            <span className="text-cyan">{linked} mounted</span>
          </div>
        </section>
        {inspectedSkill && (
          <SkillInspector skill={inspectedSkill} onClose={() => onInspect(undefined)} />
        )}
      </div>
    </>
  );
}

function SkillInspector({ skill: s, onClose }: { skill: Skill; onClose: () => void }) {
  const { toggleSkill, setNotice } = useHarness();
  return (
    <Panel
      title={s.id}
      icon={<Terminal />}
      className="inspector-panel"
      extra={
        <Button size="icon-xs" variant="ghost" aria-label="Close inspector" onClick={onClose}>
          <X />
        </Button>
      }
    >
      <p className="muted text-xs mb-5">Skill Inode Inspector · Preview definition</p>
      <div className="section-label">
        Harness connection
        <Status tone={s.status === "Mounted" ? "cyan" : "amber"}>{s.status}</Status>
      </div>
      <div className="detail-rows">
        <div>
          <span>FS Sync Mode</span>
          <code>Atomic symlink</code>
        </div>
        <div>
          <span>Harness Stack</span>
          <code>{s.stack}</code>
        </div>
        <div>
          <span>Category</span>
          <code>{s.category}</code>
        </div>
      </div>
      <Separator className="my-5" />
      <div className="section-label">Resolved path topology</div>
      <div className="path-box">
        <Folder />
        <span>
          Source definition<code>{s.source}</code>
        </span>
      </div>
      <ArrowDown className="path-arrow" />
      <div className="path-box target-path">
        <Link />
        <span>
          Mounted target harness<code>{s.target}</code>
        </span>
      </div>
      <Separator className="my-5" />
      <div className="section-label">
        System rule payload
        <Button
          variant="ghost"
          size="xs"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(skillPayload(s));
              setNotice("Skill definition copied.");
            } catch {
              setNotice("Clipboard unavailable. Select the definition to copy it.");
            }
          }}
        >
          <Copy />
          Copy
        </Button>
      </div>
      <pre className="payload">{skillPayload(s)}</pre>
      <div className="section-label mt-5">Environment & permissions</div>
      <div className="permissions">
        <span>
          <Check />
          Read workspace
        </span>
        <span>
          <Check />
          Write diagnostics
        </span>
        <span className="muted">
          <X />
          No shell execution
        </span>
        <span className="muted">
          <X />
          No web access
        </span>
      </div>
      <div className="inspector-bottom">
        <span>Enable in preview</span>
        <Switch
          aria-label={`Enable ${s.id} in inspector`}
          checked={s.enabled}
          disabled={s.status === "Broken" || s.status === "Collision"}
          onCheckedChange={(enabled) => toggleSkill(s.id, enabled)}
        />
      </div>
    </Panel>
  );
}
