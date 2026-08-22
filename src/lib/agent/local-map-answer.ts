import type { MapAction } from "./map-actions";
import type { CountyFocusSnapshot } from "@/lib/map-county-metrics";
import {
  buildCountyFocus,
  choroplethFromCounties,
  headlineForCountyMetric,
} from "@/lib/map-county-metrics";
import type { CountyEconomy } from "@/lib/types";

import type { MapQueryIntent } from "./map-query-intent";

export type MapJobHit = {
  id: string;
  title: string;
  employer: string;
  city: string;
  payLabel?: string;
  transitAccessible: boolean;
  commuteMinutes?: number;
  applicationUrl?: string;
};

export type LocalMapAnswer = {
  headline: string;
  subline?: string;
  jobs: MapJobHit[];
  stats: {
    total: number;
    transitCount: number;
    liveCount?: number;
  };
  transitNote?: string;
  mapActions: MapAction[];
  source: "live-fallback";
  countyFocus?: CountyFocusSnapshot;
};

function payLabel(job: {
  payMin?: number;
  payMax?: number;
  payType: string;
}): string | undefined {
  if (!job.payMin && !job.payMax) return undefined;
  const val = job.payMin ?? job.payMax!;
  if (job.payType === "hourly") return `$${val.toFixed(0)}/hr`;
  return `$${Math.round(val / 1000)}k/yr`;
}

