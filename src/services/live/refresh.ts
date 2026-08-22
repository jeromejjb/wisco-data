import { invalidateCache, getCacheEntriesMatching, listCacheKeys } from "@/lib/cache";
import {
  DATA_SOURCES,
  envConfigured,
  getSourceById,
  type DataSourceDefinition,
} from "@/lib/data-sources/registry";
import { getLiveEconomyData } from "@/services/live/economy";
import { getLiveJobs } from "@/services/live/jobs";
import { getLiveTransitData } from "@/services/live/transit";

export type SourceStatus = {
  id: string;
  name: string;
  category: DataSourceDefinition["category"];
  configured: boolean;
  publicFeed: boolean;
  lastFetchedAt: string | null;
  nextRefreshAt: string | null;
  stale: boolean;
  cacheKeysHit: number;
};

export type RefreshResult = {
  refreshedAt: string;
  sources: string[];
  errors: { source: string; message: string }[];
  summary: Record<string, unknown>;
};

function latestFetchForSource(source: DataSourceDefinition): {
  fetchedAt: number | null;
  stale: boolean;
} {
  const entries = getCacheEntriesMatching(source.cachePrefix);
  if (entries.length === 0) {
    return { fetchedAt: null, stale: true };
  }
  const latest = Math.max(...entries.map((e) => e.fetchedAt));
  const stale = entries.some((e) => Date.now() >= e.expiresAt);
  return { fetchedAt: latest, stale };
}

export function getDataSourceStatuses(): SourceStatus[] {
  return DATA_SOURCES.map((source) => {
    const { fetchedAt, stale } = latestFetchForSource(source);
    const cacheKeysHit = getCacheEntriesMatching(source.cachePrefix).length;

    return {
      id: source.id,
      name: source.name,
      category: source.category,
      configured: envConfigured(source.envKeys) || !!source.publicFeed,
      publicFeed: !!source.publicFeed,
      lastFetchedAt: fetchedAt ? new Date(fetchedAt).toISOString() : null,
      nextRefreshAt: fetchedAt
        ? new Date(fetchedAt + source.refreshIntervalMs).toISOString()
        : null,
      stale,
      cacheKeysHit,
    };
  });
}

export function getStaleSourceIds(): string[] {
  return getDataSourceStatuses()
    .filter((s) => s.stale || !s.lastFetchedAt)
    .filter((s) => s.configured)
    .map((s) => s.id);
}

function invalidateSource(sourceId: string) {
  const source = getSourceById(sourceId);
  if (!source) return;
  invalidateCache(source.cachePrefix);
}

async function refreshSourcesGrouped(sourceIds: string[]): Promise<RefreshResult> {
  const errors: RefreshResult["errors"] = [];
  const refreshed = new Set<string>();
  const summary: Record<string, unknown> = {};

  const economyIds = sourceIds.filter((id) =>
    ["bls", "qcew", "wisconomy", "census", "fred"].includes(id)
  );
  const jobIds = sourceIds.filter((id) => ["usajobs", "adzuna"].includes(id));
  const transitIds = sourceIds.filter((id) => ["gtfs", "gtfs-realtime"].includes(id));

  for (const id of sourceIds) {
    invalidateSource(id);
    refreshed.add(id);
  }

  if (economyIds.length > 0) {
    try {
      const economy = await getLiveEconomyData();
      summary.economy = {
        unemployment: economy.statewide.unemploymentRate,
        counties: economy.counties.length,
        lastUpdated: economy.statewide.provenance.lastUpdated,
      };
    } catch (e) {
      economyIds.forEach((id) =>
        errors.push({ source: id, message: e instanceof Error ? e.message : String(e) })
      );
    }
  }

  if (jobIds.length > 0) {
    try {
      const jobs = await getLiveJobs({});
      summary.jobs = {
        count: jobs.count,
        liveCount: jobs.meta?.liveCount,
        keysRequired: jobs.meta?.keysRequired,
      };
    } catch (e) {
      jobIds.forEach((id) =>
        errors.push({ source: id, message: e instanceof Error ? e.message : String(e) })
      );
    }
  }

  if (transitIds.length > 0) {
    try {
      const transit = await getLiveTransitData();
      summary.transit = {
        stops: transit.stats.totalStops,
        routes: transit.stats.totalRoutes,
        alerts: transit.alerts.length,
      };
    } catch (e) {
      transitIds.forEach((id) =>
        errors.push({ source: id, message: e instanceof Error ? e.message : String(e) })
      );
    }
  }

  return {
    refreshedAt: new Date().toISOString(),
    sources: [...refreshed],
    errors,
    summary,
  };
}

export async function refreshAllLiveSources(): Promise<RefreshResult> {
  const ids = DATA_SOURCES.filter((s) => envConfigured(s.envKeys) || s.publicFeed).map(
    (s) => s.id
  );
  return refreshSourcesGrouped([...new Set(ids)]);
}

export async function refreshLiveSources(sourceIds?: string[]): Promise<RefreshResult> {
  if (!sourceIds?.length) return refreshAllLiveSources();

  const valid = sourceIds
    .map((id) => getSourceById(id))
    .filter(Boolean)
    .map((s) => s!.id);

  return refreshSourcesGrouped([...new Set(valid)]);
}

export async function refreshStaleSources(): Promise<RefreshResult | null> {
  const stale = getStaleSourceIds();
  if (stale.length === 0) return null;
  return refreshLiveSources(stale);
}

export function getCacheDebugInfo() {
  return { keys: listCacheKeys(), statuses: getDataSourceStatuses() };
}
