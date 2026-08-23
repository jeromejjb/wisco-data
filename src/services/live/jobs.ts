import type { Job } from "@/lib/types";
import { filterJobs, rankJobsByReach } from "@/lib/jobs-filter";
import { buildJobsMeta, type JobsMeta } from "@/lib/jobs-errors";
import { fetchUsaJobsWisconsin, fetchAdzunaJobs, parseJobSearchLocation } from "@/services/clients/jobs-api";
import { enrichJobsWithCommuteEstimates } from "@/services/live/commute-enrichment";
import { getJobsEnvStatus } from "@/lib/jobs-env";
import { haversineKm } from "@/lib/user-area";
import { COMMUTE_POLICY, driveMinutesFromKm } from "@/lib/commute-policy";

export type JobsFilterParams = {
  keyword?: string;
  industry?: string;
  location?: string;
  transitOnly?: boolean;
  maxCommute?: number;
  maxTransfers?: number;
  minSalary?: number;
  rankByReach?: boolean;
};

export async function getLiveJobs(params: JobsFilterParams = {}) {
  const env = getJobsEnvStatus();
  const searchLocation = params.location?.trim() || "Wisconsin";
  const searchAnchor =
    searchLocation.toLowerCase() !== "wisconsin"
      ? parseJobSearchLocation(searchLocation)
      : undefined;
  const maxCommute = params.maxCommute ?? COMMUTE_POLICY.recommendedMaxMinutes;

  const [usajobs, adzuna] = await Promise.all([
    fetchUsaJobsWisconsin({ keyword: params.keyword, location: searchLocation }),
    fetchAdzunaJobs({ keyword: params.keyword, where: searchLocation }),
  ]);

  const liveJobs = dedupeJobs([...usajobs.jobs, ...adzuna.jobs]);
  const enriched = await enrichJobsWithCommuteEstimates(liveJobs, {
    searchAnchor: searchAnchor
      ? { lat: searchAnchor.lat, lng: searchAnchor.lng }
      : undefined,
  });

  let pool = enriched;
  if (searchAnchor) {
    pool = enriched.filter(
      (job) =>
        haversineKm(job.location.coordinates, searchAnchor) <= COMMUTE_POLICY.searchRadiusKm
    );
  }

  const effectiveMaxCommute = searchAnchor
    ? Math.max(maxCommute, driveMinutesFromKm(COMMUTE_POLICY.searchRadiusKm))
    : maxCommute;

  let results = filterJobs(pool, { ...params, maxCommute: effectiveMaxCommute });
  if (params.rankByReach) results = rankJobsByReach(results);

  const meta = buildJobsMeta({
    env,
    usajobsError: usajobs.error,
    adzunaError: adzuna.error,
    liveCount: liveJobs.length,
    resultCount: results.length,
    searchLocation: searchAnchor ? searchLocation : undefined,
    poolCount: searchAnchor ? pool.length : undefined,
  });

  const sources: string[] = [];
  if (usajobs.jobs.length) sources.push("USAJobs (U.S. Office of Personnel Management)");
  if (adzuna.jobs.length) sources.push("Adzuna Job Market API");

  const hasLiveData = liveJobs.length > 0;

  return {
    jobs: results,
    count: results.length,
    provenance: {
      source: sources.length ? sources.join(" · ") : "No live job sources returned data",
      lastUpdated: new Date().toISOString(),
      coverage: "Wisconsin; federal and aggregated listings from configured APIs",
      confidence: hasLiveData ? ("high" as const) : ("low" as const),
      methodology:
        "Live job postings from Adzuna and USAJobs when configured. Commute estimates computed from GTFS stop proximity.",
    },
    meta,
  };
}

function dedupeJobs(jobs: Job[]): Job[] {
  const seen = new Set<string>();
  return jobs.filter((j) => {
    const key = `${j.title.toLowerCase()}|${j.employer.toLowerCase()}|${j.location.city}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export async function getLiveJobById(id: string) {
  const { jobs } = await getLiveJobs({});
  return jobs.find((j) => j.id === id);
}

export type { JobsMeta };
