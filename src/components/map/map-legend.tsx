"use client";

import type { ExpressionSpecification as Expression } from "maplibre-gl";
import { cn } from "@/lib/utils";
import type { ChoroplethMetric } from "@/lib/agent/map-actions";
import { FIPS_BY_COUNTY_ID } from "@/lib/wi-counties";

export const METRIC_LABELS: Record<ChoroplethMetric, string> = {
  unemployment: "Unemployment rate",
  opportunity: "Opportunity index",
  "median-wage": "Median wage",
  "open-jobs": "Estimated openings",
  "transit-coverage": "Transit coverage",
};

export function formatMetricScaleEndpoint(
  metric: ChoroplethMetric,
  end: "min" | "max"
): string {
  const stops = METRIC_STOPS[metric];
  const value = end === "min" ? stops[0][0] : stops[stops.length - 1][0];
  switch (metric) {
    case "unemployment":
      return `${value.toFixed(1)}%`;
    case "median-wage":
      return `$${Math.round(value / 1000)}k`;
    case "open-jobs":
      return value >= 1000 ? `${Math.round(value / 1000)}k` : String(value);
    case "opportunity":
    case "transit-coverage":
      return String(Math.round(value));
    default:
      return String(value);
  }
}

export const METRIC_STOPS: Record<ChoroplethMetric, [number, string][]> = {
  unemployment: [
    [2.0, "#06b6d4"],
    [3.0, "#22d3ee"],
    [3.5, "#a3e635"],
    [4.5, "#fbbf24"],
    [6.0, "#f43f5e"],
  ],
  opportunity: [
    [40, "#f43f5e"],
    [55, "#fb923c"],
    [65, "#fde047"],
    [75, "#34d399"],
    [90, "#6366f1"],
  ],
  "median-wage": [
    [40000, "#818cf8"],
    [48000, "#38bdf8"],
    [52000, "#2dd4bf"],
    [58000, "#4ade80"],
    [65000, "#a855f7"],
  ],
  "open-jobs": [
    [2000, "#38bdf8"],
    [5000, "#2dd4bf"],
    [10000, "#a3e635"],
    [20000, "#fbbf24"],
    [30000, "#f97316"],
  ],
  "transit-coverage": [
    [10, "#6366f1"],
    [25, "#38bdf8"],
    [40, "#2dd4bf"],
    [55, "#4ade80"],
    [70, "#fde047"],
  ],
};

type MapLegendProps = {
  metric: ChoroplethMetric | null;
  className?: string;
};

export function MapLegend({ metric, className }: MapLegendProps) {
  if (!metric) return null;

  const stops = METRIC_STOPS[metric];

  return (
    <div
      className={cn(
        "pointer-events-none overflow-hidden rounded-2xl shadow-2xl",
        className?.includes("!static") ? "" : "absolute bottom-4 left-4 z-10",
        className
      )}
    >
      <div className="border border-white/10 bg-navy-900/85 px-4 py-3 backdrop-blur-xl">
        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-white/70">
          {METRIC_LABELS[metric]}
        </p>
        <div
          className="mt-2.5 h-3 w-44 rounded-full ring-1 ring-white/20 shadow-inner"
          style={{
            background: `linear-gradient(to right, ${stops.map(([, c]) => c).join(", ")})`,
          }}
        />
        <div className="mt-1.5 flex justify-between font-mono text-[10px] tabular-nums text-white/70">
          <span>{formatMetricScaleEndpoint(metric, "min")}</span>
          <span>{formatMetricScaleEndpoint(metric, "max")}</span>
        </div>
      </div>
    </div>
  );
}

export function buildChoroplethExpression(
  metric: ChoroplethMetric,
  fipsToValue: Record<string, number>,
  noDataColor = "#dce8f0"
): Expression {
  const stops = METRIC_STOPS[metric];
  const matchPairs: (string | number)[] = [];

  for (const [fips, value] of Object.entries(fipsToValue)) {
    matchPairs.push(fips, value);
  }

  if (matchPairs.length === 0) {
    return ["literal", noDataColor] as Expression;
  }

  const valueExpr = [
    "match",
    ["get", "fips"],
    ...matchPairs,
    -999,
  ] as unknown as Expression;

  const colorStops: (number | string)[] = [];
  for (const [val, color] of stops) {
    colorStops.push(val, color);
  }

  return [
    "case",
    ["==", valueExpr, -999],
    noDataColor,
    ["interpolate", ["linear"], valueExpr, ...colorStops],
  ] as Expression;
}

export function fipsValuesFromCountyIds(
  countyValues: Record<string, number>
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [id, val] of Object.entries(countyValues)) {
    if (/^\d{5}$/.test(id)) {
      out[id] = val;
      continue;
    }
    const fips = FIPS_BY_COUNTY_ID[id];
    if (fips) out[fips] = val;
  }
  return out;
}
