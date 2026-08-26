import { useCallback, useEffect, useRef, useState } from "react";
import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export type SourceStatusRow = {
  id: string;
  name: string;
  category: string;
  configured: boolean;
  publicFeed: boolean;
  lastFetchedAt: string | null;
  nextRefreshAt: string | null;
  stale: boolean;
  cacheKeysHit: number;
};

/** Poll source status and auto-refresh stale feeds in the background */
export function useSourceSync(options?: {
  autoRefresh?: boolean;
  pollMs?: number;
  /** Delay first auto-refresh so cold load isn't competing with map paint */
  autoRefreshDelayMs?: number;
}) {
  const autoRefresh = options?.autoRefresh ?? false;
  const pollMs = options?.pollMs ?? 120_000;
  const autoRefreshDelayMs = options?.autoRefreshDelayMs ?? 8_000;
  const refreshingRef = useRef(false);
  const autoRefreshRanRef = useRef(false);
  const [lastRefresh, setLastRefresh] = useState<string | null>(null);

  const { data, mutate, isLoading } = useSWR<{
    sources: SourceStatusRow[];
    agent: { provider: string; modelId: string };
  }>("/api/sources", fetcher, {
    refreshInterval: pollMs,
    revalidateOnFocus: false,
    isPaused: () => typeof document !== "undefined" && document.visibilityState === "hidden",
  });

  const refresh = useCallback(
    async (mode: "all" | "stale" | "selected" = "stale", sources?: string[]) => {
      if (refreshingRef.current) return null;
      refreshingRef.current = true;
      try {
        const res = await fetch("/api/sources", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mode, sources }),
        });
        const json = await res.json();
        setLastRefresh(json.refreshedAt ?? new Date().toISOString());
        await mutate();
        return json;
      } finally {
        refreshingRef.current = false;
      }
    },
    [mutate]
  );

  useEffect(() => {
    if (!autoRefresh || !data?.sources || autoRefreshRanRef.current) return;

    const timer = setTimeout(() => {
      if (document.visibilityState !== "visible") return;
      const hasStale = data.sources.some((s) => s.configured && (s.stale || !s.lastFetchedAt));
      if (hasStale) {
        autoRefreshRanRef.current = true;
        refresh("stale");
      }
    }, autoRefreshDelayMs);

    return () => clearTimeout(timer);
  }, [autoRefresh, autoRefreshDelayMs, data?.sources, refresh]);

  const staleCount =
    data?.sources.filter((s) => s.configured && (s.stale || !s.lastFetchedAt)).length ?? 0;

  return {
    sources: data?.sources ?? [],
    agent: data?.agent,
    isLoading,
    staleCount,
    lastRefresh,
    refresh,
    mutate,
  };
}
