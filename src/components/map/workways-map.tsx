"use client";

import dynamic from "next/dynamic";
import type { Coordinates } from "@/lib/types";
import type { ChoroplethMetric } from "@/lib/agent/map-actions";
import { Skeleton } from "@/components/ui/states";

const RealMap = dynamic(() => import("./real-map"), {
  ssr: false,
  loading: () => <Skeleton className="h-full min-h-[300px] w-full rounded-2xl" />,
});

export type MapMarker = {
  id: string;
  coordinates: Coordinates;
  label?: string;
  color?: string;
  selected?: boolean;
};

export type MapProps = {
  center?: Coordinates;
  zoom?: number;
  markers?: MapMarker[];
  className?: string;
  onMarkerClick?: (id: string) => void;
  showControls?: boolean;
  interactive?: boolean;
  choroplethMetric?: ChoroplethMetric | null;
  choroplethValues?: Record<string, number>;
};

/** Real MapLibre map — works without API keys (OpenFreeMap) or with Mapbox token for premium layers */
export function WorkwaysMap(props: MapProps) {
  return <RealMap {...props} />;
}

export type { MapMarker as MapMarkerType };
