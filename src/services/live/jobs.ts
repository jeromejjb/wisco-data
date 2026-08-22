import type { Job } from "@/lib/types";
import { filterJobs, rankJobsByReach } from "@/lib/jobs-filter";
import { buildJobsMeta, type JobsMeta } from "@/lib/jobs-errors";
import { fetchUsaJobsWisconsin, fetchAdzunaJobs } from "@/services/clients/jobs-api";
import { enrichJobsWithCommuteEstimates } from "@/services/live/commute-enrichment";
import { getJobsEnvStatus } from "@/lib/jobs-env";

export type JobsFilterParams = {
  keyword?: string;
  industry?: string;
  transitOnly?: boolean;
  maxCommute?: number;
  maxTransfers?: number;
  minSalary?: number;
  rankByReach?: boolean;
};

export async function getLiveJobs(params: JobsFilterParams = {}) {
  const env = getJobsEnvStatus();

  const [usajobs, adzuna] = await Promise.all([
    fetchUsaJobsWisconsin({ keyword: params.keyword, location: "Wisconsin" }),
    fetchAdzunaJobs({ keyword: params.keyword, where: "Wisconsin" }),
  ]);

  const liveJobs = dedupeJobs([...usajobs.jobs, ...adzuna.jobs]);
  const enriched = await enrichJobsWithCommuteEstimates(liveJobs);

  let results = filterJobs(enriched, params);
  if (params.rankByReach) results = rankJobsByReach(results);

  const meta = buildJobsMeta({
    env,
    usajobsError: usajobs.error,
    adzunaError: adzuna.error,
    liveCount: liveJobs.length,
    resultCount: results.length,
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
