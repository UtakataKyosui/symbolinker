import { createContext, useCallback, useContext, useState, type ReactNode } from "react";

export type DialogKind = "adopt" | "import" | "new-profile";

type UIStateContextValue = {
  dialog: DialogKind | null;
  setDialog: (d: DialogKind | null) => void;
  notice: string;
  setNotice: (msg: string) => void;
  query: string;
  setQuery: (q: string) => void;
};

const UIStateContext = createContext<UIStateContextValue | null>(null);

export function UIStateProvider({ children }: { children: ReactNode }) {
  const [dialog, setDialog] = useState<DialogKind | null>(null);
  const [notice, setNoticeState] = useState("");
  const [query, setQuery] = useState("");

  const setNotice = useCallback((msg: string) => {
    setNoticeState(msg);
    if (msg) {
      const id = setTimeout(() => setNoticeState(""), 4000);
      return () => clearTimeout(id);
    }
  }, []);

  return (
    <UIStateContext.Provider value={{ dialog, setDialog, notice, setNotice, query, setQuery }}>
      {children}
    </UIStateContext.Provider>
  );
}

export function useUIState() {
  const value = useContext(UIStateContext);
  if (!value) throw new Error("useUIState must be used within UIStateProvider");
  return value;
}
