import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import type { Agent } from "@/bindings";

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

type AgentContextValue = { agent: Agent; setAgent: (a: Agent) => void };
const AgentContext = createContext<AgentContextValue | null>(null);

export function AgentProvider({ children }: { children: ReactNode }) {
  const [agent, setAgentState] = useState<Agent>(savedAgent);

  const setAgent = useCallback((next: Agent) => {
    try {
      localStorage.setItem(AGENT_KEY, next);
    } catch {
      /* ignore */
    }
    setAgentState(next);
  }, []);

  return <AgentContext.Provider value={{ agent, setAgent }}>{children}</AgentContext.Provider>;
}

export function useAgent() {
  const value = useContext(AgentContext);
  if (!value) throw new Error("useAgent must be used within AgentProvider");
  return value;
}
