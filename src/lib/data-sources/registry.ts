/** Catalog of live data sources — cache keys, TTLs, and env requirements */

export type SourceCategory = "economy" | "jobs" | "transit" | "budgets";

export type DataSourceDefinition = {
  id: string;
  name: string;
  category: SourceCategory;
  description: string;
  cachePrefix: string;
  cacheKeys: string[];
  ttlMs: number;
  envKeys?: string[];
  /** Public feeds work without keys (may rate-limit) */
  publicFeed?: boolean;
  refreshIntervalMs: number;
};

export const DATA_SOURCES: DataSourceDefinition[] = [
  {
    id: "bls",
    name: "Bureau of Labor Statistics",
    category: "economy",
    description: "State unemployment, employment trends (LAUS/CES)",
    cachePrefix: "bls:",
    cacheKeys: ["bls:statewide", "bls:unemployment-trend"],
    ttlMs: 6 * 60 * 60 * 1000,
    envKeys: ["BLS_REGISTRATION_KEY"],
    publicFeed: true,
    refreshIntervalMs: 6 * 60 * 60 * 1000,
  },
  {
    id: "qcew",
    name: "BLS QCEW",
    category: "economy",
    description: "County employment, wages, industry breakdown",
    cachePrefix: "qcew:",
    cacheKeys: ["qcew:counties", "qcew:state", "qcew:industries"],
    ttlMs: 24 * 60 * 60 * 1000,
    publicFeed: true,
    refreshIntervalMs: 24 * 60 * 60 * 1000,
  },
  {
    id: "wisconomy",
    name: "Wisconsin DWD WisConomy",
    category: "economy",
    description: "Official Wisconsin county unemployment rates",
    cachePrefix: "wisconomy:",
    cacheKeys: ["wisconomy:county-rates"],
    ttlMs: 12 * 60 * 60 * 1000,
    publicFeed: true,
    refreshIntervalMs: 12 * 60 * 60 * 1000,
  },
  {
    id: "census",
    name: "U.S. Census ACS",
    category: "economy",
    description: "County demographics, household income, labor force",
    cachePrefix: "census:",
    cacheKeys: ["census:counties"],
    ttlMs: 7 * 24 * 60 * 60 * 1000,
    envKeys: ["CENSUS_API_KEY"],
    publicFeed: false,
    refreshIntervalMs: 7 * 24 * 60 * 60 * 1000,
  },
  {
    id: "fred",
    name: "Federal Reserve (FRED)",
    category: "economy",
    description: "Labor force participation and macro series",
    cachePrefix: "fred:",
    cacheKeys: ["fred:LBSSA55:12"],
    ttlMs: 6 * 60 * 60 * 1000,
    envKeys: ["FRED_API_KEY"],
    publicFeed: false,
    refreshIntervalMs: 6 * 60 * 60 * 1000,
  },
  {
    id: "usajobs",
    name: "USAJobs",
    category: "jobs",
    description: "Federal job listings in Wisconsin",
    cachePrefix: "usajobs:",
    cacheKeys: [],
    ttlMs: 30 * 60 * 1000,
    envKeys: ["USAJOBS_AUTH_KEY", "USAJOBS_USER_AGENT"],
    publicFeed: false,
    refreshIntervalMs: 30 * 60 * 1000,
  },
  {
    id: "adzuna",
    name: "Adzuna",
    category: "jobs",
    description: "Aggregated Wisconsin job market listings",
    cachePrefix: "adzuna:",
    cacheKeys: [],
    ttlMs: 30 * 60 * 1000,
    envKeys: ["ADZUNA_APP_ID", "ADZUNA_APP_KEY"],
    publicFeed: false,
    refreshIntervalMs: 30 * 60 * 1000,
  },
  {
    id: "gtfs",
    name: "GTFS Transit Feeds",
    category: "transit",
    description: "MCTS & Madison Metro stops, routes, schedules",
    cachePrefix: "gtfs:",
    cacheKeys: ["gtfs:agencies"],
    ttlMs: 24 * 60 * 60 * 1000,
    publicFeed: true,
    refreshIntervalMs: 24 * 60 * 60 * 1000,
  },
  {
    id: "gtfs-realtime",
    name: "Madison GTFS-Realtime",
    category: "transit",
    description: "Live service alerts from Madison Metro",
    cachePrefix: "gtfs:",
    cacheKeys: ["gtfs:madison-alerts"],
    ttlMs: 60 * 1000,
    publicFeed: true,
    refreshIntervalMs: 60 * 1000,
  },
];

export function getSourceById(id: string) {
  return DATA_SOURCES.find((s) => s.id === id);
}

export function envConfigured(keys?: string[]): boolean {
  if (!keys?.length) return true;
  return keys.every((k) => Boolean(process.env[k]?.trim()));
}
