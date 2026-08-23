"use client";

import useSWR from "swr";
import type { DataProvenance } from "@/lib/types";
import type { TransitAgencyId } from "@/lib/transit-agencies";
import type {
  TransitMapStop,
  TransitRouteShape,
  TransitServiceAlert,
  TransitVehicle,
} from "@/lib/transit-types";
import type { TransitRoute } from "@/lib/types";

const fetcher = async (url: string) => {
  const res = await fetch(url);
  const payload = await res.json();
  if (!res.ok) throw new Error(payload?.error ?? `API error ${res.status}`);
  return payload;
};

export type TransitAgencySummary = {
  id: TransitAgencyId;
  name: string;
  url: string;
  stopCount: number;
  routeCount: number;
  center: { lat: number; lng: number };
  hasRealtime?: boolean;
};

export type TransitApiPayload = {
  data: {
    origin: { address: string; coordinates: { lat: number; lng: number }; label: string };
    routes: TransitRoute[];
    alerts: TransitServiceAlert[];
    agencies: TransitAgencySummary[];
    allAgencies?: TransitAgencySummary[];
    stops: TransitMapStop[];
    routeInventory: {
      id: string;
      routeId: string;
      shortName: string;
      longName: string;
      color: string;
      agencyId: TransitAgencyId;
      agency: string;
    }[];
    shapes: TransitRouteShape[];
    vehicles: TransitVehicle[];
    stats: {
      totalStops: number;
      totalRoutes: number;
      agencies: number;
      liveVehicles?: number;
      routeShapes?: number;
    };
    mapCenter: { lat: number; lng: number };
    mapZoom: number;
    activeAgencyId: TransitAgencyId;
  };
  provenance: DataProvenance;
};

export function useTransitMapData(opts?: {
  agency?: TransitAgencyId | "all";
  origin?: string;
  destination?: string;
  pollRealtime?: boolean;
}) {
  const qs = new URLSearchParams();
  if (opts?.origin) qs.set("origin", opts.origin);
  if (opts?.destination) qs.set("destination", opts.destination);
  if (opts?.agency) qs.set("agency", opts.agency);

  return useSWR<TransitApiPayload>(`/api/transit?${qs}`, fetcher, {
    revalidateOnFocus: false,
    refreshInterval: opts?.pollRealtime ? 20_000 : 0,
    dedupingInterval: 15_000,
  });
}
