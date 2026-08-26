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
import { MapA11yAnnouncer } from "@/components/a11y/map-a11y-announcer";
import { MapCountyPanel } from "@/components/agent/map-county-panel";
import { MapAreaSentiment } from "@/components/agent/map-area-sentiment";
import { useMapStore } from "@/lib/map-store";
import { preloadCountiesGeoJson } from "@/lib/wi-counties-geojson";
import { preloadStateOutlineGeoJson } from "@/lib/wi-state-outline";

const AgentMap = dynamic(
  () => import("@/components/map/agent-map").then((m) => m.AgentMap),
  {
    ssr: false,
    loading: () => <div className="absolute inset-0 bg-[#e8eef4] dark:bg-[#070b14]" aria-hidden />,
  }
);

function WorkspaceMapOverlays() {
  return (
    <>
      <MapLocalNewsBridgeFromSession />
      <MapAreaSentiment />
    </>
  );
}

function WorkspaceInner() {
  const { data: seed, isLoading } = useMapEconomySeed();
  const { area, loading: areaLoading } = useUserArea();
  const applyActions = useMapStore((s) => s.applyActions);
  const setMapDemographics = useMapStore((s) => s.setMapDemographics);
  const seededRef = useRef(false);
  const lastAreaCountyRef = useRef<string | null>(null);
  const [dataReady, setDataReady] = useState(false);

  useEffect(() => {
    preloadCountiesGeoJson();
    preloadStateOutlineGeoJson();
  }, []);

  useEffect(() => {
    if (areaLoading) return;
    if (area.source === "default") return;
    if (lastAreaCountyRef.current === area.countyId) return;
    lastAreaCountyRef.current = area.countyId;
    applyActions([
      {
        type: "flyTo",
        center: { lat: area.lat, lng: area.lng },
        zoom: 8.35,
        pitch: 18,
      },
    ]);
  }, [area.countyId, area.lat, area.lng, area.source, areaLoading, applyActions]);

  useEffect(() => {
    if (seededRef.current) return;
    const byFips = seed?.data?.unemploymentByFips;
    if (!byFips || Object.keys(byFips).length === 0) return;

    seededRef.current = true;
    setDataReady(true);
    setMapDemographics({
      unemploymentByFips: byFips,
      populationByFips: seed.data.populationByFips,
      populationEstimateByFips: seed.data.populationEstimateByFips,
      laborForceByFips: seed.data.laborForceByFips,
      medianIncomeByFips: seed.data.medianIncomeByFips,
    });
    applyActions([
      {
        type: "setChoropleth",
        metric: "unemployment",
        values: byFips,
        labels: seed.data.countyLabelsByFips ?? {},
      },
    ]);
  }, [seed, applyActions, setMapDemographics]);

  return (
    <div
      className="fixed inset-0 z-0 h-dvh w-full overflow-hidden bg-[#e8eef4] dark:bg-[#070b14]"
      role="region"
      aria-label="Wisconsin Workways map"
    >
      <AgentMap className="absolute inset-0 h-full w-full" immersive defaultStyleId="streets" />
      <MapA11yAnnouncer />
      <WorkspaceLogo />
      <MapCountyPanel />
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
