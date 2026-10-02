import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { initialHooks, initialSkills, initialTargets, profiles } from "@/lib/harness-data";
import { applyProfile, restorePreviewState, setSkillEnabled } from "@/lib/harness-state";

export type DialogKind = "apply" | "target" | "hook";

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

function useHarnessState() {
  const [skills, setSkills] = useSavedState("skills", initialSkills);
  const [hooks, setHooks] = useSavedState("hooks", initialHooks);
  const [profileName, setProfileName] = useSavedState("profile", profiles[0].name);
  const activeProfile = profiles.find((p) => p.name === profileName) ?? profiles[0];
  const [targets, setTargets] = useSavedState("targets", initialTargets);
  const [root, setRoot] = useSavedState("root", "~/work/acme-app");
  const [vault, setVault] = useSavedState("vault", "~/.agent/skills");
  const [autoSync, setAutoSync] = useSavedState("autoSync", true);
  const [strictMode, setStrictMode] = useSavedState("strictMode", true);
  const [query, setQuery] = useState("");
  const [notice, setNotice] = useState("");
  const [dialog, setDialog] = useState<DialogKind | null>(null);
  const [audit, setAudit] = useState([
    "LINK_CREATE  tailwind-v4-expert.md → .cursor/rules/tailwind.mdc",
    "PROFILE_SELECT  Frontend Specialist (+5 skills, -2 hooks)",
    "CONFLICT_WARN  jest-runner superseded by vitest-agent",
    "FS_WATCHER  Initial tree scan completed for 4 targets",
  ]);
  const linked = skills.filter((s) => s.enabled && s.status === "Mounted").length;
  const broken = skills.filter((s) => s.status === "Broken").length;
  const enabledHooks = hooks.filter((h) => h.enabled).length;

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(""), 4000);
    return () => clearTimeout(timer);
  }, [notice]);

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
  function rescan() {
    setNotice(
      `Demo scan: ${skills.length} definitions, ${broken} broken target. Filesystem is not connected.`,
    );
  }

  return {
    skills,
    setSkills,
    hooks,
    setHooks,
    targets,
    setTargets,
    activeProfile,
    root,
    setRoot,
    vault,
    setVault,
    autoSync,
    setAutoSync,
    strictMode,
    setStrictMode,
    query,
    setQuery,
    notice,
    setNotice,
    dialog,
    setDialog,
    audit,
    linked,
    broken,
    enabledHooks,
    chooseProfile,
    toggleSkill,
    rescan,
  };
}

const HarnessContext = createContext<ReturnType<typeof useHarnessState> | null>(null);

export function HarnessProvider({ children }: { children: ReactNode }) {
  return <HarnessContext.Provider value={useHarnessState()}>{children}</HarnessContext.Provider>;
}

export function useHarness() {
  const value = useContext(HarnessContext);
  if (!value) throw new Error("useHarness must be used within HarnessProvider");
  return value;
}
