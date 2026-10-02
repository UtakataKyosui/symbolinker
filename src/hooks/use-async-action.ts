import { useCallback, useRef, useState } from "react";
import { errorMessage } from "@/lib/agent-result";

/**
 * 非同期処理 1 つ分の実行状態(pending / error)だけを持つ。
 * 他の hook や画面の状態は変更しない。
 */
export function useAsyncAction<A extends unknown[]>(action: (...args: A) => Promise<void>) {
  const latest = useRef(action);
  latest.current = action;

  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(async (...args: A): Promise<boolean> => {
    setPending(true);
    setError(null);
    try {
      await latest.current(...args);
      return true;
    } catch (cause) {
      setError(errorMessage(cause));
      return false;
    } finally {
      setPending(false);
    }
  }, []);

  const reset = useCallback(() => setError(null), []);

  return { run, pending, error, reset };
}
