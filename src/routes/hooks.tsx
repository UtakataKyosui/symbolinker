import { createFileRoute } from "@tanstack/react-router";
import { Search, Zap } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Metric, PageHeading, Panel, Status } from "@/components/harness/primitives";
import { isEnabled, toggleItem } from "@/lib/agent-profiles";
import { useHarness } from "@/lib/harness-context";

export const Route = createFileRoute("/hooks")({
  component: HooksPage,
});

function HooksPage() {
  const { overview, saveProfile, query, setQuery } = useHarness();

  const active = overview?.profiles.find((p) => p.name === overview.active) ?? null;
  const allHooks = overview?.library.hooks ?? [];
  const enabledHooks = active?.enabled.hooks ?? [];
  const filteredHooks = allHooks.filter((name) => name.toLowerCase().includes(query.toLowerCase()));

  async function handleToggle(name: string, enabled: boolean) {
    if (!active) return;
    await saveProfile(toggleItem(active, "hooks", name, enabled));
  }

  return (
    <>
      <PageHeading
        eyebrow="Agent Harness / Hooks"
        title="Hooks & Triggers"
        description="Configure which lifecycle hooks are active for the current agent profile."
      />
      <div className="metrics-grid small-metrics">
        <Metric
          title="Library hooks"
          icon={<Zap />}
          value={`${allHooks.length}`}
          badge="Registry"
          note="Hooks in managed library"
          trend="cyan"
        />
        <Metric
          title="Enabled hooks"
          icon={<Zap />}
          value={`${enabledHooks.length}`}
          suffix={`/ ${allHooks.length}`}
          note="Active in current profile"
          trend="blue"
        />
      </div>
      <Panel
        title="Hook Registry"
        icon={<Zap />}
        extra={<Status tone="muted">Metadata available after Issue #44</Status>}
      >
        <div className="filter-bar">
          <div className="filter-search">
            <Search />
            <Input
              aria-label="Filter hooks"
              placeholder="Filter by name..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </div>
        {filteredHooks.length === 0 ? (
          <div className="empty-state">
            <Zap />
            <h3>{allHooks.length === 0 ? "No hooks in library" : "No matching hooks"}</h3>
            {allHooks.length === 0 && (
              <p>Add hook directories to the agent config to get started.</p>
            )}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Hook name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Enable</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredHooks.map((name) => {
                const enabled = active ? isEnabled(active, "hooks", name) : false;
                return (
                  <TableRow key={name}>
                    <TableCell>
                      <strong className="mono">{name}</strong>
                    </TableCell>
                    <TableCell>
                      <span className={enabled ? "text-cyan" : "muted"}>
                        {enabled ? "Active (Linked)" : "Disabled"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Switch
                        aria-label={`Enable ${name}`}
                        checked={enabled}
                        onCheckedChange={(v) => void handleToggle(name, v)}
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Panel>
    </>
  );
}
