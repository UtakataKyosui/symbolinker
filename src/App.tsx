import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  Activity,
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  Box,
  Check,
  CheckCheck,
  ChevronRight,
  CircleCheck,
  Copy,
  Download,
  Folder,
  GitBranch,
  Grid2X2,
  Layers,
  Link,
  Link2Off,
  Menu,
  Plus,
  RefreshCw,
  Search,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Terminal,
  TriangleAlert,
  User,
  Workflow,
  X,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  initialHooks,
  initialSkills,
  initialTargets,
  profiles,
  skillPayload,
  type Hook,
} from "@/lib/harness-data";
import "./App.css";
import { applyProfile, restorePreviewState, setSkillEnabled } from "@/lib/harness-state";

type Page = "dashboard" | "skills" | "hooks" | "profiles" | "inspector" | "settings";
const navigation = [
  {
    group: "Overview",
    items: [{ page: "dashboard", label: "Dashboard & Targets", icon: Grid2X2 }],
  },
  {
    group: "Agent Harness",
    items: [
      { page: "skills", label: "Skills & Capabilities", icon: Box },
      { page: "hooks", label: "Hooks & Triggers", icon: Zap },
    ],
  },
  {
    group: "Orchestration",
    items: [
      { page: "profiles", label: "Profiles & Matrix", icon: SlidersHorizontal },
      { page: "inspector", label: "Symlink Inspector", icon: Link },
    ],
  },
] as const;
const titles: Record<Page, [string, string, string]> = {
  dashboard: [
    "Orchestration Daemon",
    "Workspace Overview & Targets",
    "Monitor active symlinks, target agent harnesses, and symlink health diagnostics.",
  ],
  skills: [
    "Agent Harness / Registry Matrix",
    "Agent Skills Engine",
    "Orchestrate source capabilities mapped via atomic symlinks into IDE harnesses and agents.",
  ],
  hooks: [
    "Runtime Engine / Symlink Subsystem",
    "Hooks & Execution Rules",
    "Configure lifecycle hooks, prompt interception barriers, and file-change trigger harnesses.",
  ],
  profiles: [
    "Orchestration / Profiles & Rule Matrix",
    "Profiles & Rule Matrix",
    "Define bundles of skills, hooks, and rules for your developer persona and workspace.",
  ],
  inspector: [
    "Filesystem / Link Topology",
    "Symlink Inspector",
    "Inspect source definitions, mounted targets, and the integrity of harness connections.",
  ],
  settings: [
    "Workspace / Configuration",
    "Workspace Settings",
    "Configure your local workspace, target directories, and interface preferences.",
  ],
};

function useSavedState<T>(key: string, fallback: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      return restorePreviewState(localStorage.getItem(`harness-preview-v1:${key}`), fallback);
    } catch {
      return fallback;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(`harness-preview-v1:${key}`, JSON.stringify(value));
    } catch {
      /* Storage may be disabled. */
    }
  }, [key, value]);
  return [value, setValue] as const;
}
function Status({
  children,
  tone = "cyan",
}: {
  children: ReactNode;
  tone?: "cyan" | "amber" | "muted";
}) {
  return (
    <Badge variant="outline" className={`status status-${tone}`}>
      {children}
    </Badge>
  );
}
function Panel({
  title,
  icon,
  extra,
  children,
  className = "",
}: {
  title: string;
  icon?: ReactNode;
  extra?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`panel ${className}`}>
      <div className="panel-heading">
        <h2>
          {icon}
          {title}
        </h2>
        {extra}
      </div>
      {children}
    </section>
  );
}
function Picker({
  value,
  options,
  onChange,
  label,
}: {
  value: string;
  options: string[];
  onChange: (value: string) => void;
  label: string;
}) {
  return (
    <Select value={value} onValueChange={(next) => next && onChange(next)}>
      <SelectTrigger aria-label={label}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option} value={option}>
            {option}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
function downloadJson(name: string, data: unknown) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }),
  );
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  URL.revokeObjectURL(url);
}

