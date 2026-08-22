import type { ChoroplethMetric } from "@/lib/agent/map-actions";
import type { CountyEconomy } from "@/lib/types";

export function countyMetricValue(county: CountyEconomy, metric: ChoroplethMetric): number {
  switch (metric) {
    case "unemployment":
      return county.unemploymentRate;
    case "opportunity":
      return county.opportunityIndex;
    case "median-wage":
      return county.medianWage;
    case "open-jobs":
      return county.openJobs;
    case "transit-coverage":
      return county.transitCoverage;
  }
}

export function formatCountyMetric(metric: ChoroplethMetric, value: number): string {
  switch (metric) {
    case "unemployment":
      return `${value.toFixed(1)}%`;
    case "median-wage":
      return `$${Math.round(value / 1000)}k`;
    case "open-jobs":
      return value.toLocaleString();
    case "opportunity":
    case "transit-coverage":
      return String(Math.round(value));
    default:
      return String(value);
  }
}

export function metricShortLabel(metric: ChoroplethMetric): string {
  return (
    {
      unemployment: "Unemployment",
      opportunity: "Opportunity index",
      "median-wage": "Median wage",
      "open-jobs": "Open jobs",
      "transit-coverage": "Transit coverage",
    }[metric] ?? metric
  );
}

export function choroplethFromCounties(
  metric: ChoroplethMetric,
  counties: CountyEconomy[]
): { values: Record<string, number>; labels: Record<string, string> } {
  const values: Record<string, number> = {};
  const labels: Record<string, string> = {};
  for (const c of counties) {
    const v = countyMetricValue(c, metric);
    values[c.id] = v;
    labels[c.id] = `${c.name.replace(" County", "")}: ${formatCountyMetric(metric, v)}`;
  }
  return { values, labels };
}

export type CountyFocusSnapshot = {
  countyId: string;
  countyName: string;
  metric: ChoroplethMetric;
  metricValue: number;
  metricFormatted: string;
  rank: number;
  totalCounties: number;
  percentile: number;
  statewideAvg: number;
  statewideAvgFormatted: string;
  peers: { id: string; name: string; value: number; formatted: string; pct: number }[];
  vitals: {
    label: string;
    value: string;
    hint?: string;
  }[];
};

export function buildCountyFocus(
  counties: CountyEconomy[],
  countyId: string,
  metric: ChoroplethMetric
): CountyFocusSnapshot | null {
  const county = counties.find((c) => c.id === countyId);
  if (!county) return null;

  const higherIsBetter = metric !== "unemployment";
  const sorted = [...counties].sort((a, b) => {
    const va = countyMetricValue(a, metric);
    const vb = countyMetricValue(b, metric);
    return higherIsBetter ? vb - va : va - vb;
  });

  const rank = sorted.findIndex((c) => c.id === countyId) + 1;
  const values = counties.map((c) => countyMetricValue(c, metric));
  const statewideAvg = values.reduce((s, v) => s + v, 0) / values.length;
  const maxPeer = Math.max(...sorted.slice(0, 5).map((c) => countyMetricValue(c, metric)), 1);

  const metricValue = countyMetricValue(county, metric);

  return {
    countyId,
    countyName: county.name.replace(" County", ""),
    metric,
    metricValue,
    metricFormatted: formatCountyMetric(metric, metricValue),
    rank,
    totalCounties: counties.length,
    percentile: Math.round(((counties.length - rank) / Math.max(counties.length - 1, 1)) * 100),
    statewideAvg,
    statewideAvgFormatted: formatCountyMetric(metric, statewideAvg),
    peers: sorted.slice(0, 5).map((c) => {
      const v = countyMetricValue(c, metric);
      return {
        id: c.id,
        name: c.name.replace(" County", ""),
        value: v,
        formatted: formatCountyMetric(metric, v),
        pct: Math.round((v / maxPeer) * 100),
      };
    }),
    vitals: [
      {
        label: "Unemployment",
        value: `${county.unemploymentRate.toFixed(1)}%`,
        hint: "Latest county rate",
      },
      {
        label: "Median wage",
        value: `$${Math.round(county.medianWage / 1000)}k`,
      },
      {
        label: "Open jobs",
        value: county.openJobs.toLocaleString(),
      },
      {
        label: "Transit reach",
        value: `${Math.round(county.transitCoverage)}%`,
        hint: `${Math.round(county.transitAccessibleJobShare)}% jobs on transit`,
      },
      {
        label: "Opportunity",
        value: String(county.opportunityIndex),
      },
      {
        label: "Labor force",
        value: `${Math.round(county.laborForceParticipation)}%`,
      },
    ],
  };
}

export function headlineForCountyMetric(focus: CountyFocusSnapshot): string {
  const label = metricShortLabel(focus.metric);
  const rankText =
    focus.rank <= 3
      ? `#${focus.rank} in Wisconsin`
      : `rank #${focus.rank} of ${focus.totalCounties}`;
  return `${focus.countyName} · ${label} ${focus.metricFormatted} (${rankText})`;
}
