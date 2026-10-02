export const profiles = [
  {
    name: "Frontend Specialist",
    tags: ["TypeScript", "React 19", "Tailwind v4", "Next.js 14"],
    skills: 12,
    hooks: 4,
    note: "Strict ESLint & Style",
  },
  {
    name: "Tech Lead & Code Reviewer",
    tags: ["Multi-repo", "Sec Scan", "Arch Rules", "Git-Diff"],
    skills: 16,
    hooks: 6,
    note: "Policy Enforcer",
  },
  {
    name: "Backend Python Engineer",
    tags: ["Python 3.12", "FastAPI", "PyTest", "SQLModel"],
    skills: 9,
    hooks: 3,
    note: "Async Performance",
  },
  {
    name: "Fullstack Rapid Prototyper",
    tags: ["Next.js App", "Supabase", "Claude Tools"],
    skills: 14,
    hooks: 2,
    note: "Relaxed Rules",
  },
];
export type Skill = {
  id: string;
  description: string;
  category: string;
  stack: string;
  source: string;
  target: string;
  status: "Mounted" | "Collision" | "Unlinked" | "Broken";
  enabled: boolean;
  matrix: boolean[];
};
export const initialSkills: Skill[] = [
  {
    id: "react-compiler-audit",
    description: "Analyzes component AST trees for React 19 compiler memoization safety.",
    category: "Analysis",
    stack: "Frontend",
    source: "~/.agent/library/skills/react-compiler.md",
    target: ".cursor/rules/react-compiler.mdc",
    status: "Mounted",
    enabled: true,
    matrix: [true, true, false, true],
  },
  {
    id: "web-search-enhanced",
    description: "Multi-engine markdown retrieval with rate-limit mitigation.",
    category: "Tools",
    stack: "Fullstack",
    source: "~/.agent/skills/brave.md",
    target: "~/.claude/skills/search",
    status: "Mounted",
    enabled: true,
    matrix: [true, true, true, true],
  },
  {
    id: "git-worktree-manager",
    description: "Scratchpad creation and worktree lifecycle orchestration for git tasks.",
    category: "Git / CLI",
    stack: "DevOps",
    source: "~/.agent/git-wt.sh",
    target: ".cursor/rules/worktree.mdc",
    status: "Mounted",
    enabled: true,
    matrix: [true, true, true, true],
  },
  {
    id: "tailwind-v4-migrator",
    description: "Converts configuration keys to native cascade CSS variables.",
    category: "UI",
    stack: "Frontend",
    source: "~/.agent/tailwind-v4.md",
    target: ".cursor/rules/styling.mdc",
    status: "Collision",
    enabled: true,
    matrix: [true, false, false, true],
  },
  {
    id: "vitest-tdd-runner",
    description: "Executes focused test suites and delivers distilled stack traces.",
    category: "Testing",
    stack: "Fullstack",
    source: "~/.agent/vitest.md",
    target: ".cursor/rules/vitest.mdc",
    status: "Unlinked",
    enabled: false,
    matrix: [false, true, false, true],
  },
  {
    id: "prisma-schema-lint",
    description: "Schema validator for shadow database sync and relation integrity.",
    category: "Database",
    stack: "Backend",
    source: "~/.agent/prisma.md",
    target: ".cursor/rules/prisma.mdc",
    status: "Mounted",
    enabled: true,
    matrix: [true, true, false, true],
  },
  {
    id: "python-type-checker",
    description: "MyPy / Pyright strict type enforcement via language server.",
    category: "Analysis",
    stack: "Backend",
    source: "~/.agent/pycheck.md",
    target: "~/.claude/skills/pycheck",
    status: "Broken",
    enabled: false,
    matrix: [false, true, true, false],
  },
  {
    id: "shadcn-component-forge",
    description: "Accessible component scaffolding and interface composition.",
    category: "UI",
    stack: "Frontend",
    source: "~/.agent/shadcn.md",
    target: ".cursor/rules/shadcn.mdc",
    status: "Mounted",
    enabled: true,
    matrix: [true, false, false, true],
  },
  {
    id: "fastapi-pydantic-v2",
    description: "Type-checked routing and OpenAPI specification generation.",
    category: "Tools",
    stack: "Backend",
    source: "~/.agent/fastapi.md",
    target: "~/.claude/skills/fastapi",
    status: "Unlinked",
    enabled: false,
    matrix: [false, true, true, true],
  },
  {
    id: "docker-compose-harness",
    description: "Local microservice stack coordination and health checks.",
    category: "Tools",
    stack: "DevOps",
    source: "~/.agent/docker.md",
    target: ".cursor/rules/docker.mdc",
    status: "Mounted",
    enabled: true,
    matrix: [false, true, true, true],
  },
];
export type Hook = {
  id: string;
  event: string;
  description: string;
  group: string;
  runtime: string;
  timeout: string;
  order: string;
  enabled: boolean;
  error?: string;
};
export const initialHooks: Hook[] = [
  {
    id: "pre-compact-memory",
    event: "pre-prompt-submit",
    description: "Prunes the context window before model transit.",
    group: "prompt",
    runtime: "Isolated POSIX",
    timeout: "500ms",
    order: "P0",
    enabled: true,
  },
  {
    id: "security-secret-scrubber",
    event: "post-tool-call",
    description: "Scans shell outputs and artifacts for exposed tokens.",
    group: "tool",
    runtime: "Node.js Sandbox",
    timeout: "2000ms",
    order: "P0",
    enabled: true,
  },
  {
    id: "auto-formatter-prettier",
    event: "on-file-write",
    description: "Instant syntax alignment when an agent edits code.",
    group: "file",
    runtime: "Native Binary",
    timeout: "300ms",
    order: "P10",
    enabled: true,
  },
  {
    id: "git-checkpoint-stash",
    event: "pre-destructive-tool",
    description: "Creates a checkpoint before destructive operations.",
    group: "tool",
    runtime: "Local Git Shell",
    timeout: "1200ms",
    order: "P10",
    enabled: true,
  },
  {
    id: "typecheck-validation-hook",
    event: "post-agent-edit",
    description: "Returns formatted TypeScript diagnostics to context.",
    group: "file",
    runtime: "Node.js IPC",
    timeout: "4500ms",
    order: "P20",
    enabled: false,
    error: "Syntax Error (L14)",
  },
  {
    id: "telemetry-audit-logger",
    event: "agent-complete",
    description: "Records tokens, duration, and file changes locally.",
    group: "prompt",
    runtime: "Async Daemon",
    timeout: "150ms",
    order: "P20",
    enabled: true,
  },
  {
    id: "error-recovery-escalator",
    event: "on-tool-failure",
    description: "Triggers fallback models and diagnostic retry strategies.",
    group: "error",
    runtime: "Subshell Exec",
    timeout: "800ms",
    order: "P0",
    enabled: true,
  },
];
export const initialTargets = [
  {
    name: "Project Local Cursor Rules",
    path: "~/work/acme-app/.cursor/rules",
    detail: "12 rules linked",
    healthy: true,
  },
  {
    name: "Claude Desktop Config",
    path: "~/.claude/commands/skills",
    detail: "6 skills linked",
    healthy: true,
  },
  {
    name: "Global Agent Harness",
    path: "~/.agent/harness/hooks",
    detail: "1 broken target",
    healthy: false,
  },
  {
    name: "Codex / Copilot Custom Rules",
    path: "~/work/acme-app/.github/prompts",
    detail: "6 rules linked",
    healthy: true,
  },
];
export const skillPayload = (skill: Skill) =>
  `---\ndescription: ${skill.description}\nglobs: ["**/*.tsx", "**/*.ts"]\n---\n\n# ${skill.id}\n\n1. Read workspace conventions before making changes.\n2. Keep edits focused and preserve existing behavior.\n3. Verify affected modules and report diagnostics.\n`;
