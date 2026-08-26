"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { cn } from "@/lib/utils";
import type { LocalMapAnswer } from "@/lib/agent/local-map-answer";
import { AnswerCard, AnswerSectionHeader } from "./answer-panel-chrome";
import { CommuteHealthBadge } from "./commute-health-badge";
import { COMMUTE_POLICY } from "@/lib/commute-policy";

type MapJobResultsPanelProps = {
  result: LocalMapAnswer;
  className?: string;
};

const listVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.055, delayChildren: 0.05 } },
};

const itemVariants = {
  hidden: { opacity: 0, x: -10 },
  visible: { opacity: 1, x: 0, transition: { type: "spring" as const, stiffness: 320, damping: 28 } },
};

export function MapJobResultsPanel({ result, className }: MapJobResultsPanelProps) {
  const { jobs, stats, transitNote, healthNote, subline } = result;
  const jobsHref = buildJobsLink(result);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn("pointer-events-auto", className)}
    >
      <AnswerCard>
        <AnswerSectionHeader
          label="Matching roles"
          meta={
            stats.liveCount != null && stats.liveCount > 0 ? (
              <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-emerald-400/10 px-2 py-0.5 text-[9px] font-medium tabular-nums text-emerald-200/90 ring-1 ring-emerald-400/20">
                <span className="live-dot h-1.5 w-1.5 rounded-full bg-emerald-400" aria-hidden />
                {stats.liveCount} live
              </span>
            ) : undefined
          }
        />

        <div className="relative z-10 space-y-3.5 px-4 py-4">
          {subline && (
            <p className="text-[13px] leading-snug text-white/65">{subline}</p>
          )}

          {stats.total > 0 && (
            <div className="grid grid-cols-3 gap-2">
              <MetricTile label="Shown" value={String(stats.total)} />
              <MetricTile label="≤45 min" value={String(stats.healthyCount)} accent="emerald" />
              <MetricTile label="Transit" value={String(stats.transitCount)} accent="cyan" />
            </div>
          )}

          {healthNote && (
            <p className="rounded-xl border border-emerald-400/15 bg-emerald-400/[0.06] px-3 py-2.5 text-[11px] leading-relaxed text-emerald-100/85">
              {healthNote}
            </p>
          )}

          {transitNote && (
            <p className="text-[11px] leading-relaxed text-white/50">{transitNote}</p>
          )}

          {jobs.length > 0 && (
            <motion.ul
              variants={listVariants}
              initial="hidden"
              animate="visible"
              className="max-h-[280px] space-y-2 overflow-y-auto pr-0.5"
            >
              {jobs.slice(0, 6).map((job, index) => (
                <motion.li
                  key={job.id}
                  variants={itemVariants}
                  whileHover={{ y: -3, scale: 1.012 }}
                  whileTap={{ scale: 0.99 }}
                  transition={{ type: "spring", stiffness: 400, damping: 24 }}
                  className="group relative overflow-hidden rounded-xl border border-white/8 bg-gradient-to-br from-white/[0.07] to-white/[0.02] px-3.5 py-3 shadow-[0_2px_10px_rgba(0,0,0,0.15)] transition-[border-color,box-shadow] hover:border-cyan-300/25 hover:shadow-[0_10px_28px_rgba(34,211,238,0.12)]"
                >
                  <span
                    className="absolute inset-y-0 left-0 w-[3px] bg-gradient-to-b from-cyan-300 to-[#1e6b9c] opacity-0 transition-opacity group-hover:opacity-100"
                    aria-hidden
                  />
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-400/20 to-[#1e6b9c]/20 font-mono text-[11px] font-bold tabular-nums text-cyan-200 ring-1 ring-cyan-300/20">
                      {index + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-[13px] font-semibold leading-snug text-white">{job.title}</p>
                          <p className="text-[11px] leading-snug text-white/50">
                            {job.employer}
                            <span className="text-white/30"> · </span>
                            {job.city}
                          </p>
                        </div>
                        {job.payLabel && (
                          <span className="shrink-0 rounded-md bg-gradient-to-r from-emerald-400/15 to-emerald-500/10 px-1.5 py-0.5 text-[11px] font-semibold tabular-nums text-emerald-200 ring-1 ring-emerald-400/20">
                            {job.payLabel}
                          </span>
                        )}
                      </div>

                      {job.commuteMinutes != null && (
                        <div className="mt-2">
                          <CommuteHealthBadge
                            minutes={job.commuteMinutes}
                            mode={job.commuteMode ?? "transit"}
                            distanceKm={job.distanceKm}
                            walkMinutes={job.walkMinutes}
                            transfers={job.transfers}
                            compact
                          />
                        </div>
                      )}

                      {job.applicationUrl && (
                        <a
                          href={job.applicationUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-cyan-300/90 underline-offset-2 hover:text-cyan-200 hover:underline"
                        >
                          View posting
                          <span className="inline-block transition-transform group-hover:translate-x-0.5">→</span>
                        </a>
                      )}
                    </div>
                  </div>
                </motion.li>
              ))}
            </motion.ul>
          )}

          {jobsHref && (
            <motion.div whileHover={{ scale: 1.015 }} whileTap={{ scale: 0.985 }}>
              <Link
                href={jobsHref}
                className="shine-sweep flex h-10 items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-[#1e6b9c] to-[#185580] text-[12px] font-semibold text-white shadow-md shadow-[#1e6b9c]/20 transition hover:brightness-110"
              >
                Explore all on job board
                <span aria-hidden>→</span>
              </Link>
            </motion.div>
          )}
        </div>
      </AnswerCard>
    </motion.div>
  );
}

function MetricTile({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: "emerald" | "cyan";
}) {
  return (
    <motion.div
      whileHover={{ y: -2, scale: 1.03 }}
      transition={{ type: "spring", stiffness: 400, damping: 22 }}
      className={cn(
        "rounded-xl border px-2.5 py-2 text-center",
        accent === "emerald"
          ? "border-emerald-400/20 bg-gradient-to-b from-emerald-400/[0.1] to-emerald-400/[0.02]"
          : accent === "cyan"
            ? "border-cyan-400/20 bg-gradient-to-b from-cyan-400/[0.1] to-cyan-400/[0.02]"
            : "border-white/10 bg-gradient-to-b from-white/[0.06] to-white/[0.02]"
      )}
    >
      <p className="text-[9px] font-semibold uppercase tracking-wide text-white/40">{label}</p>
      <p
        className={cn(
          "mt-0.5 font-display text-[16px] font-bold tabular-nums",
          accent === "emerald" ? "text-emerald-200" : accent === "cyan" ? "text-cyan-200" : "text-white"
        )}
      >
        {value}
      </p>
    </motion.div>
  );
}

function buildJobsLink(result: LocalMapAnswer): string | null {
  if (!result.jobs.length) return null;
  const qs = new URLSearchParams();
  const h = result.headline.toLowerCase();
  if (h.includes("cna")) qs.set("q", "CNA");
  else if (h.includes("nurse")) qs.set("q", "nurse");
  qs.set("maxCommute", String(COMMUTE_POLICY.recommendedMaxMinutes));
  qs.set("rank", "true");
  return `/jobs?${qs}`;
}
