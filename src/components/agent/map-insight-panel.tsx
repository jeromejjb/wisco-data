"use client";

import { useShallow } from "zustand/react/shallow";
import type { ChoroplethMetric } from "@/lib/agent/map-actions";
import { useMapStore } from "@/lib/map-store";
import { MapLegend, METRIC_LABELS } from "@/components/map/map-legend";
import { cn } from "@/lib/utils";

const METRIC_HEADLINES: Record<ChoroplethMetric, string> = {
  unemployment: "Unemployment across Wisconsin",
  opportunity: "Where opportunity is strongest",
  "median-wage": "Wage landscape by county",
  "open-jobs": "Job openings by county",
  "transit-coverage": "Transit reach by county",
};

function formatValue(metric: ChoroplethMetric, value: number): string {
  switch (metric) {
    case "unemployment":
      return `${value.toFixed(1)}%`;
    case "median-wage":
      return `$${Math.round(value / 1000)}k`;
    case "open-jobs":
      return value.toLocaleString();
    default:
      return String(Math.round(value));
  }
}

type MapInsightPanelProps = {
  className?: string;
  compact?: boolean;
  showLegend?: boolean;
};

export function MapInsightPanel({ className, compact, showLegend = true }: MapInsightPanelProps) {
  const { choroplethMetric, choroplethValues, choroplethLabels } = useMapStore(
    useShallow((s) => ({
      choroplethMetric: s.choroplethMetric,
      choroplethValues: s.choroplethValues,
      choroplethLabels: s.choroplethLabels,
    }))
  );

  if (!choroplethMetric || Object.keys(choroplethValues).length === 0) return null;

  const entries = Object.entries(choroplethValues);
  const avg = entries.reduce((s, [, v]) => s + v, 0) / entries.length;
  const sorted = [...entries].sort((a, b) => b[1] - a[1]);
  const top = sorted[0];
  const bottom = sorted[sorted.length - 1];

  return (
    <div className={cn("space-y-3", className)}>
      <div className="rounded-xl border border-lake-500/15 bg-gradient-to-br from-lake-50/90 to-white p-3.5 dark:from-navy-900/60 dark:to-navy-950/40">
        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-lake-600 dark:text-lake-400">
          {METRIC_LABELS[choroplethMetric]}
        </p>
        <p className="mt-1 font-display text-[15px] font-semibold leading-snug text-[#0c1222] dark:text-white">
          {METRIC_HEADLINES[choroplethMetric]}
        </p>
        {!compact && (
          <div className="mt-2.5 flex flex-wrap gap-2">
            <StatPill label="Avg" value={formatValue(choroplethMetric, avg)} />
            {top && (
              <StatPill
                label="High"
                value={
                  choroplethLabels?.[top[0]] ?? formatValue(choroplethMetric, top[1])
                }
                tone="high"
              />
            )}
            {bottom && bottom[0] !== top?.[0] && (
              <StatPill
                label="Low"
                value={
                  choroplethLabels?.[bottom[0]] ??
                  formatValue(choroplethMetric, bottom[1])
                }
                tone="low"
              />
            )}
          </div>
        )}
      </div>
      {showLegend && (
        <MapLegend metric={choroplethMetric} className="!static !bottom-auto !left-auto w-full" />
      )}
    </div>
  );
}

function StatPill({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "high" | "low";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px]",
        tone === "high" && "bg-emerald-500/10 text-emerald-800 dark:text-emerald-300",
        tone === "low" && "bg-amber-500/10 text-amber-900 dark:text-amber-200",
        !tone && "bg-black/[0.04] text-[#3d4659] dark:bg-white/5 dark:text-white/70"
      )}
    >
      <span className="font-medium opacity-70">{label}</span>
      <span className="font-semibold tabular-nums">{value}</span>
    </span>
  );
}

export { METRIC_LABELS };
