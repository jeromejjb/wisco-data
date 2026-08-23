"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CountyFocusSnapshot } from "@/lib/map-county-metrics";
import {
  formatRankContext,
  formatStateAvgLabel,
  metricShortLabel,
  peersSectionTitle,
} from "@/lib/map-county-metrics";
import { formatDataAsOf } from "@/lib/economy-metric-sources";
import type { ChoroplethMetric } from "@/lib/agent/map-actions";
import { METRIC_STOPS } from "@/components/map/map-legend";
import { FIPS_BY_COUNTY_ID } from "@/lib/wi-counties";
import { AnswerCard, AnswerSectionHeader } from "./answer-panel-chrome";

type MapGranularInsightProps = {
  focus: CountyFocusSnapshot;
  className?: string;
};

export function MapGranularInsight({ focus, className }: MapGranularInsightProps) {
  const [expanded, setExpanded] = useState(false);
  const gaugePct = gaugePercent(focus.metric, focus.metricValue);
  const stops = METRIC_STOPS[focus.metric];
  const focusFips = FIPS_BY_COUNTY_ID[focus.countyId];
  const visibleVitals = focus.vitals.slice(0, expanded ? 6 : 3);
  const hasMore = focus.vitals.length > 3 || focus.peers.length > 0 || focus.sources.length > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn("pointer-events-auto", className)}
    >
      <AnswerCard>
        <AnswerSectionHeader label={`${focus.countyName} County`} />

        <div className="space-y-3 px-4 py-3.5">
          <div className="flex items-center gap-4">
            <div className="relative h-[56px] w-[56px] shrink-0">
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
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-wider text-white/45">
                {metricShortLabel(focus.metric)}
              </p>
              <p className="font-display text-[22px] font-bold leading-tight text-white">
                {focus.metricFormatted}
              </p>
              <p className="mt-0.5 text-[11px] leading-snug text-white/55">
                {formatRankContext(focus)}
              </p>
              <p className="text-[10px] text-white/40">
                {formatStateAvgLabel(focus)}
              </p>
            </div>
          </div>

          {visibleVitals.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {visibleVitals.map((v) => (
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
          )}

          {hasMore && (
            <button
              type="button"
              onClick={() => setExpanded((e) => !e)}
              className="county-expand-toggle pointer-events-auto flex w-full items-center justify-center gap-1 rounded-lg py-1 text-[10px] font-semibold uppercase tracking-wide text-cyan-300/80 transition-colors hover:text-cyan-200"
            >
              {expanded ? "Show less" : "Compare counties & sources"}
              <ChevronDown
                className={cn("h-3 w-3 transition-transform", expanded && "rotate-180")}
              />
            </button>
          )}

          <AnimatePresence initial={false}>
            {expanded && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
                className="space-y-3 overflow-hidden"
              >
              <div>
                <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-white/45">
                  {peersSectionTitle(focus.metric)}
                </p>
                <div className="rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2.5">
                  <div className="mb-2 flex justify-between text-[9px] tabular-nums text-white/35">
                    <span>{focus.peerChart.minLabel}</span>
                    <span>{focus.peerChart.maxLabel}</span>
                  </div>
                  <ul className="space-y-2.5">
                    {focus.peers.map((peer, i) => {
                      const isFocus =
                        peer.id === focus.countyId ||
                        peer.id === focusFips ||
                        peer.name === focus.countyName;
                      return (
                        <li key={peer.id} className="grid grid-cols-[1.125rem_3.5rem_1fr_2.5rem] items-center gap-2">
                          <span className="text-[9px] font-bold tabular-nums text-white/30">
                            {i + 1}
                          </span>
                          <span
                            className={cn(
                              "truncate text-[10px] font-medium leading-tight",
                              isFocus ? "text-cyan-300" : "text-white/60"
                            )}
                            title={peer.name}
                          >
                            {peer.name}
                          </span>
                          <div className="relative h-3 min-w-0">
                            <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-white/12" />
                            <motion.div
                              initial={{ left: "0%", opacity: 0 }}
                              animate={{ left: `${peer.axisPct}%`, opacity: 1 }}
                              transition={{ delay: i * 0.07, duration: 0.5, ease: "easeOut" }}
                              className={cn(
                                "absolute top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 shadow-sm",
                                isFocus
                                  ? "border-cyan-200 bg-cyan-400 shadow-cyan-500/30"
                                  : "border-white/80 bg-white/90"
                              )}
                            />
                          </div>
                          <span
                            className={cn(
                              "text-right font-mono text-[10px] tabular-nums",
                              isFocus ? "font-semibold text-cyan-200" : "text-white/70"
                            )}
                          >
                            {peer.formatted}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </div>

              {focus.sources.length > 0 && (
                <div className="border-t border-white/8 pt-3">
                  <p className="text-[9px] font-bold uppercase tracking-wider text-white/35">
                    Sources
                  </p>
                  <p className="mt-1.5 flex flex-wrap items-center gap-x-1 gap-y-1 text-[10px] text-white/55">
                    {focus.sources.map((source, i) => (
                      <span key={source.href}>
                        {i > 0 && (
                          <span className="text-white/25" aria-hidden>
                            {" · "}
                          </span>
                        )}
                        <a
                          href={source.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="underline-offset-2 transition-colors hover:text-cyan-200 hover:underline"
                        >
                          {source.label}
                        </a>
                      </span>
                    ))}
                  </p>
                  {formatDataAsOf(focus.dataAsOf) && (
                    <p className="mt-1 text-[9px] text-white/30">
                      County rates updated {formatDataAsOf(focus.dataAsOf)}
                    </p>
                  )}
                </div>
              )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </AnswerCard>
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
