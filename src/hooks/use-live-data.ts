"use client";

import useSWR from "swr";
import type { DataProvenance } from "@/lib/types";

import type { JobsMeta } from "@/lib/jobs-errors";

const fetcher = async (url: string) => {
  const res = await fetch(url);
  const payload = await res.json();
  if (!res.ok) {
    const message =
      payload?.meta?.userMessage ??
      payload?.error ??
      `API error ${res.status}`;
    throw new Error(message);
  }
  return payload;
};

export function useEconomyData() {
  return useSWR<{
    data: {
      statewide: import("@/lib/types").StatewideStats;
      counties: import("@/lib/types").CountyEconomy[];
      metros: import("@/lib/types").MetroRegion[];
      unemploymentTrend: { month: string; wi: number; us: number | null }[];
      industryBreakdown: { name: string; value: number; growth: number; employment?: number }[];
      unemploymentByFips?: Record<string, number>;
      countyLabelsByFips?: Record<string, string>;
      rawSources?: Record<string, unknown>;
    };
    provenance: DataProvenance;
  }>("/api/economy", fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 60_000,
  });
}

/** Home map only — tiny response, single upstream fetch. */
export function useMapEconomySeed() {
  return useSWR<{
    data: {
      unemploymentByFips: Record<string, number>;
      countyLabelsByFips: Record<string, string>;
      populationByFips?: Record<string, number>;
      populationEstimateByFips?: Record<string, boolean>;
      laborForceByFips?: Record<string, number>;
      medianIncomeByFips?: Record<string, number>;
    };
  }>("/api/economy/map", fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 300_000,
    keepPreviousData: true,
  });
}

export function useJobsData(params: Record<string, string | undefined> = {}) {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => v && qs.set(k, v));
  const url = `/api/jobs${qs.toString() ? `?${qs}` : ""}`;
  return useSWR<{
    data: import("@/lib/types").Job[];
    provenance: DataProvenance;
    count: number;
    meta?: JobsMeta;
  }>(url, fetcher, { revalidateOnFocus: false });
}

export function useTransitData(origin?: string, destination?: string) {
  const qs = new URLSearchParams();
  if (origin) qs.set("origin", origin);
  if (destination) qs.set("destination", destination);
  return useSWR<{
    data: {
      origin: { address: string; coordinates: { lat: number; lng: number }; label: string };
      routes: import("@/lib/types").TransitRoute[];
      alerts: { id: string; agency: string; severity: string; title: string; description: string; expiresAt: string | null }[];
      agencies: { id: string; name: string; url: string; stopCount: number; routeCount: number; center: { lat: number; lng: number } }[];
      stops: { id: string; name: string; lat: number; lng: number; agency: string }[];
      routeInventory: { id: string; shortName: string; longName: string; color: string; agency: string }[];
      stats: { totalStops: number; totalRoutes: number; agencies: number };
    };
    provenance: DataProvenance;
  }>(`/api/transit?${qs}`, fetcher, { revalidateOnFocus: false });
}
