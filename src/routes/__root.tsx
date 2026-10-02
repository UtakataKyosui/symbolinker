import { useEffect, useRef, useState } from "react";
import { Link, Outlet, createRootRoute, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  Box,
  CircleCheck,
  Folder,
  Grid2X2,
  Link as LinkIcon,
  Menu,
  RefreshCw,
  Search,
  Settings,
  SlidersHorizontal,
  User,
  Workflow,
  X,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { HarnessDialog } from "@/components/harness/harness-dialog";
import { PageHeading, Status } from "@/components/harness/primitives";
import { HarnessProvider, useHarness } from "@/lib/harness-context";

export const Route = createRootRoute({
  component: RootLayout,
  notFoundComponent: NotFound,
});

const navigation = [
  {
    group: "Overview",
    items: [{ to: "/", label: "Dashboard & Targets", icon: Grid2X2 }],
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
      { to: "/profiles", label: "Profiles & Matrix", icon: SlidersHorizontal },
      { to: "/inspector", label: "Symlink Inspector", icon: LinkIcon },
    ],
  },
] as const;
const searchablePaths = ["/skills", "/hooks", "/inspector"];

function RootLayout() {
  return (
    <HarnessProvider>
      <AppShell />
    </HarnessProvider>
  );
}

function AppShell() {
  const {
    skills,
    hooks,
    vault,
    root,
    activeProfile,
    linked,
    broken,
    query,
    setQuery,
    notice,
    setNotice,
  } = useHarness();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

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
                if (!searchablePaths.includes(pathname)) void navigate({ to: "/skills" });
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
                      <Status>{linked} active</Status>
                    ) : item.to === "/skills" || item.to === "/hooks" ? (
                      <span className="nav-count">
                        {item.to === "/skills" ? skills.length : hooks.length}
                      </span>
                    ) : null}
                  </Link>
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
          <Link
            to="/settings"
            className="nav-item"
            activeProps={{ className: "nav-active" }}
            onClick={() => setQuery("")}
          >
            <Settings />
            <span>Workspace Settings</span>
          </Link>
        </div>
      </aside>
      <main className="main-stage">
        <Outlet />
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
