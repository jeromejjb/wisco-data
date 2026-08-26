import type { ChoroplethMetric } from "@/lib/agent/map-actions";
import type { CountyEconomy } from "@/lib/types";
import { FIPS_TO_COUNTY_SHORT_NAME } from "@/lib/wi-county-fips";
import { FIPS_BY_COUNTY_ID } from "@/lib/wi-counties";
import type { MetricSource } from "@/lib/economy-metric-sources";
import { getMetricSources } from "@/lib/economy-metric-sources";

export function countyMetricValue(county: CountyEconomy, metric: ChoroplethMetric): number {
  switch (metric) {
    case "unemployment":
      return county.unemploymentRate;
    case "opportunity":
      return county.opportunityIndex;
    case "median-wage":
      return county.medianWage ?? 0;
    case "open-jobs":
      return county.openJobs ?? 0;
    case "transit-coverage":
      return county.transitCoverage ?? 0;
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
  /** Whether rank is among all WI counties or featured metros only */
  rankScope: "statewide" | "featured";
  percentile: number;
  statewideAvg: number;
  statewideAvgFormatted: string;
  peers: {
    id: string;
    name: string;
    value: number;
    formatted: string;
    /** @deprecated use axisPct — kept for compatibility */
    pct: number;
    /** Position on peer chart axis, 0–100 */
    axisPct: number;
  }[];
  /** Shared axis for peer dot chart */
  peerChart: { min: number; max: number; minLabel: string; maxLabel: string };
  vitals: {
    label: string;
    value: string;
    hint?: string;
  }[];
  sources: MetricSource[];
  dataAsOf?: string;
};

export function formatRankContext(focus: CountyFocusSnapshot): string {
  const { rank: r, totalCounties: n, metric, rankScope } = focus;

  if (metric === "unemployment") {
    if (rankScope === "featured") {
      const scopeLabel = `${n} featured metros we track`;
      if (r === 1) return `#${r} of ${scopeLabel} · lowest among tracked metros`;
      if (r === n) return `#${r} of ${scopeLabel} · highest among tracked metros`;
      return `#${r} of ${scopeLabel} · ${r - 1} tracked metro${r - 1 === 1 ? "" : "s"} lower`;
    }

    const lowerCount = r - 1;
    const higherCount = n - r;
    if (r === 1) return `#${r} of ${n} WI counties · lowest rate statewide`;
    if (r === n) return `#${r} of ${n} WI counties · highest rate statewide`;
    return `#${r} of ${n} WI counties · ${lowerCount} lower · ${higherCount} higher`;
  }

  const scope =
    rankScope === "statewide" ? `${n} WI counties` : `${n} featured metros`;
  const topPct = focus.percentile;
  return `#${r} of ${scope} · top ${topPct}% statewide`;
}

export function formatStateAvgLabel(focus: CountyFocusSnapshot): string {
  const scope =
    focus.rankScope === "statewide" && focus.metric === "unemployment"
      ? `${focus.totalCounties} counties`
      : focus.rankScope === "featured"
        ? "tracked metros"
        : "statewide";
  return `State avg ${focus.statewideAvgFormatted} (${scope})`;
}

export function peersSectionTitle(metric: ChoroplethMetric): string {
  switch (metric) {
    case "unemployment":
      return "Lowest unemployment in Wisconsin";
    case "median-wage":
      return "Highest median wages";
    case "open-jobs":
      return "Most open jobs";
    case "transit-coverage":
      return "Best transit reach";
    case "opportunity":
      return "Strongest opportunity index";
    default:
      return "County comparison";
  }
}

/** Axis bounds for peer dot charts — padded so clustered values stay visually distinct. */
export function peerChartDomain(
  metric: ChoroplethMetric,
  values: number[]
): { min: number; max: number; minLabel: string; maxLabel: string } {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const spread = Math.max(max - min, 0.001);

  switch (metric) {
    case "unemployment": {
      const pad = Math.max(0.35, spread * 2);
      const lo = Math.max(1.8, min - pad);
      const hi = Math.min(7.5, max + pad * 0.65);
      return {
        min: lo,
        max: hi,
        minLabel: `${lo.toFixed(1)}%`,
        maxLabel: `${hi.toFixed(1)}%`,
      };
    }
    case "median-wage": {
      const pad = Math.max(4000, spread * 0.35);
      return {
        min: Math.max(30000, min - pad),
        max: max + pad,
        minLabel: `$${Math.round((min - pad) / 1000)}k`,
        maxLabel: `$${Math.round((max + pad) / 1000)}k`,
      };
    }
    case "open-jobs": {
      const pad = Math.max(500, spread * 0.35);
      return {
        min: Math.max(0, min - pad),
        max: max + pad,
        minLabel: Math.round(min - pad).toLocaleString(),
        maxLabel: Math.round(max + pad).toLocaleString(),
      };
    }
    case "transit-coverage":
    case "opportunity": {
      const pad = Math.max(8, spread * 0.4);
      return {
        min: Math.max(0, min - pad),
        max: Math.min(100, max + pad),
        minLabel: String(Math.round(min - pad)),
        maxLabel: String(Math.round(max + pad)),
      };
    }
    default:
      return {
        min: min - spread * 0.2,
        max: max + spread * 0.2,
        minLabel: String(min),
        maxLabel: String(max),
      };
  }
}

export function peerAxisPct(value: number, domain: { min: number; max: number }): number {
  const span = domain.max - domain.min;
  if (span <= 0) return 50;
  return Math.min(96, Math.max(4, ((value - domain.min) / span) * 100));
}

function buildPeerRows(
  metric: ChoroplethMetric,
  rows: { id: string; name: string; value: number }[]
): CountyFocusSnapshot["peers"] {
  const values = rows.map((r) => r.value);
  const chart = peerChartDomain(metric, values);
  const domain = { min: chart.min, max: chart.max };

  return rows.map((row) => {
    const axisPct = Math.round(peerAxisPct(row.value, domain));
    return {
      ...row,
      formatted: formatCountyMetric(metric, row.value),
      axisPct,
      pct: axisPct,
    };
  });
}

export function buildCountyFocus(
  counties: CountyEconomy[],
  countyId: string,
  metric: ChoroplethMetric,
  options?: {
    unemploymentByFips?: Record<string, number>;
    sources?: MetricSource[];
    dataAsOf?: string;
  }
): CountyFocusSnapshot | null {
  const county = counties.find((c) => c.id === countyId);
  if (!county) return null;

  const higherIsBetter = metric !== "unemployment";
  const fips = FIPS_BY_COUNTY_ID[countyId] ?? county.fips;

  let rank: number;
  let totalCounties: number;
  let rankScope: "statewide" | "featured";
  let statewideAvg: number;
  let peers: CountyFocusSnapshot["peers"];
  let peerChart: CountyFocusSnapshot["peerChart"];
  let metricValue = countyMetricValue(county, metric);

  if (
    metric === "unemployment" &&
    options?.unemploymentByFips &&
    Object.keys(options.unemploymentByFips).length > 0
  ) {
    const entries = Object.entries(options.unemploymentByFips)
      .map(([entryFips, value]) => ({
        fips: entryFips,
        value,
        name: FIPS_TO_COUNTY_SHORT_NAME[entryFips] ?? entryFips,
      }))
      .sort((a, b) => a.value - b.value);

    totalCounties = entries.length;
    rankScope = "statewide";
    metricValue = options.unemploymentByFips[fips] ?? metricValue;
    rank = entries.filter((e) => e.value < metricValue).length + 1;
    rank = Math.min(Math.max(1, rank), totalCounties);
    statewideAvg =
      entries.reduce((s, e) => s + e.value, 0) / Math.max(entries.length, 1);

    const best = entries.slice(0, 5);
    const peerRows = buildPeerRows(
      metric,
      best.map((e) => ({ id: e.fips, name: e.name, value: e.value }))
    );
    peers = peerRows;
    peerChart = peerChartDomain(
      metric,
      best.map((e) => e.value)
    );
  } else {
    const sorted = [...counties].sort((a, b) => {
      const va = countyMetricValue(a, metric);
      const vb = countyMetricValue(b, metric);
      return higherIsBetter ? vb - va : va - vb;
    });

    rank = sorted.findIndex((c) => c.id === countyId) + 1;
    totalCounties = counties.length;
    rankScope = "featured";
    const values = counties.map((c) => countyMetricValue(c, metric));
    statewideAvg = values.reduce((s, v) => s + v, 0) / values.length;
    const top = sorted.slice(0, 5).map((c) => ({
      id: c.id,
      name: c.name.replace(" County", ""),
      value: countyMetricValue(c, metric),
    }));
    peers = buildPeerRows(metric, top);
    peerChart = peerChartDomain(
      metric,
      top.map((t) => t.value)
    );
  }

  const vitalsAll = [
    {
      label: "Unemployment",
      value: `${county.unemploymentRate.toFixed(1)}%`,
      hint: "Latest county rate",
      metricKey: "unemployment" as const,
    },
    {
      label: "Median wage",
      value: county.medianWage != null ? `$${Math.round(county.medianWage / 1000)}k` : "—",
      metricKey: "median-wage" as const,
    },
    {
      label: "Open jobs",
      value: county.openJobs != null ? county.openJobs.toLocaleString() : "—",
      metricKey: "open-jobs" as const,
    },
    ...(county.transitCoverage != null
      ? [
          {
            label: "Transit reach",
            value: `${Math.round(county.transitCoverage)}%`,
            hint:
              county.transitAccessibleJobShare != null
                ? `${Math.round(county.transitAccessibleJobShare)}% jobs on transit`
                : undefined,
            metricKey: "transit-coverage" as const,
          },
        ]
      : []),
    {
      label: "Opportunity",
      value: String(county.opportunityIndex),
      metricKey: "opportunity" as const,
    },
    ...(county.laborForceParticipation != null
      ? [
          {
            label: "Labor force",
            value: `${Math.round(county.laborForceParticipation)}%`,
            metricKey: null,
          },
        ]
      : []),
  ];

  return {
    countyId,
    countyName: county.name.replace(" County", ""),
    metric,
    metricValue,
    metricFormatted: formatCountyMetric(metric, metricValue),
    rank,
    totalCounties,
    rankScope,
    percentile: Math.round(((totalCounties - rank) / Math.max(totalCounties - 1, 1)) * 100),
    statewideAvg,
    statewideAvgFormatted: formatCountyMetric(metric, statewideAvg),
    peers,
    peerChart: peerChart!,
    vitals: vitalsAll
      .filter((v) => v.metricKey !== metric)
      .map(({ label, value, hint }) => ({ label, value, hint })),
    sources: options?.sources ?? getMetricSources(metric),
    dataAsOf: options?.dataAsOf,
  };
}

export function headlineForCountyMetric(focus: CountyFocusSnapshot): string {
  const label = metricShortLabel(focus.metric);
  return `${focus.countyName} County · ${label} ${focus.metricFormatted}`;
}