function App() {
  const [page, setPage] = useState<Page>("dashboard");
  const [skills, setSkills] = useSavedState("skills", initialSkills);
  const [hooks, setHooks] = useSavedState("hooks", initialHooks);
  const [profileName, setProfileName] = useSavedState("profile", profiles[0].name);
  const activeProfile = profiles.find((p) => p.name === profileName) ?? profiles[0];
  const [targets, setTargets] = useSavedState("targets", initialTargets);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All categories");
  const [stateFilter, setStateFilter] = useState("All states");
  const [hookTab, setHookTab] = useState("all");
  const [selected, setSelected] = useState<string[]>([]);
  const [inspected, setInspected] = useState<string | null>(initialSkills[0].id);
  const inspectedSkill = skills.find((s) => s.id === inspected);
  const [notice, setNotice] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [dialog, setDialog] = useState<"apply" | "target" | "hook" | null>(null);
  const [draftName, setDraftName] = useState("");
  const [draftPath, setDraftPath] = useState("");
  const [draftEvent, setDraftEvent] = useState("on-file-write");
  const [root, setRoot] = useSavedState("root", "~/work/acme-app");
  const [vault, setVault] = useSavedState("vault", "~/.agent/skills");
  const [autoSync, setAutoSync] = useSavedState("autoSync", true);
  const [strictMode, setStrictMode] = useSavedState("strictMode", true);
  const [sandboxEvent, setSandboxEvent] = useState("on-file-write");
  const [sandboxLog, setSandboxLog] = useState([
    "[HarnessDaemon] Demo sandbox ready.",
    "Select an event to preview lifecycle dispatch.",
  ]);
  const [audit, setAudit] = useState([
    "LINK_CREATE  tailwind-v4-expert.md → .cursor/rules/tailwind.mdc",
    "PROFILE_SELECT  Frontend Specialist (+5 skills, -2 hooks)",
    "CONFLICT_WARN  jest-runner superseded by vitest-agent",
    "FS_WATCHER  Initial tree scan completed for 4 targets",
  ]);
  const searchRef = useRef<HTMLInputElement>(null);
  const linked = skills.filter((s) => s.enabled && s.status === "Mounted").length;
  const broken = skills.filter((s) => s.status === "Broken").length;
  const enabledHooks = hooks.filter((h) => h.enabled).length;
  const filteredSkills = skills.filter(
    (s) =>
      `${s.id} ${s.description} ${s.category} ${s.target}`
        .toLowerCase()
        .includes(query.toLowerCase()) &&
      (category === "All categories" || s.category === category) &&
      (stateFilter === "All states" || s.status === stateFilter),
  );
  const filteredHooks = hooks.filter(
    (h) =>
      (hookTab === "all" || hookTab === h.group) &&
      `${h.id} ${h.event} ${h.description}`.toLowerCase().includes(query.toLowerCase()),
  );
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(""), 4000);
    return () => clearTimeout(timer);
  }, [notice]);
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);
  function navigate(next: Page) {
    setPage(next);
    setQuery("");
    setSidebarOpen(false);
  }
  function chooseProfile(name: string) {
    setProfileName(name);
    setSkills((previous) =>
      applyProfile(
        previous,
        profiles.findIndex((profile) => profile.name === name),
      ),
    );
    setNotice(`Preview profile selected: ${name}`);
    setAudit((previous) => [`PROFILE_SELECT  ${name}`, ...previous].slice(0, 6));
  }
  function toggleSkill(id: string, enabled: boolean) {
    setSkills((previous) =>
      previous.map((skill) => (skill.id === id ? setSkillEnabled(skill, enabled) : skill)),
    );
  }
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
  function rescan() {
    setNotice(
      `Demo scan: ${skills.length} definitions, ${broken} broken target. Filesystem is not connected.`,
    );
  }
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
  function openDraft(kind: "target" | "hook") {
    setDraftName("");
    setDraftPath("");
    setDialog(kind);
  }
  function saveDraft() {
    if (!draftName.trim() || (dialog === "target" && !draftPath.trim())) return;
    if (dialog === "target") {
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
    if (dialog === "hook") {
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
    setNotice(`${dialog === "target" ? "Target" : "Hook"} added to preview.`);
    setDialog(null);
  }
  function profileCards() {
    return (
      <div className="profile-cards">
        {profiles.map((p) => (
          <button
            key={p.name}
            className={`profile-card ${activeProfile.name === p.name ? "is-active" : ""}`}
            onClick={() => chooseProfile(p.name)}
          >
            <div className="flex items-center justify-between gap-2">
              <strong>{p.name}</strong>
              <Status tone={activeProfile.name === p.name ? "cyan" : "muted"}>
                {activeProfile.name === p.name ? "Active" : "Switch"}
              </Status>
            </div>
            <div className="tag-list">
              {p.tags.map((tag, i) => (
                <span key={tag} className={i === 2 ? "accent-tag" : ""}>
                  {tag}
                </span>
              ))}
            </div>
            <div className="profile-meta">
              <span>
                Skills: <b>{skills.filter((skill) => skill.matrix[profiles.indexOf(p)]).length}</b>
              </span>
              <span>
                Hooks: <b>{p.hooks}</b>
              </span>
              <span>{p.note}</span>
            </div>
          </button>
        ))}
      </div>
    );
  }
  function inspector() {
    if (!inspectedSkill) return null;
    const s = inspectedSkill;
    return (
      <Panel
        title={s.id}
        icon={<Terminal />}
        className="inspector-panel"
        extra={
          <Button
            size="icon-xs"
            variant="ghost"
            aria-label="Close inspector"
            onClick={() => setInspected(null)}
          >
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

  return (
    <div className="app-shell dark">
      <header className="titlebar">
        <div className="titlebar-left">
          <Button
            variant="ghost"
            size="icon-sm"
            className="mobile-menu"
            aria-label="Toggle navigation"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            <Menu />
          </Button>
          <div className="window-lights" aria-hidden="true">
            <i />
            <i />
            <i />
          </div>
          <div className="brand">
            <Workflow />
            <span>SymlinkHarness</span>
            <code>v1.4.0</code>
          </div>
          <div className="workspace-chip">
            <Folder />
            <span>acme-corp/web-frontend</span>
            <span className="muted">→</span>
            <code>{vault}</code>
          </div>
        </div>
        <div className="titlebar-right">
          <div className="global-search">
            <Search />
            <Input
              ref={searchRef}
              aria-label="Search skills and hooks"
              placeholder="Quick jump to skills or hooks..."
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                if (!["skills", "hooks", "inspector"].includes(page)) setPage("skills");
              }}
            />
            <kbd>⌘K</kbd>
          </div>
          <span className="preview-label">UI Preview</span>
          <div className="avatar">
            <User />
          </div>
        </div>
      </header>
      {sidebarOpen && (
        <button
          className="sidebar-backdrop"
          aria-label="Close navigation"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <aside className={`sidebar ${sidebarOpen ? "sidebar-open" : ""}`}>
        <div>
          {navigation.map((group) => (
            <div className="nav-group" key={group.group}>
              <div className="nav-label">{group.group}</div>
              <nav aria-label={group.group}>
                {group.items.map((item) => (
                  <button
                    key={item.page}
                    aria-current={page === item.page ? "page" : undefined}
                    className={`nav-item ${page === item.page ? "nav-active" : ""}`}
                    onClick={() => navigate(item.page)}
                  >
                    <item.icon />
                    <span>{item.label}</span>
                    {item.page === "dashboard" ? (
                      <Status>{linked} active</Status>
                    ) : item.page === "skills" || item.page === "hooks" ? (
                      <span className="nav-count">
                        {item.page === "skills" ? skills.length : hooks.length}
                      </span>
                    ) : null}
                  </button>
                ))}
              </nav>
            </div>
          ))}
        </div>
        <div className="sidebar-bottom">
          <div className="directory-card">
            <span className="nav-label">Target directory</span>
            <code>.cursor/rules & ~/.claude/skills</code>
          </div>
          <div className="engine-indicator">
            <span className="status-dot" />
            <span>Symlink Engine Preview</span>
            <RefreshCw />
          </div>
          <button
            className={`nav-item ${page === "settings" ? "nav-active" : ""}`}
            onClick={() => navigate("settings")}
          >
            <Settings />
            <span>Workspace Settings</span>
          </button>
        </div>
      </aside>
      <main className="main-stage">
        <div className="page-heading">
          <div>
            <div className="eyebrow">
              {titles[page][0]}
              <span className="status-dot" />
            </div>
            <h1>{titles[page][1]}</h1>
            <p>{titles[page][2]}</p>
          </div>
          <div className="page-actions">
            {page === "dashboard" && (
              <>
                <Button variant="outline" onClick={rescan}>
                  <RefreshCw />
                  Rescan Symlinks
                </Button>
                <Picker
                  label="Active profile"
                  value={activeProfile.name}
                  options={profiles.map((p) => p.name)}
                  onChange={chooseProfile}
                />
                <Button onClick={() => setDialog("apply")}>
                  <CheckCheck />
                  Apply All Changes
                </Button>
              </>
            )}
            {(page === "skills" || page === "inspector") && (
              <>
                <Button variant="outline" onClick={rescan}>
                  <RefreshCw />
                  Scan Disk
                </Button>
                <Button
                  variant="outline"
                  disabled={!selected.length}
                  onClick={() => bulkLink(false)}
                >
                  <Link2Off />
                  Unlink ({selected.length})
                </Button>
                <Button disabled={!selected.length} onClick={() => bulkLink(true)}>
                  <Link />
                  Bulk Link ({selected.length})
                </Button>
              </>
            )}
            {page === "hooks" && (
              <>
                <Button variant="outline" onClick={() => runSandbox()}>
                  <Terminal />
                  Test Trigger
                </Button>
                <Button variant="outline" onClick={() => setDialog("apply")}>
                  <RefreshCw />
                  Sync to Runtime
                </Button>
                <Button onClick={() => openDraft("hook")}>
                  <Plus />
                  New Hook Rule
                </Button>
              </>
            )}
            {page === "profiles" && (
              <>
                <Button
                  variant="outline"
                  onClick={() =>
                    downloadJson("harness-matrix.json", { profile: activeProfile.name, skills })
                  }
                >
                  <Download />
                  Export Matrix
                </Button>
                <Button onClick={() => setDialog("apply")}>
                  <Link />
                  Apply Symlinks
                </Button>
              </>
            )}
          </div>
        </div>

        {page === "dashboard" && (
          <>
            <div className="metrics-grid">
              <Metric
                title="Active skills linked"
                icon={<Box />}
                value={`${linked}`}
                suffix={`/ ${skills.length}`}
                badge="Healthy"
                note="Source capabilities mounted"
                trend="cyan"
              />
              <Metric
                title="Lifecycle hooks"
                icon={<Zap />}
                value={`${enabledHooks}`}
                suffix={`/ ${hooks.length}`}
                badge="Intercepting"
                note="pre · post · file-change"
                trend="blue"
              />
              <Metric
                title="Broken / stale links"
                icon={<Link2Off />}
                value={`${broken}`}
                suffix="Broken"
                badge="Action Needed"
                note="python-type-checker → target missing"
                trend="amber"
              />
              <Metric
                title="Active profile matrix"
                icon={<SlidersHorizontal />}
                value={activeProfile.name}
                badge="Live Preview"
                note={activeProfile.tags.join(" · ")}
                trend="cyan"
                compact
              />
            </div>
            <div className="dashboard-columns">
              <div className="column-stack">
                <Panel
                  title="Target Agent Harnesses & Junction Status"
                  icon={<Link />}
                  extra={
                    <Button variant="outline" size="xs" onClick={() => openDraft("target")}>
                      <Plus />
                      Add Target
                    </Button>
                  }
                >
                  <p className="panel-description">
                    Configured endpoints listening to linked capability presets
                  </p>
                  <div className="target-list">
                    {targets.map((target, i) => (
                      <div
                        className={`target-row ${!target.healthy ? "target-warning" : ""}`}
                        key={target.path}
                      >
                        <div className="target-symbol">
                          {i === 0 ? (
                            <Folder />
                          ) : i === 1 ? (
                            <Workflow />
                          ) : i === 3 ? (
                            <Terminal />
                          ) : (
                            <Box />
                          )}
                        </div>
                        <div className="target-content">
                          <div>
                            <strong>{target.name}</strong>
                            <Status tone={target.healthy ? "cyan" : "amber"}>
                              {target.healthy ? "Healthy" : "Path Shift"}
                            </Status>
                          </div>
                          <code>
                            {target.path}
                            <span> · {target.detail}</span>
                          </code>
                        </div>
                        <Button
                          variant="outline"
                          size="xs"
                          onClick={() => {
                            if (!target.healthy) {
                              navigate("inspector");
                              setInspected("python-type-checker");
                            } else setNotice(`Preview target: ${target.path}`);
                          }}
                        >
                          {target.healthy ? <ShieldCheck /> : <TriangleAlert />}
                          {target.healthy ? "Verify" : "Inspect"}
                        </Button>
                      </div>
                    ))}
                  </div>
                </Panel>
                <Panel
                  title="Symlink Operations Audit Trail"
                  icon={<Activity />}
                  extra={<span className="micro muted">Preview fs events</span>}
                >
                  <div className="audit-list">
                    {audit.map((line, i) => (
                      <div className="audit-row" key={`${line}-${i}`}>
                        <span className="muted">
                          {
                            [
                              "10:42:18",
                              "10:30:05",
                              "09:15:42",
                              "08:50:11",
                              "08:42:10",
                              "08:30:21",
                            ][i]
                          }
                        </span>
                        <span className={line.startsWith("CONFLICT") ? "text-amber" : "text-cyan"}>
                          {line.split("  ")[0]}
                        </span>
                        <span>{line.split("  ")[1]}</span>
                        <span className="muted">{i === 2 ? "RESOLVED" : "0.4ms"}</span>
                      </div>
                    ))}
                  </div>
                </Panel>
                <Panel
                  title="Registry Topography"
                  icon={<GitBranch />}
                  extra={<span className="micro muted">Zero-copy junctions</span>}
                >
                  <div className="topography">
                    <div>
                      <Layers />
                      <strong>Global Vault</strong>
                      <code>{vault}</code>
                    </div>
                    <span className="topology-line">
                      <code>atomic symlink</code>
                      <ArrowRight />
                    </span>
                    <div>
                      <Workflow />
                      <strong>Active Targets</strong>
                      <code>Cursor / Claude / Codex</code>
                    </div>
                  </div>
                </Panel>
              </div>
              <div className="column-stack">
                <Panel title="Quick Profile Switcher" icon={<SlidersHorizontal />}>
                  <p className="panel-description">
                    Instant rule & hook presets for targeted tasks
                  </p>
                  {profileCards()}
                </Panel>
                <Panel
                  title="System Diagnostics"
                  icon={<Activity />}
                  extra={<Status>Preview</Status>}
                >
                  <div className="detail-rows diagnostic-rows">
                    <div>
                      <span>Watcher Engine</span>
                      <span className="text-cyan">Demo mode</span>
                    </div>
                    <div>
                      <span>Target Permissions</span>
                      <span>Not connected</span>
                    </div>
                    <div>
                      <span>Collision Prevention</span>
                      <span className="text-blue">{strictMode ? "Strict Mode" : "Disabled"}</span>
                    </div>
                    <div>
                      <span>UI State Storage</span>
                      <span>Local browser</span>
                    </div>
                  </div>
                  <Button
                    variant="link"
                    size="xs"
                    className="export-link"
                    onClick={() =>
                      downloadJson("harness-diagnostics.json", {
                        mode: "preview",
                        skills,
                        hooks,
                        targets,
                        profile: activeProfile.name,
                      })
                    }
                  >
                    Export Diagnostic Bundle
                    <ArrowUpRight />
                  </Button>
                </Panel>
              </div>
            </div>
          </>
        )}

        {(page === "skills" || page === "inspector") && (
          <>
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
                                checked
                                  ? [...previous, s.id]
                                  : previous.filter((id) => id !== s.id),
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
                          <button className="skill-name" onClick={() => setInspected(s.id)}>
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
              {inspectedSkill && inspector()}
            </div>
          </>
        )}

        {page === "hooks" && (
          <>
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
                <Tabs value={hookTab} onValueChange={(value) => setHookTab(String(value))}>
                  <TabsList variant="line">
                    {[
                      ["all", "All Hooks"],
                      ["prompt", "Pre-Prompt"],
                      ["tool", "Tool Execution"],
                      ["file", "File Watchers"],
                      ["error", "Error Handlers"],
                    ].map(([value, label]) => (
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
                        <span
                          className={h.error ? "text-amber" : h.enabled ? "text-cyan" : "muted"}
                        >
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
                                previous.map((item) =>
                                  item.id === h.id ? { ...item, enabled } : item,
                                ),
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
        )}

        {page === "profiles" && (
          <>
            <section className="panel live-profile">
              <div className="flex gap-3 items-center">
                <div className="profile-symbol">
                  <Terminal />
                </div>
                <div>
                  <div className="eyebrow">Live state: Active harness profile</div>
                  <h2>
                    {activeProfile.name} <Status>Preview</Status>
                  </h2>
                </div>
              </div>
              <div className="live-profile-counts">
                <span>
                  <Box />
                  {linked} Skills
                </span>
                <span>
                  <Zap />
                  {activeProfile.hooks} Hooks
                </span>
                <span>
                  <ShieldCheck />
                  Preset
                </span>
              </div>
            </section>
            <div className="profiles-layout">
              <Panel
                title="Capability × Profile Matrix"
                icon={<Grid2X2 />}
                extra={<span className="micro muted">Click toggles to configure preview</span>}
              >
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Capability / Extension Target</TableHead>
                      {profiles.map((p, index) => (
                        <TableHead
                          key={p.name}
                          className={p.name === activeProfile.name ? "matrix-active" : ""}
                        >
                          {["Frontend", "Tech Lead", "Python", "Fullstack"][index]}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {skills.map((s) => (
                      <TableRow key={s.id}>
                        <TableCell>
                          <strong className="mono">{s.id}</strong>
                          <p className="row-description">{s.description}</p>
                        </TableCell>
                        {s.matrix.map((checked, index) => (
                          <TableCell
                            key={index}
                            className={
                              profiles[index].name === activeProfile.name ? "matrix-active" : ""
                            }
                          >
                            <Checkbox
                              aria-label={`${s.id} for ${profiles[index].name}`}
                              checked={checked}
                              onCheckedChange={(next) =>
                                setSkills((previous) =>
                                  previous.map((skill) =>
                                    skill.id === s.id
                                      ? {
                                          ...skill,
                                          matrix: skill.matrix.map((value, i) =>
                                            i === index ? next : value,
                                          ),
                                        }
                                      : skill,
                                  ),
                                )
                              }
                            />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <div className="table-footer">
                  <span>Matrix version: Preview v1</span>
                  <code>.agent/profiles.matrix.json</code>
                </div>
              </Panel>
              <div className="column-stack">
                <Panel title="Preset Switcher" icon={<SlidersHorizontal />}>
                  {profileCards()}
                </Panel>
                <Panel
                  title="Dynamic Activation Engine"
                  icon={<Zap />}
                  extra={<Status tone="amber">Preview Rules</Status>}
                >
                  <p className="panel-description">
                    Workspace heuristics for automatic profile activation.
                  </p>
                  {[
                    ["Next.js Workspace", 'package.json contains "next"', "Frontend Specialist"],
                    [
                      "Release Branching",
                      "git branch matches release/*",
                      "Tech Lead & Code Reviewer",
                    ],
                    ["Python Environment", "root has pyproject.toml", "Backend Python Engineer"],
                  ].map(([title, condition, profile]) => (
                    <div className="heuristic" key={title}>
                      <strong>{title}</strong>
                      <code>{condition}</code>
                      <span>
                        <ArrowRight />
                        {profile}
                      </span>
                    </div>
                  ))}
                </Panel>
              </div>
            </div>
          </>
        )}

        {page === "settings" && (
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
                A local UI preview based on the Stitch SymlinkHarness designs. Skill toggles,
                profile selection, and preferences are stored in your browser. Filesystem operations
                and runtime execution require a backend connection.
              </p>
              <Separator className="my-5" />
              <Status>React 19</Status> <Status>shadcn/ui</Status> <Status>Tauri 2</Status>
            </Panel>
          </div>
        )}
      </main>
      <footer className="statusbar">
        <div>
          <span className="muted">Target Root:</span>
          <code>{root}</code>
          <span className="statusbar-divider" />
          <span className="muted">Active Profile:</span>
          <span className="text-blue">{activeProfile.name}</span>
        </div>
        <div>
          <span>Links:</span>
          <span className="text-cyan">{linked} Mounted</span>
          <span className="text-amber">{broken} Broken</span>
          <span className="statusbar-divider" />
          <span className="status-dot" />
          <span>Local UI Preview</span>
        </div>
      </footer>
      {notice && (
        <div className="toast" role="status">
          <CircleCheck />
          <span>{notice}</span>
          <Button
            variant="ghost"
            size="icon-xs"
            aria-label="Dismiss notification"
            onClick={() => setNotice("")}
          >
            <X />
          </Button>
        </div>
      )}
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
          {dialog === "apply" ? (
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
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                saveDraft();
              }}
            >
              <label className="form-field">
                {dialog === "target" ? "Target name" : "Hook identifier"}
                <Input
                  autoFocus
                  required
                  value={draftName}
                  onChange={(e) => setDraftName(e.target.value)}
                  placeholder={dialog === "target" ? "Codex Workspace" : "my-custom-hook"}
                />
              </label>
              {dialog === "target" ? (
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
                    options={[
                      "on-file-write",
                      "post-tool-call",
                      "pre-destructive-tool",
                      "on-tool-failure",
                    ]}
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
                  Add {dialog === "target" ? "Target" : "Hook"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
function Metric({
  title,
  icon,
  value,
  suffix,
  badge,
  note,
  trend,
  compact = false,
}: {
  title: string;
  icon: ReactNode;
  value: string;
  suffix?: string;
  badge?: string;
  note: string;
  trend: "cyan" | "amber" | "blue";
  compact?: boolean;
}) {
  return (
    <section className={`metric metric-${trend}`}>
      <div className="metric-label">
        <span>
          {icon}
          {title}
        </span>
        {badge && <Status tone={trend === "amber" ? "amber" : "cyan"}>{badge}</Status>}
      </div>
      <div className={`metric-value ${compact ? "metric-compact" : ""}`}>
        {value}
        <span>{suffix}</span>
      </div>
      <div className="metric-note">{note}</div>
      <div className="sparkline" aria-hidden="true">
        <svg viewBox="0 0 240 24" preserveAspectRatio="none">
          <path
            d={
              trend === "amber"
                ? "M0 20 L25 20 L25 9 L56 9 L56 16 L90 16 L90 11 L130 11 L130 18 L170 18 L170 7 L205 7 L205 12 L240 12"
                : "M0 21 L22 21 L38 15 L60 15 L76 18 L96 9 L120 9 L144 13 L168 4 L192 7 L213 2 L240 2"
            }
          />
        </svg>
      </div>
    </section>
  );
}
export default App;
