import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Activity,
  ArrowRight,
  Link2Off,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Terminal,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Metric, PageHeading, Panel, Picker, Status } from "@/components/harness/primitives";
import { useHarness } from "@/lib/harness-context";
import type { Hook } from "@/lib/harness-data";

const hookTabs = [
  ["all", "All Hooks"],
  ["prompt", "Pre-Prompt"],
  ["tool", "Tool Execution"],
  ["file", "File Watchers"],
  ["error", "Error Handlers"],
] as const;
type HookTab = (typeof hookTabs)[number][0];

export const Route = createFileRoute("/hooks")({
  validateSearch: (search: Record<string, unknown>): { tab?: HookTab } => ({
    tab: hookTabs.find(([value]) => value === search.tab)?.[0],
  }),
  component: HooksPage,
});

function HooksPage() {
  const { hooks, setHooks, query, setQuery, enabledHooks, setDialog } = useHarness();
  const { tab: hookTab = "all" } = Route.useSearch();
  const navigate = Route.useNavigate();
  const [sandboxEvent, setSandboxEvent] = useState("on-file-write");
  const [sandboxLog, setSandboxLog] = useState([
    "[HarnessDaemon] Demo sandbox ready.",
    "Select an event to preview lifecycle dispatch.",
  ]);
  const filteredHooks = hooks.filter(
    (h) =>
      (hookTab === "all" || hookTab === h.group) &&
      `${h.id} ${h.event} ${h.description}`.toLowerCase().includes(query.toLowerCase()),
  );

  function runSandbox(hook?: Hook) {
    const matching = hook ? [hook] : hooks.filter((h) => h.event === sandboxEvent);
    const log = [`[TriggerDispatch] Preview event: ${hook?.event ?? sandboxEvent}`];
    matching.forEach((h) =>
      log.push(
        h.error
          ? `[ERROR] ${h.id}: ${h.error}`
          : !h.enabled
            ? `[SKIPPED] ${h.id}: disabled`
            : `[PASS] ${h.id} · ${h.runtime} · timeout ${h.timeout}`,
      ),
    );
    if (!matching.length) log.push("[INFO] No hooks registered for this event.");
    log.push("[Preview] Simulation complete. No commands were executed.");
    setSandboxLog(log);
  }

  return (
    <>
      <PageHeading
        eyebrow="Runtime Engine / Symlink Subsystem"
        title="Hooks & Execution Rules"
        description="Configure lifecycle hooks, prompt interception barriers, and file-change trigger harnesses."
        actions={
          <>
            <Button variant="outline" onClick={() => runSandbox()}>
              <Terminal />
              Test Trigger
            </Button>
            <Button variant="outline" onClick={() => setDialog("apply")}>
              <RefreshCw />
              Sync to Runtime
            </Button>
            <Button onClick={() => setDialog("hook")}>
              <Plus />
              New Hook Rule
            </Button>
          </>
        }
      />
      <div className="metrics-grid small-metrics">
        <Metric
          title="Registered hooks"
          icon={<Zap />}
          value={`${hooks.length}`}
          badge="Lifecycle"
          note="Configured preview rules"
          trend="cyan"
        />
        <Metric
          title="Enabled interceptors"
          icon={<Activity />}
          value={`${enabledHooks}`}
          suffix="Active"
          note="Prompt, tool & file events"
          trend="blue"
        />
        <Metric
          title="Security barriers"
          icon={<ShieldCheck />}
          value="1"
          suffix="Scrubber"
          badge="Configured"
          note="Secret interception rule"
          trend="amber"
        />
        <Metric
          title="Runtime drift status"
          icon={<Link2Off />}
          value="1"
          suffix="Syntax Err"
          badge="L14"
          note="typecheck-validation-hook"
          trend="amber"
        />
      </div>
      <section className="panel hooks-registry">
        <div className="hooks-toolbar">
          <Tabs
            value={hookTab}
            onValueChange={(value) =>
              void navigate({
                search: { tab: value === "all" ? undefined : (value as HookTab) },
                replace: true,
              })
            }
          >
            <TabsList variant="line">
              {hookTabs.map(([value, label]) => (
                <TabsTrigger key={value} value={value}>
                  {label}
                  <span className="tab-count">
                    {hooks.filter((h) => value === "all" || value === h.group).length}
                  </span>
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          <div className="filter-search">
            <Search />
            <Input
              aria-label="Filter hooks"
              placeholder="Search rules, paths, events..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Hook & Event Identifier</TableHead>
              <TableHead>Runtime Target Symlink</TableHead>
              <TableHead>Order</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Sandbox / Spec</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredHooks.map((h) => (
              <TableRow key={h.id} className={h.error ? "warning-row" : ""}>
                <TableCell>
                  <strong className="mono">{h.id}</strong>
                  <Status tone="muted">{h.event}</Status>
                  <p className="row-description">{h.description}</p>
                </TableCell>
                <TableCell>
                  <code className="hook-path">
                    .claude/hooks/{h.id}.sh
                    <ArrowRight />
                    <span>~/.agent/hooks/{h.id}.sh</span>
                  </code>
                </TableCell>
                <TableCell>
                  <Status tone={h.order === "P0" ? "cyan" : "muted"}>{h.order}</Status>
                </TableCell>
                <TableCell>
                  <span className={h.error ? "text-amber" : h.enabled ? "text-cyan" : "muted"}>
                    {h.error ?? (h.enabled ? "Active (Linked)" : "Disabled")}
                  </span>
                </TableCell>
                <TableCell>
                  <code>{h.timeout}</code>
                  <span className="stack-label">{h.runtime}</span>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      aria-label={`Test ${h.id}`}
                      onClick={() => runSandbox(h)}
                    >
                      <Terminal />
                    </Button>
                    <Switch
                      aria-label={`Enable ${h.id}`}
                      checked={h.enabled}
                      disabled={!!h.error}
                      onCheckedChange={(enabled) =>
                        setHooks((previous) =>
                          previous.map((item) => (item.id === h.id ? { ...item, enabled } : item)),
                        )
                      }
                    />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {!filteredHooks.length && (
          <div className="empty-state">
            <Search />
            <h3>No matching hooks</h3>
          </div>
        )}
      </section>
      <Panel
        title="Interactive Lifecycle Sandbox Simulator"
        icon={<Terminal />}
        extra={<Status tone="muted">Preview · No execution</Status>}
      >
        <div className="sandbox-controls">
          <span className="mono muted">&gt; EVENT:</span>
          <Picker
            label="Sandbox event"
            value={sandboxEvent}
            options={[...new Set(hooks.map((h) => h.event))]}
            onChange={setSandboxEvent}
          />
          <Button onClick={() => runSandbox()}>
            <Zap />
            Run Trigger Cycle
          </Button>
        </div>
        <div className="terminal-output" aria-live="polite">
          {sandboxLog.map((line, i) => (
            <div
              className={
                line.includes("ERROR")
                  ? "text-amber"
                  : line.includes("PASS")
                    ? "text-cyan"
                    : "muted"
              }
              key={`${line}-${i}`}
            >
              <span className="terminal-line-number">{String(i + 1).padStart(2, "0")}</span>
              {line}
            </div>
          ))}
        </div>
      </Panel>
    </>
  );
}
