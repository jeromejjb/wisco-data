"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { MapChatWidget } from "@/components/agent/map-chat-widget";
import { MapAnswerStack } from "@/components/agent/map-answer-stack";
import { MapSessionProvider } from "@/components/agent/map-session-provider";
import { WorkspaceLogo } from "@/components/workspace/workspace-logo";
import { useMapEconomySeed } from "@/hooks/use-live-data";
import { DataGatheringLoader } from "@/components/ui/data-gathering-loader";
import { messagesForContext } from "@/lib/loading-messages";
import { useUserArea } from "@/hooks/use-user-area";
import { MapLocalNewsBridgeFromSession } from "@/components/agent/map-local-news-bridge";
import { MapAreaSentiment } from "@/components/agent/map-area-sentiment";
import { useMapStore } from "@/lib/map-store";
import { preloadCountiesGeoJson } from "@/lib/wi-counties-geojson";

const AgentMap = dynamic(
  () => import("@/components/map/agent-map").then((m) => m.AgentMap),
  {
    ssr: false,
    loading: () => <div className="absolute inset-0 bg-[#e8eef4]" aria-hidden />,
  }
);

function WorkspaceMapOverlays() {
  const areaSentiment = useMapStore((s) => s.areaSentiment);
  return (
    <>
      <MapLocalNewsBridgeFromSession />
      <MapAreaSentiment sentiment={areaSentiment} />
    </>
  );
}

function WorkspaceInner() {
  const { data: seed, isLoading } = useMapEconomySeed();
  const { area, loading: areaLoading } = useUserArea();
  const applyActions = useMapStore((s) => s.applyActions);
  const seededRef = useRef(false);
  const areaFramedRef = useRef(false);
  const [dataReady, setDataReady] = useState(false);

  useEffect(() => {
    preloadCountiesGeoJson();
  }, []);

  useEffect(() => {
    if (areaFramedRef.current || areaLoading) return;
    areaFramedRef.current = true;
    applyActions([
      {
        type: "flyTo",
        center: { lat: area.lat, lng: area.lng },
        zoom: area.source === "default" ? 7.95 : 8.35,
        pitch: 30,
      },
    ]);
  }, [area, areaLoading, applyActions]);

  useEffect(() => {
    if (seededRef.current) return;
    const byFips = seed?.data?.unemploymentByFips;
    if (!byFips || Object.keys(byFips).length === 0) return;

    seededRef.current = true;
    setDataReady(true);
    applyActions([
      {
        type: "setChoropleth",
        metric: "unemployment",
        values: byFips,
        labels: seed.data.countyLabelsByFips ?? {},
      },
    ]);
  }, [seed, applyActions]);

  return (
    <div className="fixed inset-0 z-0 h-dvh w-full overflow-hidden bg-[#e8eef4]">
      <AgentMap className="absolute inset-0 h-full w-full" immersive defaultStyleId="streets" />
      <WorkspaceLogo />
      <MapAnswerStack />
      <WorkspaceMapOverlays />
      {!dataReady && isLoading && (
        <div className="pointer-events-none absolute left-1/2 top-[18%] z-10 w-[min(340px,calc(100vw-2rem))] -translate-x-1/2">
          <DataGatheringLoader
            messages={messagesForContext("map-seed")}
            variant="pill"
            subtitle="Wisconsin counties and unemployment layers are loading"
          />
        </div>
      )}
      <MapChatWidget />
    </div>
  );
}

export function WorkwaysWorkspace() {
  return (
    <MapSessionProvider>
      <WorkspaceInner />
    </MapSessionProvider>
  );
}
