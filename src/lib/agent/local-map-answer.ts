import type { MapAction } from "./map-actions";
import type { CountyFocusSnapshot } from "@/lib/map-county-metrics";
import {
  buildCountyFocus,
  choroplethFromCounties,
  formatRankContext,
  formatStateAvgLabel,
  headlineForCountyMetric,
} from "@/lib/map-county-metrics";
import { getMetricSources } from "@/lib/economy-metric-sources";
import type { CountyEconomy } from "@/lib/types";
import { getCountyCoordinates } from "@/lib/county-lookup";
import { matchCityInText, userAreaFromCountyId } from "@/lib/user-area";

import type { MapQueryIntent } from "./map-query-intent";
import { COMMUTE_POLICY, classifyCommute } from "@/lib/commute-policy";
import type { AreaNewsItem, LocalNewsMapPin } from "@/lib/news-types";
import { isBizStoryRelevantToArea } from "@/lib/biz-journals";
import { useMapStore } from "@/lib/map-store";

/** Minimal area context needed for business-journal relevance filtering. */
type BizAreaContext = { displayName: string; countyId: string };

export type MapJobHit = {
  id: string;
  title: string;
  employer: string;
  city: string;
  payLabel?: string;
  transitAccessible: boolean;
  commuteMinutes?: number;
  commuteMode?: "transit" | "drive";
  distanceKm?: number;
  walkMinutes?: number;
  transfers?: number;
  fitScore?: number;
  applicationUrl?: string;
  coordinates?: { lat: number; lng: number };
};

export type LocalMapAnswer = {
  headline: string;
  subline?: string;
  jobs: MapJobHit[];
  stats: {
    total: number;
    transitCount: number;
    healthyCount: number;
    liveCount?: number;
    filteredByCommute?: number;
  };
  transitNote?: string;
  healthNote?: string;
  mapActions: MapAction[];
  source: "live-fallback";
  countyFocus?: CountyFocusSnapshot;
  bizStories?: AreaNewsItem[];
  bizMapPins?: LocalNewsMapPin[];
};

function payLabel(job: {
  payMin?: number;
  payMax?: number;
  payType: string;
}): string | undefined {
  if (!job.payMin && !job.payMax) return undefined;
  const val = job.payMin ?? job.payMax!;
  if (job.payType === "hourly") return `$${val.toFixed(0)}/hr`;
  const thousands = Math.round(val / 1000);
  if (thousands <= 0) return undefined;
  return `$${thousands}k/yr`;
}

