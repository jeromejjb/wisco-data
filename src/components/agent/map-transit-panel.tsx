"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { Bus, Radio } from "lucide-react";
import { AnswerCard, AnswerSectionHeader } from "@/components/agent/answer-panel-chrome";
import { TransitDetailSheet } from "@/components/transit/transit-detail-sheet";
import type { TransitMapSelection } from "@/components/transit/transit-map";
import { useTransitMapData } from "@/hooks/use-transit-map-data";
import { agencyIdFromMetro } from "@/lib/transit-agencies";
import { Skeleton } from "@/components/ui/states";

const TransitMap = dynamic(
  () => import("@/components/transit/transit-map").then((m) => m.TransitMap),
  { ssr: false, loading: () => <Skeleton className="h-[220px] w-full rounded-xl" /> }
);

type MapTransitPanelProps = {
  metro?: "milwaukee" | "madison" | "both";
};

export function MapTransitPanel({ metro }: MapTransitPanelProps) {
  const agency = agencyIdFromMetro(metro);
  const fetchAgency = agency === "all" ? "mcts" : agency;
  const [selection, setSelection] = useState<TransitMapSelection | null>(null);

  const { data, isLoading } = useTransitMapData({
    agency: fetchAgency,
    pollRealtime: true,
  });

  const transit = data?.data;
  const stats = useMemo(
    () => ({
      totalStops: transit?.stops.length,
      routeShapes: transit?.shapes.length,
      liveVehicles: transit?.vehicles.length,
    }),
    [transit]
  );

  if (isLoading && !transit) {
    return (
      <AnswerCard>
        <AnswerSectionHeader label="Transit map" />
        <Skeleton className="mx-4 mb-4 h-[220px] rounded-xl" />
      </AnswerCard>
    );
  }

  if (!transit) return null;

  return (
    <AnswerCard className="overflow-hidden">
      <AnswerSectionHeader
        label="Transit map"
        meta={
          <span className="flex items-center gap-2 text-[10px] text-white/45">
            <Radio className="h-3 w-3" />
            {transit.vehicles.length} live
            <Bus className="ml-1 h-3 w-3" />
            {transit.shapes.length} routes
          </span>
        }
      />
      <div className="px-3 pb-3">
        <TransitMap
          center={transit.mapCenter}
          zoom={transit.mapZoom}
          shapes={transit.shapes}
          stops={transit.stops.slice(0, 200)}
          vehicles={transit.vehicles}
          selectedId={selection?.item.id}
          onSelect={setSelection}
          className="min-h-[220px] rounded-xl"
        />
        <div className="mt-3 lg:hidden">
          <TransitDetailSheet
            selection={selection}
            alerts={transit.alerts}
            stats={stats}
            onClose={() => setSelection(null)}
          />
        </div>
        <div className="mt-3 hidden lg:block">
          <TransitDetailSheet
            selection={selection}
            alerts={[]}
            stats={stats}
            onClose={() => setSelection(null)}
          />
        </div>
      </div>
    </AnswerCard>
  );
}
