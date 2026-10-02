import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ChevronRight, Search, X, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { Metric, PageHeading, Panel, Status } from "@/components/harness/primitives";
import { isEnabled, toggleItem } from "@/lib/agent-profiles";
import { agentApi } from "@/lib/agent-api";
import { useHarness } from "@/lib/harness-context";
import type { Agent, HookMeta } from "@/bindings";

export const Route = createFileRoute("/hooks")({
  component: HooksPage,
});

const HOOK_EVENTS = ["PreToolUse", "PostToolUse", "PreCompact", "Notification", "Stop"] as const;

function HooksPage() {
  const { agent, overview, saveProfile, query, setQuery } = useHarness();
  const [inspected, setInspected] = useState<string | undefined>();

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
      <div className={`skills-layout ${inspected ? "with-inspector" : ""}`}>
        <Panel title="Hook Registry" icon={<Zap />}>
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
                  <TableHead>Event</TableHead>
                  <TableHead>Runtime</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Enable</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredHooks.map((name) => {
                  const enabled = active ? isEnabled(active, "hooks", name) : false;
                  return (
                    <HookRow
                      key={name}
                      agent={agent}
                      name={name}
                      enabled={enabled}
                      inspected={inspected === name}
                      onInspect={() => setInspected(inspected === name ? undefined : name)}
                      onToggle={(v) => void handleToggle(name, v)}
                    />
                  );
                })}
              </TableBody>
            </Table>
          )}
        </Panel>
        {inspected && (
          <HookInspector agent={agent} name={inspected} onClose={() => setInspected(undefined)} />
        )}
      </div>
    </>
  );
}

function HookRow({
  agent,
  name,
  enabled,
  inspected,
  onInspect,
  onToggle,
}: {
  agent: Agent;
  name: string;
  enabled: boolean;
  inspected: boolean;
  onInspect: () => void;
  onToggle: (v: boolean) => void;
}) {
  const [meta, setMeta] = useState<HookMeta | null>(null);

  useEffect(() => {
    agentApi
      .getHookMeta(agent, name)
      .then(setMeta)
      .catch(() => setMeta(null));
  }, [agent, name]);

  return (
    <TableRow className={inspected ? "selected-row" : ""}>
      <TableCell>
        <button className="skill-name" onClick={onInspect}>
          <strong className="mono">{name}</strong>
          <ChevronRight />
        </button>
      </TableCell>
      <TableCell>
        {meta?.event ? (
          <code className="text-xs">{meta.event}</code>
        ) : (
          <span className="muted micro">—</span>
        )}
      </TableCell>
      <TableCell>
        {meta?.runtime ? (
          <code className="text-xs">{meta.runtime}</code>
        ) : (
          <span className="muted micro">—</span>
        )}
      </TableCell>
      <TableCell>
        <span className={enabled ? "text-cyan" : "muted"}>
          {enabled ? "Active (Linked)" : "Disabled"}
        </span>
      </TableCell>
      <TableCell>
        <Switch aria-label={`Enable ${name}`} checked={enabled} onCheckedChange={onToggle} />
      </TableCell>
    </TableRow>
  );
}

const EMPTY_META: HookMeta = {
  event: null,
  runtime: null,
  timeout: null,
  order: null,
  description: null,
};

function HookInspector({
  agent,
  name,
  onClose,
}: {
  agent: Agent;
  name: string;
  onClose: () => void;
}) {
  const [meta, setMeta] = useState<HookMeta>(EMPTY_META);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    agentApi
      .getHookMeta(agent, name)
      .then(setMeta)
      .catch(() => {});
  }, [agent, name]);

  async function handleSave() {
    setSaving(true);
    try {
      await agentApi.saveHookMeta(agent, name, meta);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Panel
      title={name}
      icon={<Zap />}
      className="inspector-panel"
      extra={
        <Button size="icon-xs" variant="ghost" aria-label="Close inspector" onClick={onClose}>
          <X />
        </Button>
      }
    >
      <p className="muted text-xs mb-5">Hook Inspector · Metadata</p>
      <div className="section-label">Trigger Event</div>
      <div className="flex flex-wrap gap-1 mb-4">
        {HOOK_EVENTS.map((ev) => (
          <button
            key={ev}
            className={`micro px-2 py-0.5 rounded border ${
              meta.event === ev
                ? "border-[var(--color-cyan)] text-cyan bg-[color-mix(in_srgb,var(--color-cyan)_10%,transparent)]"
                : "border-[var(--color-border)] muted"
            }`}
            onClick={() => setMeta((m) => ({ ...m, event: m.event === ev ? null : ev }))}
          >
            {ev}
          </button>
        ))}
      </div>
      <Separator className="my-4" />
      <div className="detail-rows">
        <div>
          <span>Runtime</span>
          <Input
            className="h-6 text-xs w-32"
            placeholder="bash"
            value={meta.runtime ?? ""}
            onChange={(e) => setMeta((m) => ({ ...m, runtime: e.target.value || null }))}
          />
        </div>
        <div>
          <span>Timeout (s)</span>
          <Input
            className="h-6 text-xs w-24"
            type="number"
            min={0}
            placeholder="—"
            value={meta.timeout ?? ""}
            onChange={(e) =>
              setMeta((m) => ({ ...m, timeout: e.target.value ? Number(e.target.value) : null }))
            }
          />
        </div>
        <div>
          <span>Order</span>
          <Input
            className="h-6 text-xs w-24"
            type="number"
            placeholder="—"
            value={meta.order ?? ""}
            onChange={(e) =>
              setMeta((m) => ({ ...m, order: e.target.value ? Number(e.target.value) : null }))
            }
          />
        </div>
      </div>
      <Separator className="my-4" />
      <div className="section-label">Description</div>
      <textarea
        className="w-full text-xs bg-transparent border border-[var(--color-border)] rounded p-2 resize-none text-[var(--color-fg)] placeholder:text-[var(--color-muted)] focus:outline-none focus:border-[var(--color-cyan)]"
        rows={3}
        placeholder="Describe what this hook does..."
        value={meta.description ?? ""}
        onChange={(e) => setMeta((m) => ({ ...m, description: e.target.value || null }))}
      />
      <div className="inspector-bottom mt-4">
        <Status tone={saving ? "muted" : "cyan"}>{saving ? "Saving…" : "Ready"}</Status>
        <Button size="xs" onClick={() => void handleSave()} disabled={saving}>
          Save Metadata
        </Button>
      </div>
    </Panel>
  );
}
