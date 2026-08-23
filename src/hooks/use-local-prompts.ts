"use client";

import { useEffect, useMemo, useRef } from "react";
import useSWR from "swr";
import { useAppStore } from "@/lib/store";
import { useUserArea } from "@/hooks/use-user-area";
import { useClientReady } from "@/hooks/use-client-ready";
import {
  buildAreaChatStarters,
  defaultChatStarters,
  type AreaNewsItem,
  type AreaSentimentSnapshot,
  type LocalNewsMapPin,
  type ChatStarter,
} from "@/lib/agent/chat-starters";
import { getOrCreateSessionId, logPromptExperiment } from "@/lib/agent/prompt-experiments";
import { DEFAULT_USER_AREA } from "@/lib/user-area";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function useLocalPrompts() {
  const clientReady = useClientReady();
  const { area, meta, loading: areaLoading, locationPromptsEnabled } = useUserArea();
  const newsPromptsEnabled = useAppStore((s) => s.newsPromptsEnabled);
  const setNewsPromptsEnabled = useAppStore((s) => s.setNewsPromptsEnabled);
  const browserLocationEnabled = useAppStore((s) => s.browserLocationEnabled);
  const setBrowserLocationEnabled = useAppStore((s) => s.setBrowserLocationEnabled);

  const newsUrl =
    newsPromptsEnabled && area.countyId
      ? `/api/news?county=${encodeURIComponent(area.countyId)}&limit=4`
      : null;

  const { data: newsData, isLoading: newsLoading } = useSWR<{
    data: AreaNewsItem[];
    sentiment?: AreaSentimentSnapshot | null;
    mapPins?: LocalNewsMapPin[];
  }>(newsUrl, fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 600_000,
  });

  const newsItems = newsData?.data ?? [];
  const newsSentiment = newsData?.sentiment ?? null;
  const newsMapPins = newsData?.mapPins ?? [];

  const sessionId = useMemo(
    () => (clientReady ? getOrCreateSessionId() : null),
    [clientReady]
  );

  const starters: ChatStarter[] = useMemo(() => {
    if (!locationPromptsEnabled) return defaultChatStarters();
    const starterArea = clientReady ? area : DEFAULT_USER_AREA;
    return buildAreaChatStarters(starterArea, {
      newsEnabled: newsPromptsEnabled,
      newsItems: clientReady ? newsItems : [],
      includeStatewide: clientReady && starterArea.source !== "default",
      sessionId,
    });
  }, [
    area,
    clientReady,
    locationPromptsEnabled,
    newsPromptsEnabled,
    newsItems,
    sessionId,
  ]);

  const loggedImpressions = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!clientReady) return;
    for (const s of starters) {
      if (!s.experiment || loggedImpressions.current.has(s.id)) continue;
      loggedImpressions.current.add(s.id);
      logPromptExperiment({
        experimentId: s.experiment.experimentId,
        variant: s.experiment.variant,
        action: "impression",
        starterId: s.id,
        areaId: area.countyId,
      });
      fetch("/api/prompt-experiments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          experimentId: s.experiment.experimentId,
          variant: s.experiment.variant,
          action: "impression",
          starterId: s.id,
          areaId: area.countyId,
        }),
      }).catch(() => {});
    }
  }, [starters, area.countyId, clientReady]);

  function trackStarterClick(starter: ChatStarter) {
    if (starter.experiment) {
      logPromptExperiment({
        experimentId: starter.experiment.experimentId,
        variant: starter.experiment.variant,
        action: "click",
        starterId: starter.id,
        areaId: area.countyId,
      });
      fetch("/api/prompt-experiments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          experimentId: starter.experiment.experimentId,
          variant: starter.experiment.variant,
          action: "click",
          starterId: starter.id,
          areaId: area.countyId,
        }),
      }).catch(() => {});
    }
  }

  return {
    starters,
    area,
    meta,
    newsItems,
    newsSentiment,
    newsMapPins,
    areaLoading,
    newsLoading: newsPromptsEnabled && newsLoading,
    newsPromptsEnabled,
    setNewsPromptsEnabled,
    browserLocationEnabled,
    setBrowserLocationEnabled,
    trackStarterClick,
    locationPromptsEnabled,
  };
}
