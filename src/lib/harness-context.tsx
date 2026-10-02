import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { Agent, Kind, Overview, Profile } from "@/bindings";
import { agentApi } from "@/lib/agent-api";

export type DialogKind = "adopt" | "import" | "new-profile";

type HarnessContextValue = {
  agent: Agent;
  setAgent: (agent: Agent) => void;
  overview: Overview | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  adopt: () => Promise<void>;
  importUnmanaged: () => Promise<void>;
  saveProfile: (profile: Profile) => Promise<void>;
  activateProfile: (name: string) => Promise<void>;
  deleteProfile: (name: string) => Promise<void>;
  unlinkKind: (kind: Kind) => Promise<void>;
  query: string;
  setQuery: (q: string) => void;
  notice: string;
  setNotice: (msg: string) => void;
  dialog: DialogKind | null;
  setDialog: (d: DialogKind | null) => void;
};

const AGENT_KEY = "harness:agent";

function savedAgent(): Agent {
  try {
    const v = localStorage.getItem(AGENT_KEY);
    if (v === "claude" || v === "codex") return v;
  } catch {
    /* storage unavailable */
  }
  return "claude";
}

function useHarnessState(): HarnessContextValue {
  const [agent, setAgentState] = useState<Agent>(savedAgent);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const agentRef = useRef(agent);
  useEffect(() => {
    agentRef.current = agent;
  }, [agent]);

  const [query, setQuery] = useState("");
  const [notice, setNoticeState] = useState("");
  const [dialog, setDialog] = useState<DialogKind | null>(null);

  const setNotice = useCallback((msg: string) => {
    setNoticeState(msg);
    if (msg) {
      const id = setTimeout(() => setNoticeState(""), 4000);
      return () => clearTimeout(id);
    }
  }, []);

  const refresh = useCallback(async () => {
    const requested = agent;
    setLoading(true);
    setError(null);
    try {
      const ov = await agentApi.overview(requested);
      if (agentRef.current === requested) setOverview(ov);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [agent]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const setAgent = useCallback((next: Agent) => {
    try {
      localStorage.setItem(AGENT_KEY, next);
    } catch {
      /* ignore */
    }
    setAgentState(next);
    setOverview(null);
  }, []);

  const mutate = useCallback(
    async (action: () => Promise<void>) => {
      const requested = agent;
      setLoading(true);
      setError(null);
      try {
        await action();
        const ov = await agentApi.overview(requested);
        if (agentRef.current === requested) setOverview(ov);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setLoading(false);
      }
    },
    [agent],
  );

  const adopt = useCallback(() => mutate(() => agentApi.adopt(agent)), [agent, mutate]);
  const importUnmanaged = useCallback(
    () => mutate(() => agentApi.importUnmanaged(agent)),
    [agent, mutate],
  );
  const saveProfile = useCallback(
    (profile: Profile) => mutate(() => agentApi.saveProfile(agent, profile)),
    [agent, mutate],
  );
  const activateProfile = useCallback(
    (name: string) => mutate(() => agentApi.activateProfile(agent, name)),
    [agent, mutate],
  );
  const deleteProfile = useCallback(
    (name: string) => mutate(() => agentApi.deleteProfile(agent, name)),
    [agent, mutate],
  );
  const unlinkKind = useCallback(
    (kind: Kind) => mutate(() => agentApi.unlinkKind(agent, kind)),
    [agent, mutate],
  );

  return {
    agent,
    setAgent,
    overview,
    loading,
    error,
    refresh,
    adopt,
    importUnmanaged,
    saveProfile,
    activateProfile,
    deleteProfile,
    unlinkKind,
    query,
    setQuery,
    notice,
    setNotice,
    dialog,
    setDialog,
  };
}

const HarnessContext = createContext<HarnessContextValue | null>(null);

export function HarnessProvider({ children }: { children: ReactNode }) {
  return <HarnessContext.Provider value={useHarnessState()}>{children}</HarnessContext.Provider>;
}

export function useHarness() {
  const value = useContext(HarnessContext);
  if (!value) throw new Error("useHarness must be used within HarnessProvider");
  return value;
}
