import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { getDesk } from "@/lib/nexus/server";
import type { PlatformId } from "@/lib/nexus/platforms";

export type DeskProfile = {
  displayName: string;
  bio: string;
  handle: string;
  theme: "paper" | "ink";
  email: string;
};

export type DeskConnection = {
  id: string;
  platform: PlatformId;
  handle: string;
  displayName: string;
  instance: string;
  mode: string;
  status: string;
  lastError: string;
  lastSyncedAt: string | null;
};

type DeskState = {
  profile: DeskProfile;
  connections: DeskConnection[];
  counts: { feed: number; scheduled: number; inbox: number; drafts: number };
};

type DeskContextValue = {
  desk: DeskState | null;
  loading: boolean;
  error: string;
  refresh: () => Promise<void>;
};

const DeskContext = createContext<DeskContextValue | null>(null);

export function DeskProvider({ children }: { children: ReactNode }) {
  const [desk, setDesk] = useState<DeskState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    try {
      const next = await getDesk();
      setDesk(next);
      setError("");
      document.documentElement.dataset.theme = next.profile.theme;
      localStorage.setItem("nx-theme", next.profile.theme);
    } catch (err) {
      setError(err instanceof Error ? err.message : "The desk could not load.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return <DeskContext.Provider value={{ desk, loading, error, refresh }}>{children}</DeskContext.Provider>;
}

export function useDesk() {
  const ctx = useContext(DeskContext);
  if (!ctx) throw new Error("Desk is not ready");
  return ctx;
}
