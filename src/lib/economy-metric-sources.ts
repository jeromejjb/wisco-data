import type { ChoroplethMetric } from "@/lib/agent/map-actions";

export type MetricSource = {
  label: string;
  href: string;
};

/** Official sources cited on county metric cards — keep in sync with footer DATA_SOURCES. */
export const METRIC_SOURCES: Record<ChoroplethMetric, MetricSource[]> = {
  unemployment: [
    {
      label: "Wisconsin DWD WisConomy",
      href: "https://jobcenterofwisconsin.com/wisconomy/",
    },
    {
      label: "BLS Local Area Unemployment (LAUS)",
      href: "https://www.bls.gov/lau/",
    },
  ],
  opportunity: [
    {
      label: "BLS QCEW",
      href: "https://www.bls.gov/cew/",
    },
    {
      label: "Wisconsin DWD WisConomy",
      href: "https://jobcenterofwisconsin.com/wisconomy/",
    },
  ],
  "median-wage": [
    {
      label: "BLS QCEW",
      href: "https://www.bls.gov/cew/",
    },
    {
      label: "U.S. Census ACS",
      href: "https://www.census.gov/programs-surveys/acs",
    },
  ],
  "open-jobs": [
    {
      label: "BLS QCEW",
      href: "https://www.bls.gov/cew/",
    },
    {
      label: "BLS JOLTS (proxy)",
      href: "https://www.bls.gov/jlt/",
    },
  ],
  "transit-coverage": [
    {
      label: "MCTS GTFS",
      href: "https://www.ridemcts.com/",
    },
    {
      label: "Madison Metro GTFS",
      href: "https://www.cityofmadison.com/metro/",
    },
  ],
};

export function getMetricSources(metric: ChoroplethMetric): MetricSource[] {
  return METRIC_SOURCES[metric] ?? [];
}

export function formatDataAsOf(iso?: string): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
