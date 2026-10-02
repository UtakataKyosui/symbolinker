import { useEffect, useRef, useState } from "react";
import { Link, Outlet, createRootRoute, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  Box,
  CircleCheck,
  FolderInput,
  Grid2X2,
  Link as LinkIcon,
  Loader2,
  Menu,
  PackagePlus,
  RefreshCw,
  Search,
  Settings,
  SlidersHorizontal,
  TriangleAlert,
  Workflow,
  X,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { HarnessDialog } from "@/components/harness/harness-dialog";
import { PageHeading, Status } from "@/components/harness/primitives";
import { HarnessProvider, useHarness } from "@/lib/harness-context";
import type { Agent } from "@/bindings";

export const Route = createRootRoute({
  component: RootLayout,
  notFoundComponent: NotFound,
});

const navigation = [
  {
    group: "Overview",
    items: [{ to: "/", label: "Dashboard", icon: Grid2X2 }],
  },
  {
    group: "Agent Harness",
    items: [
      { to: "/skills", label: "Skills & Capabilities", icon: Box },
      { to: "/hooks", label: "Hooks & Triggers", icon: Zap },
    ],
  },
  {
    group: "Orchestration",
    items: [
      { to: "/profiles", label: "Profiles", icon: SlidersHorizontal },
      { to: "/inspector", label: "Symlink Inspector", icon: LinkIcon },
    ],
  },
] as const;

const searchablePaths = ["/skills", "/hooks", "/inspector"];

const AGENT_LABELS: Record<Agent, string> = {
  claude: "Claude",
  codex: "Codex",
};

function RootLayout() {
  return (
    <HarnessProvider>
      <AppShell />
    </HarnessProvider>
  );
}

function AppShell() {
  const {
    agent,
    setAgent,
    overview,
    loading,
    error,
    query,
    setQuery,
    notice,
    setNotice,
    setDialog,
  } = useHarness();

  const navigate = useNavigate();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  const linkedCount = overview?.links.find((l) => l.kind === "skills")?.linked.length ?? 0;
  const skillCount = overview?.library.skills.length ?? 0;
  const hookCount = overview?.library.hooks.length ?? 0;
  const hasUnmanaged = overview?.links.some((l) => l.unmanaged.length > 0) ?? false;

  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

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
          <div className="agent-selector">
            {(["claude", "codex"] as Agent[]).map((a) => (
              <button
                key={a}
                className={`agent-tab ${agent === a ? "agent-tab-active" : ""}`}
                onClick={() => setAgent(a)}
                aria-pressed={agent === a}
              >
                {AGENT_LABELS[a]}
              </button>
            ))}
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
                if (!searchablePaths.includes(pathname)) void navigate({ to: "/skills" });
              }}
            />
            <kbd>⌘K</kbd>
          </div>
          {loading && <Loader2 className="animate-spin muted" size={16} aria-label="Loading" />}
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
                  <Link
                    key={item.to}
                    to={item.to}
                    className="nav-item"
                    activeProps={{ className: "nav-active" }}
                    activeOptions={{ exact: true, includeSearch: false }}
                    onClick={() => setQuery("")}
                  >
                    <item.icon />
                    <span>{item.label}</span>
                    {item.to === "/" ? (
                      <Status>{linkedCount} active</Status>
                    ) : item.to === "/skills" ? (
                      <span className="nav-count">{skillCount}</span>
                    ) : item.to === "/hooks" ? (
                      <span className="nav-count">{hookCount}</span>
                    ) : null}
                  </Link>
                ))}
              </nav>
            </div>
          ))}
        </div>
        <div className="sidebar-bottom">
          <div className="directory-card">
            <span className="nav-label">Agent</span>
            <code>~/.{agent}</code>
          </div>
          <div className="engine-indicator">
            <span className={`status-dot ${overview ? "status-connected" : ""}`} />
            <span>{overview ? "Connected" : loading ? "Connecting…" : "Disconnected"}</span>
            <RefreshCw />
          </div>
          <Link
            to="/settings"
            className="nav-item"
            activeProps={{ className: "nav-active" }}
            onClick={() => setQuery("")}
          >
            <Settings />
            <span>Settings</span>
          </Link>
        </div>
      </aside>
      <main className="main-stage">
        {error && (
          <div className="banner banner-error" role="alert">
            <TriangleAlert size={16} />
            <span>{error}</span>
          </div>
        )}
        {overview && !overview.adopted && (
          <div className="banner banner-warn">
            <PackagePlus size={16} />
            <span>
              Agent <strong>{AGENT_LABELS[agent]}</strong> has not been adopted yet.
            </span>
            <Button size="xs" onClick={() => setDialog("adopt")}>
              Adopt now
            </Button>
          </div>
        )}
        {overview?.adopted && hasUnmanaged && (
          <div className="banner banner-info">
            <FolderInput size={16} />
            <span>Unmanaged items found in the agent directory.</span>
            <Button size="xs" variant="outline" onClick={() => setDialog("import")}>
              Import
            </Button>
          </div>
        )}
        <Outlet />
      </main>
      <footer className="statusbar">
        <div>
          <span className="muted">Agent:</span>
          <code>~/.{agent}</code>
          <span className="statusbar-divider" />
          <span className="muted">Active Profile:</span>
          <span className="text-blue">{overview?.active ?? "—"}</span>
        </div>
        <div>
          <span>Skills:</span>
          <span className="text-cyan">{linkedCount} linked</span>
          <span className="statusbar-divider" />
          <span className={`status-dot ${overview ? "status-connected" : ""}`} />
          <span>{overview ? "Connected" : "No connection"}</span>
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
      <HarnessDialog />
    </div>
  );
}

function NotFound() {
  return (
    <>
      <PageHeading
        eyebrow="Navigation / Unknown route"
        title="Page Not Found"
        description="The requested view does not exist in this workspace."
      />
      <div className="empty-state">
        <Search />
        <h3>No matching view</h3>
        <Link to="/">Back to Dashboard</Link>
      </div>
    </>
  );
}