export async function buildLocalMapAnswer(intent: MapQueryIntent): Promise<LocalMapAnswer | null> {
  const actions: MapAction[] = [];
  let jobs: MapJobHit[] = [];
  let liveCount = 0;
  let metaMessage: string | undefined;
  let countyFocus: CountyFocusSnapshot | undefined;

  if (intent.searchJobs) {
    try {
      const qs = new URLSearchParams();
      if (intent.searchJobs.keyword) qs.set("q", intent.searchJobs.keyword);
      if (intent.searchJobs.transitOnly) qs.set("transit", "true");
      if (intent.searchJobs.maxCommute) qs.set("maxCommute", String(intent.searchJobs.maxCommute));
      qs.set("rank", "true");

      const res = await fetch(`/api/jobs?${qs}`);
      const payload = (await res.json()) as {
        data: {
          id: string;
          title: string;
          employer: string;
          applicationUrl?: string;
          location: { city: string; coordinates: { lat: number; lng: number } };
          transitAccessible?: boolean;
          payMin?: number;
          payMax?: number;
          payType: string;
          commute?: { durationMinutes: number };
        }[];
        meta?: { liveCount?: number; userMessage?: string; status?: string };
      };

      if (res.ok) {
        liveCount = payload.meta?.liveCount ?? payload.data.length;
        metaMessage = payload.meta?.userMessage;
        const raw = payload.data.slice(0, 15);

        jobs = raw.map((j) => ({
          id: j.id,
          title: j.title,
          employer: j.employer,
          city: j.location.city,
          payLabel: payLabel(j),
          transitAccessible: Boolean(j.transitAccessible),
          commuteMinutes: j.commute?.durationMinutes,
          applicationUrl: j.applicationUrl,
        }));

        if (intent.searchJobs?.maxCommute && !intent.searchJobs.transitOnly) {
          jobs.sort((a, b) => Number(b.transitAccessible) - Number(a.transitAccessible));
        }

        if (raw.length) {
          actions.push({
            type: "setMarkers",
            markers: raw.map((j) => ({
              id: j.id,
              coordinates: j.location.coordinates,
              label: `${j.title} · ${j.employer}`,
              color: j.transitAccessible ? "#1e6b9c" : "#d4824a",
            })),
          });
          const avgLat = raw.reduce((s, j) => s + j.location.coordinates.lat, 0) / raw.length;
          const avgLng = raw.reduce((s, j) => s + j.location.coordinates.lng, 0) / raw.length;
          actions.push({
            type: "flyTo",
            center: { lat: avgLat, lng: avgLng },
            zoom: intent.searchJobs.transitOnly ? 10.5 : 9,
            pitch: 32,
          });
        }
      }
    } catch {
      /* continue with other layers */
    }
  }

  if (intent.metric) {
    try {
      const res = await fetch("/api/economy");
      if (res.ok) {
        const payload = (await res.json()) as { data: { counties: CountyEconomy[] } };
        const counties = payload.data.counties ?? [];
        const { values, labels } = choroplethFromCounties(intent.metric, counties);
        actions.push({
          type: "setChoropleth",
          metric: intent.metric,
          values,
          labels,
        });

        const focusId =
          intent.flyToCountyId ??
          intent.highlightCountyIds?.[0] ??
          undefined;
        if (focusId) {
          countyFocus = buildCountyFocus(counties, focusId, intent.metric) ?? undefined;
          actions.push({ type: "highlightCounties", countyIds: [focusId] });
        }
      }
    } catch {
      /* ignore */
    }
  }

  if (intent.highlightCountyIds?.length && !intent.metric) {
    actions.push({ type: "highlightCounties", countyIds: intent.highlightCountyIds });
  }

  if (intent.flyToCountyId) {
    const { WI_COUNTIES } = await import("@/lib/wi-counties");
    const county = WI_COUNTIES.find((c) => c.id === intent.flyToCountyId);
    if (county) {
      if (!actions.some((a) => a.type === "flyTo")) {
        actions.push({
          type: "flyTo",
          center: { lat: county.lat, lng: county.lng },
          zoom: intent.metric ? 9.25 : intent.searchJobs?.transitOnly ? 10.5 : 8.5,
          pitch: 34,
        });
      }
      if (!intent.metric && !intent.highlightCountyIds?.length) {
        actions.push({ type: "highlightCounties", countyIds: [intent.flyToCountyId] });
      }
    }
  }

  if (intent.transitMetro && !intent.searchJobs) {
    const center =
      intent.transitMetro === "madison"
        ? { lat: 43.0731, lng: -89.4012 }
        : intent.transitMetro === "milwaukee"
          ? { lat: 43.0389, lng: -87.9065 }
          : { lat: 43.5, lng: -88.5 };
    actions.push({ type: "flyTo", center, zoom: 10, pitch: 28 });
  }

  if (!jobs.length && !intent.metric && actions.length === 0) return null;

  const transitCount = jobs.filter((j) => j.transitAccessible).length;
  const keyword = intent.searchJobs?.keyword;
  const place =
    intent.flyToCountyId === "milwaukee"
      ? "Milwaukee"
      : intent.flyToCountyId === "dane"
        ? "Madison"
        : "Wisconsin";

  let headline: string;
  let subline: string | undefined;
  let transitNote: string | undefined;

  if (jobs.length) {
    const role = keyword ? keyword.toUpperCase() : "job";
    const busRequested = Boolean(intent.searchJobs?.maxCommute);
    if (busRequested) {
      headline = `${jobs.length} ${role} opening${jobs.length === 1 ? "" : "s"} near ${place}`;
      subline =
        transitCount > 0
          ? `${transitCount} with strong bus reach · blue pins on the map`
          : `${jobs.length} live listing${jobs.length === 1 ? "" : "s"} — MCTS serves Milwaukee County`;
      transitNote =
        intent.transitMetro === "milwaukee" || intent.flyToCountyId === "milwaukee"
          ? "Tip: MCTS Trip Planner can route you from home to each pin. Blue badges = closest to transit."
          : "Listings sorted with transit-friendly roles first where available.";
    } else if (intent.searchJobs?.transitOnly) {
      headline = `${jobs.length} ${role} opening${jobs.length === 1 ? "" : "s"} on transit near ${place}`;
      subline =
        transitCount > 0
          ? `${transitCount} pinned on the map with MCTS-friendly reach`
          : "Blue pins = transit-accessible · orange = further out";
      transitNote =
        intent.transitMetro === "milwaukee" || intent.flyToCountyId === "milwaukee"
          ? "MCTS buses cover Milwaukee County — tap a pin for employer and pay."
          : "Pins show live listings filtered for transit reach.";
    } else {
      headline = `${jobs.length} live ${keyword ?? "job"} listing${jobs.length === 1 ? "" : "s"} near ${place}`;
      subline = liveCount ? `${liveCount} pulled from Adzuna · tap pins on the map` : undefined;
    }
  } else if (metaMessage) {
    headline = metaMessage;
  } else if (countyFocus) {
    headline = headlineForCountyMetric(countyFocus);
    subline = `Hover counties on the map · ${countyFocus.vitals.length} live stats for ${countyFocus.countyName}`;
  } else if (intent.metric) {
    headline = `Mapped ${intent.metric.replace("-", " ")} across Wisconsin`;
  } else {
    return null;
  }

  return {
    headline,
    subline,
    jobs,
    stats: { total: jobs.length, transitCount, liveCount },
    transitNote,
    mapActions: actions,
    source: "live-fallback",
    countyFocus,
  };
}

/** @deprecated use buildLocalMapAnswer */
export async function buildMapActionsFromIntent(intent: MapQueryIntent): Promise<MapAction[]> {
  const answer = await buildLocalMapAnswer(intent);
  return answer?.mapActions ?? [];
}
