import { useCallback, useEffect, useRef, useState } from "react";
import type { Agent, Overview } from "@/bindings";
import { agentApi } from "@/lib/agent-api";
import { errorMessage } from "@/lib/agent-result";

/**
 * Agent の現況を読むだけの hook。書き込み系の操作は持たない。
 * `reload` は失敗しても例外を投げず、自身の `error` に反映する。
 */
export function useAgentOverview(agent: Agent) {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const latestRequest = useRef(0);

  const reload = useCallback(async () => {
    const request = ++latestRequest.current;
    setLoading(true);
    try {
      const next = await agentApi.overview(agent);
      if (request !== latestRequest.current) return;
      setOverview(next);
      setError(null);
    } catch (cause) {
      if (request !== latestRequest.current) return;
      setError(errorMessage(cause));
    } finally {
      if (request === latestRequest.current) setLoading(false);
    }
  }, [agent]);

  useEffect(() => {
    void reload();
    return () => {
      latestRequest.current++;
    };
  }, [reload]);

  return { overview, loading, error, reload };
}
