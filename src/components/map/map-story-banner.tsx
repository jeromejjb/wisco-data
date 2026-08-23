"use client";

import type { ChoroplethMetric } from "@/lib/agent/map-actions";
import { fipsToSlug } from "@/lib/wi-counties";
import { cn } from "@/lib/utils";

const METRIC_HEADLINES: Record<ChoroplethMetric, string> = {
  unemployment: "Where unemployment is rising or easing",
  opportunity: "Where opportunity is strongest",
  "median-wage": "How wages vary across Wisconsin",
  "open-jobs": "Where job openings cluster",
  "transit-coverage": "Transit reach by county",
};

const METRIC_LABELS: Record<ChoroplethMetric, string> = {
  unemployment: "Unemployment rate",
  opportunity: "Opportunity index",
  "median-wage": "Median wage",
  "open-jobs": "Estimated openings",
  "transit-coverage": "Transit coverage",
};

function formatValue(metric: ChoroplethMetric, value: number): string {
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

type MapStoryBannerProps = {
  metric: ChoroplethMetric | null;
  values: Record<string, number>;
  labels?: Record<string, string>;
  className?: string;
  /** Dark glass legible over satellite imagery */
  onImagery?: boolean;
};

export function MapStoryBanner({
  metric,
  values,
  labels,
  className,
  onImagery,
}: MapStoryBannerProps) {
  if (!metric || Object.keys(values).length === 0) return null;

  const entries = Object.entries(values);
  const avg = entries.reduce((s, [, v]) => s + v, 0) / entries.length;
  const sorted = [...entries].sort((a, b) => b[1] - a[1]);
  const top = sorted[0];
  const bottom = sorted[sorted.length - 1];

  const topLabel = top && labels?.[top[0]] ? labels[top[0]] : top ? formatValue(metric, top[1]) : "";
  const bottomLabel =
    bottom && labels?.[bottom[0]] ? labels[bottom[0]] : bottom ? formatValue(metric, bottom[1]) : "";

  return (
    <div
      className={cn(
        "pointer-events-none absolute left-4 right-4 top-4 z-10 mx-auto max-w-md sm:left-4 sm:right-auto",
        className
      )}
    >
      <div
        className={cn(
          "rounded-2xl border px-4 py-3 shadow-xl backdrop-blur-md",
          onImagery
            ? "border-white/15 bg-navy-900/88 text-white"
            : "border-lake-200/80 bg-white/96 ring-1 ring-lake-500/10 dark:border-white/10 dark:bg-navy-900/90"
        )}
      >
        <p
          className={cn(
            "text-[10px] font-bold uppercase tracking-[0.14em]",
            onImagery ? "text-lake-300" : "text-lake-600 dark:text-lake-400"
          )}
        >
          {METRIC_LABELS[metric]}
        </p>
        <p
          className={cn(
            "mt-0.5 font-display text-sm font-semibold leading-snug",
            onImagery ? "text-white" : "text-foreground"
          )}
        >
          {METRIC_HEADLINES[metric]}
        </p>
        <div
          className={cn(
            "mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px]",
            onImagery ? "text-white/65" : "text-muted-foreground"
          )}
        >
          <span>
            State avg{" "}
            <strong className={cn("font-semibold", onImagery ? "text-white" : "text-foreground")}>
              {formatValue(metric, avg)}
            </strong>
          </span>
          {top && (
            <span>
              High{" "}
              <strong className={cn("font-semibold", onImagery ? "text-white" : "text-foreground")}>
                {topLabel}
              </strong>
            </span>
          )}
          {bottom && bottom[0] !== top?.[0] && (
            <span>
              Low{" "}
              <strong className={cn("font-semibold", onImagery ? "text-white" : "text-foreground")}>
                {bottomLabel}
              </strong>
            </span>
          )}
          <span>{entries.length} counties</span>
        </div>
      </div>
    </div>
  );
}

export function formatCountyDataValue(
  metric: ChoroplethMetric | null,
  fips: string,
  values: Record<string, number>,
  labels?: Record<string, string>
): string | null {
  if (!metric) return null;
  const label = labels?.[fips];
  if (label) return label;
  let val = values[fips];
  if (val === undefined) {
    const slug = fipsToSlug(fips);
    if (slug) val = values[slug];
  }
  if (val === undefined) return null;
  return formatValue(metric, val);
}