export async function buildLocalMapAnswer(
  intent: MapQueryIntent,
  opts?: { area?: BizAreaContext }
): Promise<LocalMapAnswer | null> {
  const actions: MapAction[] = [];
  let jobs: MapJobHit[] = [];
  let liveCount = 0;
  let metaMessage: string | undefined;
  let countyFocus: CountyFocusSnapshot | undefined;
  let bizStories: AreaNewsItem[] = [];
  let bizMapPins: LocalNewsMapPin[] = [];

  const newsCountyId =
    intent.flyToCountyId ??
    (intent.searchJobs?.location
      ? matchCityInText(intent.searchJobs.location.toLowerCase())?.countyId
      : undefined) ??
    opts?.area?.countyId;

  const [newsLayer, jobsLayer, economyLayer] = await Promise.all([
    intent.bizJournalNews ? loadNewsLayer(newsCountyId, opts?.area) : Promise.resolve(null),
    intent.searchJobs ? loadJobsLayer(intent) : Promise.resolve(null),
    intent.metric ? loadEconomyLayer(intent) : Promise.resolve(null),
  ]);

  if (newsLayer) {
    bizStories = newsLayer.bizStories;
    bizMapPins = newsLayer.bizMapPins;
  }
  if (jobsLayer) {
    jobs = jobsLayer.jobs;
    liveCount = jobsLayer.liveCount;
    metaMessage = jobsLayer.metaMessage;
    actions.push(...jobsLayer.actions);
  }
  if (economyLayer) {
    countyFocus = economyLayer.countyFocus;
    actions.push(...economyLayer.actions);
  }

  if (intent.highlightCountyIds?.length && !intent.metric) {
    actions.push({ type: "highlightCounties", countyIds: intent.highlightCountyIds });
  }

  if (intent.flyToCountyId) {
    const coords = getCountyCoordinates(intent.flyToCountyId);
    if (coords) {
      actions.push({
        type: "flyTo",
        center: coords,
        zoom: intent.searchJobs
          ? intent.searchJobs.transitOnly
            ? 10.5
            : 10.25
          : intent.metric
            ? 8.15
            : 9,
        pitch: 34,
      });
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

  if (!jobs.length && !intent.metric && actions.length === 0 && !bizStories.length) return null;

  const transitCount = jobs.filter((j) => j.transitAccessible).length;
  const healthyCount = jobs.filter(
    (j) => j.commuteMinutes != null && classifyCommute(j.commuteMinutes) !== "unhealthy"
  ).length;
  const keyword = intent.searchJobs?.keyword;
  const place =
    intent.searchJobs?.location ??
    (intent.flyToCountyId
      ? userAreaFromCountyId(intent.flyToCountyId).displayName
      : undefined) ??
    "Wisconsin";

  let headline: string;
  let subline: string | undefined;
  let transitNote: string | undefined;
  let healthNote: string | undefined = COMMUTE_POLICY.researchNote;

  if (metaMessage && jobs.length === 0 && intent.searchJobs) {
    headline = `Jobs near ${place}`;
    subline = metaMessage;
    healthNote = undefined;
  } else if (jobs.length) {
    const role = keyword ?? "job";
    headline = `${jobs.length} ${role} role${jobs.length === 1 ? "" : "s"} within reach of ${place}`;
    subline =
      healthyCount === jobs.length
        ? `All within a ${COMMUTE_POLICY.recommendedMaxMinutes}-minute commute — sorted closest first`
        : `${healthyCount} within healthy commute range · closest roles first`;
    if (transitCount > 0) {
      transitNote = `${transitCount} reachable by transit where GTFS data exists. Green pins = ≤30 min · teal = ≤45 min.`;
    } else if (intent.searchJobs?.location) {
      transitNote = `Drive-time estimates from ${place}. Roles beyond ${COMMUTE_POLICY.searchRadiusKm} km are excluded.`;
    }
  } else if (metaMessage) {
    headline = metaMessage;
    healthNote = undefined;
  } else if (countyFocus) {
    headline = headlineForCountyMetric(countyFocus);
    subline = `${formatRankContext(countyFocus)} · ${formatStateAvgLabel(countyFocus)}`;
  } else if (bizStories.length) {
    headline = `Business & job growth near ${place}`;
    subline = `${bizStories.length} stor${bizStories.length === 1 ? "y" : "ies"} from Wisconsin business journals`;
  } else if (intent.metric) {
    headline = `Mapped ${intent.metric.replace("-", " ")} across Wisconsin`;
  } else {
    return null;
  }

  if (jobs.length && bizStories.length) {
    subline = [subline, `${bizStories.length} regional business journal headline${bizStories.length === 1 ? "" : "s"} below`]
      .filter(Boolean)
      .join(" · ");
  }

  return {
    headline,
    subline,
    jobs,
    stats: { total: jobs.length, transitCount, healthyCount, liveCount },
    transitNote,
    healthNote,
    mapActions: actions,
    source: "live-fallback",
    countyFocus,
    bizStories: bizStories.length ? bizStories : undefined,
    bizMapPins: bizMapPins.length ? bizMapPins : undefined,
  };
}

function seededUnemployment(): {
  values: Record<string, number>;
  labels: Record<string, string>;
} | null {
  if (typeof window === "undefined") return null;
  const state = useMapStore.getState();
  const values = state.mapDemographics.unemploymentByFips;
  if (Object.keys(values).length === 0) return null;
  return { values, labels: state.choroplethLabels };
}

async function loadNewsLayer(newsCountyId: string | undefined, area?: BizAreaContext) {
  let bizStories: AreaNewsItem[] = [];
  let bizMapPins: LocalNewsMapPin[] = [];
  try {
    const qs = new URLSearchParams({ limit: "6", development: "1" });
    if (newsCountyId) qs.set("county", newsCountyId);
    const res = await fetch(`/api/news?${qs}`);
    if (!res.ok) return { bizStories, bizMapPins };
    const payload = (await res.json()) as {
      data: AreaNewsItem[];
      mapPins: LocalNewsMapPin[];
      bizJournalItems?: AreaNewsItem[];
    };
    bizStories = payload.bizJournalItems?.length
      ? payload.bizJournalItems
      : payload.data.filter((i) => i.source === "biz-journal");
    if (bizStories.length) {
      const pinIds = new Set(bizStories.map((s) => s.id));
      bizMapPins = payload.mapPins.filter((p) => pinIds.has(p.id));
    }
    const areaCtx = area ?? (newsCountyId ? userAreaFromCountyId(newsCountyId) : undefined);
    if (areaCtx && bizStories.length) {
      const relevant = bizStories.filter((story) => {
        const text = `${story.title} ${story.summary ?? ""}`;
        if (!isBizStoryRelevantToArea(text, areaCtx)) return false;
        if (story.countyId && story.countyId !== areaCtx.countyId) return false;
        return true;
      });
      const pinIds = new Set(relevant.map((s) => s.id));
      bizStories = relevant;
      bizMapPins = bizMapPins.filter((p) => pinIds.has(p.id));
    }
  } catch {
    /* non-fatal */
  }
  return { bizStories, bizMapPins };
}

async function loadJobsLayer(intent: MapQueryIntent) {
  const empty = { jobs: [] as MapJobHit[], liveCount: 0, metaMessage: undefined as string | undefined, actions: [] as MapAction[] };
  if (!intent.searchJobs) return empty;
  try {
    const qs = new URLSearchParams();
    if (intent.searchJobs.keyword) qs.set("q", intent.searchJobs.keyword);
    if (intent.searchJobs.location) qs.set("location", intent.searchJobs.location);
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
        commute?: {
          durationMinutes: number;
          mode?: "transit" | "drive";
          distanceKm?: number;
          walkMinutes?: number;
          transfers?: number;
        };
        commuteFitScore?: number;
      }[];
      meta?: { liveCount?: number; userMessage?: string; status?: string };
    };
    if (!res.ok) return empty;

    const raw = payload.data.slice(0, 15);
    const jobs: MapJobHit[] = raw.map((j) => ({
      id: j.id,
      title: j.title,
      employer: j.employer,
      city: j.location.city,
      payLabel: payLabel(j),
      transitAccessible: Boolean(j.transitAccessible),
      commuteMinutes: j.commute?.durationMinutes,
      commuteMode: j.commute?.mode,
      distanceKm: j.commute?.distanceKm,
      walkMinutes: j.commute?.walkMinutes,
      transfers: j.commute?.transfers,
      fitScore: j.commuteFitScore,
      applicationUrl: j.applicationUrl,
      coordinates: j.location.coordinates,
    }));

    jobs.sort((a, b) => {
      const aMin = a.commuteMinutes ?? 999;
      const bMin = b.commuteMinutes ?? 999;
      if (aMin !== bMin) return aMin - bMin;
      return (b.fitScore ?? 0) - (a.fitScore ?? 0);
    });

    const actions: MapAction[] = [];
    if (raw.length) {
      actions.push({
        type: "setMarkers",
        markers: raw.map((j) => {
          const hit = jobs.find((h) => h.id === j.id);
          return {
            id: j.id,
            coordinates: j.location.coordinates,
            label: `${j.title} · ${j.employer}`,
            color: markerColorForJob(hit?.commuteMinutes),
          };
        }),
      });
      if (!intent.flyToCountyId) {
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

    return {
      jobs,
      liveCount: payload.meta?.liveCount ?? payload.data.length,
      metaMessage: payload.meta?.userMessage,
      actions,
    };
  } catch {
    return empty;
  }
}

async function loadEconomyLayer(intent: MapQueryIntent) {
  const empty = { actions: [] as MapAction[], countyFocus: undefined as CountyFocusSnapshot | undefined };
  if (!intent.metric) return empty;
  const focusId = intent.flyToCountyId ?? intent.highlightCountyIds?.[0];
  const seeded = intent.metric === "unemployment" ? seededUnemployment() : null;

  if (seeded && !focusId) {
    return {
      actions: [
        {
          type: "setChoropleth" as const,
          metric: "unemployment" as const,
          values: seeded.values,
          labels: seeded.labels,
        },
      ],
      countyFocus: undefined,
    };
  }

  try {
    const res = await fetch("/api/economy");
    if (!res.ok) {
      if (seeded) {
        return {
          actions: [
            {
              type: "setChoropleth" as const,
              metric: "unemployment" as const,
              values: seeded.values,
              labels: seeded.labels,
            },
          ],
          countyFocus: undefined,
        };
      }
      return empty;
    }
    const payload = (await res.json()) as {
      data: {
        counties: CountyEconomy[];
        unemploymentByFips?: Record<string, number>;
        countyLabelsByFips?: Record<string, string>;
      };
      provenance?: { lastUpdated?: string };
    };
    const counties = payload.data.counties ?? [];
    let unemploymentByFips = payload.data.unemploymentByFips ?? {};
    let countyLabelsByFips = payload.data.countyLabelsByFips ?? {};
    const dataAsOf = payload.provenance?.lastUpdated;

    if (intent.metric === "unemployment" && Object.keys(unemploymentByFips).length === 0) {
      if (seeded) {
        unemploymentByFips = seeded.values;
        countyLabelsByFips = Object.keys(seeded.labels).length ? seeded.labels : countyLabelsByFips;
      } else {
        const mapRes = await fetch("/api/economy/map");
        if (mapRes.ok) {
          const mapPayload = (await mapRes.json()) as {
            data?: {
              unemploymentByFips?: Record<string, number>;
              countyLabelsByFips?: Record<string, string>;
            };
          };
          unemploymentByFips = mapPayload.data?.unemploymentByFips ?? {};
          countyLabelsByFips = mapPayload.data?.countyLabelsByFips ?? countyLabelsByFips;
        }
      }
    }

    const actions: MapAction[] = [];
    if (intent.metric === "unemployment" && Object.keys(unemploymentByFips).length > 0) {
      actions.push({
        type: "setChoropleth",
        metric: "unemployment",
        values: unemploymentByFips,
        labels: countyLabelsByFips,
      });
    } else {
      const { values, labels } = choroplethFromCounties(intent.metric, counties);
      actions.push({
        type: "setChoropleth",
        metric: intent.metric,
        values,
        labels,
      });
    }

    let countyFocus: CountyFocusSnapshot | undefined;
    if (focusId) {
      countyFocus =
        buildCountyFocus(counties, focusId, intent.metric, {
          unemploymentByFips,
          sources: getMetricSources(intent.metric),
          dataAsOf,
        }) ?? undefined;
      actions.push({ type: "highlightCounties", countyIds: [focusId] });
    }
    return { actions, countyFocus };
  } catch {
    return empty;
  }
}

function markerColorForJob(minutes?: number): string {
  if (minutes == null) return "#6366f1";
  const tier = classifyCommute(minutes);
  if (tier === "excellent") return "#267a55";
  if (tier === "good") return "#1e6b9c";
  return "#d4824a";
}

/** @deprecated use buildLocalMapAnswer */
export async function buildMapActionsFromIntent(intent: MapQueryIntent): Promise<MapAction[]> {
  const answer = await buildLocalMapAnswer(intent);
  return answer?.mapActions ?? [];
}
