"use client";

import { useEffect, useMemo, useRef } from "react";
import useSWR from "swr";
import { useAppStore } from "@/lib/store";
import { useUserArea } from "@/hooks/use-user-area";
import {
  buildAreaChatStarters,
  defaultChatStarters,
  type AreaNewsItem,
  type AreaSentimentSnapshot,
  type LocalNewsMapPin,
  type ChatStarter,
} from "@/lib/agent/chat-starters";
import { logPromptExperiment } from "@/lib/agent/prompt-experiments";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function useLocalPrompts() {
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

  const starters: ChatStarter[] = useMemo(() => {
    if (!locationPromptsEnabled) return defaultChatStarters();
    return buildAreaChatStarters(area, {
      newsEnabled: newsPromptsEnabled,
      newsItems,
      includeStatewide: area.source !== "default",
    });
  }, [area, locationPromptsEnabled, newsPromptsEnabled, newsItems]);

  const loggedImpressions = useRef<Set<string>>(new Set());

  useEffect(() => {
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
  }, [starters, area.countyId]);

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
