"use client";

import { motion } from "framer-motion";
import { TrendingUp, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CountyFocusSnapshot } from "@/lib/map-county-metrics";
import { metricShortLabel } from "@/lib/map-county-metrics";
import type { ChoroplethMetric } from "@/lib/agent/map-actions";
import { METRIC_STOPS, METRIC_LABELS } from "@/components/map/map-legend";

type MapGranularInsightProps = {
  focus: CountyFocusSnapshot;
  className?: string;
};

export function MapGranularInsight({ focus, className }: MapGranularInsightProps) {
  const gaugePct = gaugePercent(focus.metric, focus.metricValue);
  const stops = METRIC_STOPS[focus.metric];
  const gradient = `linear-gradient(to right, ${stops.map(([, c]) => c).join(", ")})`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "overflow-hidden rounded-2xl border border-white/15 bg-[#0c1222]/88 shadow-[0_12px_48px_rgba(12,18,34,0.35)] backdrop-blur-xl",
        className
      )}
    >
      <div className="border-b border-white/10 px-4 py-2.5">
        <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.14em] text-cyan-300/90">
          <MapPin className="h-3.5 w-3.5" />
          {focus.countyName} County
        </div>
      </div>

      <div className="space-y-4 px-4 py-4">
        <div className="flex items-center gap-4">
          <div className="relative h-[72px] w-[72px] shrink-0">
            <svg viewBox="0 0 36 36" className="h-full w-full -rotate-90">
              <circle cx="18" cy="18" r="15.5" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="3" />
              <circle
                cx="18"
                cy="18"
                r="15.5"
                fill="none"
                stroke="url(#gauge-gradient)"
                strokeWidth="3"
                strokeLinecap="round"
                strokeDasharray={`${gaugePct * 97} 97`}
              />
              <defs>
                <linearGradient id="gauge-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  {stops.map(([offset, color], i) => (
                    <stop
                      key={offset}
                      offset={`${(i / (stops.length - 1)) * 100}%`}
                      stopColor={color}
                    />
                  ))}
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="font-display text-sm font-bold leading-none text-white">
                {focus.metric === "opportunity" ? focus.metricValue : focus.metricFormatted.slice(0, 5)}
              </span>
            </div>
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-wider text-white/45">
              {metricShortLabel(focus.metric)}
            </p>
            <p className="font-display text-[22px] font-bold leading-tight text-white">
              {focus.metricFormatted}
            </p>
            <p className="mt-0.5 text-[11px] text-white/55">
              Rank #{focus.rank} · top {focus.percentile}% of WI counties tracked
            </p>
            <p className="text-[10px] text-white/40">
              State avg {focus.statewideAvgFormatted}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {focus.vitals.slice(0, 6).map((v) => (
            <div
              key={v.label}
              className="rounded-xl border border-white/8 bg-white/[0.04] px-2.5 py-2"
            >
              <p className="text-[9px] font-semibold uppercase tracking-wide text-white/40">
                {v.label}
              </p>
              <p className="mt-0.5 font-display text-[14px] font-bold tabular-nums text-white">
                {v.value}
              </p>
              {v.hint && (
                <p className="mt-0.5 text-[9px] leading-tight text-white/35">{v.hint}</p>
              )}
            </div>
          ))}
        </div>

        <div>
          <div className="mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-white/45">
            <TrendingUp className="h-3 w-3" />
            Top counties · {METRIC_LABELS[focus.metric]}
          </div>
          <ul className="space-y-1.5">
            {focus.peers.map((peer, i) => (
              <li key={peer.id} className="flex items-center gap-2">
                <span
                  className={cn(
                    "w-14 shrink-0 truncate text-[10px] font-medium",
                    peer.id === focus.countyId ? "text-cyan-300" : "text-white/55"
                  )}
                >
                  {peer.name}
                </span>
                <div className="relative h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-white/8">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${peer.pct}%` }}
                    transition={{ delay: i * 0.06, duration: 0.45, ease: "easeOut" }}
                    className="absolute inset-y-0 left-0 rounded-full"
                    style={{
                      background:
                        peer.id === focus.countyId
                          ? "linear-gradient(90deg, #22d3ee, #6366f1)"
                          : "linear-gradient(90deg, rgba(255,255,255,0.25), rgba(255,255,255,0.12))",
                    }}
                  />
                </div>
                <span className="w-10 shrink-0 text-right font-mono text-[10px] tabular-nums text-white/70">
                  {peer.formatted}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-xl border border-white/8 bg-black/20 px-3 py-2">
          <p className="text-[9px] font-bold uppercase tracking-wider text-white/40">Map scale</p>
          <div
            className="mt-1.5 h-2 w-full rounded-full ring-1 ring-white/15"
            style={{ background: gradient }}
          />
          <div className="mt-1 flex justify-between font-mono text-[9px] text-white/45">
            <span>Low</span>
            <span>High</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function gaugePercent(metric: ChoroplethMetric, value: number): number {
  switch (metric) {
    case "unemployment":
      return Math.min(1, Math.max(0.08, (value - 2) / 5));
    case "opportunity":
      return Math.min(1, Math.max(0.08, value / 100));
    case "median-wage":
      return Math.min(1, Math.max(0.08, (value - 35000) / 35000));
    case "open-jobs":
      return Math.min(1, Math.max(0.08, value / 30000));
    case "transit-coverage":
      return Math.min(1, Math.max(0.08, value / 80));
    default:
      return 0.5;
  }
}
