"use client";

import { useEffect } from "react";
import { useMapSession } from "@/components/agent/map-session-provider";
import { useMapStore } from "@/lib/map-store";
import type { AreaSentimentSnapshot, LocalNewsMapPin } from "@/lib/news-types";

type MapLocalNewsBridgeProps = {
  mapPins: LocalNewsMapPin[];
  sentiment: AreaSentimentSnapshot | null;
  enabled: boolean;
};

/** Pushes local news pins + area sentiment onto the map store when toggled on. */
export function MapLocalNewsBridge({ mapPins, sentiment, enabled }: MapLocalNewsBridgeProps) {
  const setLocalNewsLayer = useMapStore((s) => s.setLocalNewsLayer);
  const clearLocalNewsLayer = useMapStore((s) => s.clearLocalNewsLayer);

  useEffect(() => {
    if (!enabled) {
      clearLocalNewsLayer();
      return;
    }
    if (mapPins.length || sentiment) {
      setLocalNewsLayer(mapPins, sentiment);
    } else {
      clearLocalNewsLayer();
    }
    return () => clearLocalNewsLayer();
  }, [enabled, mapPins, sentiment, setLocalNewsLayer, clearLocalNewsLayer]);

  return null;
}

/** Reads news bundle from session when available (workspace uses props variant above). */
export function MapLocalNewsBridgeFromSession() {
  const { newsPromptsEnabled, newsMapPins, newsSentiment } = useMapSession();
  return (
    <MapLocalNewsBridge
      enabled={newsPromptsEnabled}
      mapPins={newsMapPins}
      sentiment={newsSentiment}
    />
  );
}
