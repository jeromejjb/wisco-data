"use client";

import { motion } from "framer-motion";
import { Bus, ExternalLink, Sparkles } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import type { LocalMapAnswer } from "@/lib/agent/local-map-answer";

type MapJobResultsPanelProps = {
  result: LocalMapAnswer;
  className?: string;
};

export function MapJobResultsPanel({ result, className }: MapJobResultsPanelProps) {
  const { jobs, stats, transitNote, subline } = result;
  const jobsHref = buildJobsLink(result);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "pointer-events-auto overflow-hidden rounded-2xl border border-white/15 bg-[#0c1222]/88 shadow-[0_12px_48px_rgba(12,18,34,0.35)] backdrop-blur-xl",
        className
      )}
    >
      <div className="border-b border-white/10 px-4 py-2.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.14em] text-cyan-300/90">
            <Sparkles className="h-3.5 w-3.5" />
            Live results
          </div>
          {stats.liveCount != null && stats.liveCount > 0 && (
            <span className="rounded-full bg-cyan-400/15 px-2 py-0.5 text-[9px] font-semibold text-cyan-200">
              {stats.liveCount} from Adzuna
            </span>
          )}
        </div>
      </div>

      <div className="space-y-3 px-4 py-3.5">
        {subline && <p className="text-[12px] leading-snug text-white/55">{subline}</p>}

        {stats.total > 0 && (
          <div className="flex flex-wrap gap-2">
            <StatChip label="Listings" value={String(stats.total)} />
            {stats.transitCount > 0 && (
              <StatChip label="On transit" value={String(stats.transitCount)} accent />
            )}
          </div>
        )}

        {transitNote && (
          <p className="flex items-start gap-2 rounded-xl bg-white/5 px-3 py-2 text-[11px] leading-snug text-white/70">
            <Bus className="mt-0.5 h-3.5 w-3.5 shrink-0 text-cyan-300" />
            {transitNote}
          </p>
        )}

        {jobs.length > 0 && (
          <ul className="max-h-[220px] space-y-2 overflow-y-auto pr-0.5">
            {jobs.slice(0, 6).map((job) => (
              <li
                key={job.id}
                className="rounded-xl border border-white/8 bg-white/[0.04] px-3 py-2.5 transition-colors hover:bg-white/[0.07]"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-semibold text-white">{job.title}</p>
                    <p className="truncate text-[11px] text-white/50">
                      {job.employer} · {job.city}
                    </p>
                  </div>
                  {job.payLabel && (
                    <span className="shrink-0 text-[11px] font-semibold tabular-nums text-emerald-300">
                      {job.payLabel}
                    </span>
                  )}
                </div>
                <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                  {job.transitAccessible && (
                    <span className="rounded-md bg-[#1e6b9c]/30 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-cyan-200">
                      Bus reach
                    </span>
                  )}
                  {job.commuteMinutes != null && (
                    <span className="text-[10px] text-white/40">~{job.commuteMinutes} min commute</span>
                  )}
                  {job.applicationUrl && (
                    <a
                      href={job.applicationUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-auto inline-flex items-center gap-0.5 text-[10px] font-semibold text-cyan-300 hover:underline"
                    >
                      Apply <ExternalLink className="h-2.5 w-2.5" />
                    </a>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}

        {jobsHref && (
          <Link
            href={jobsHref}
            className="flex h-9 items-center justify-center rounded-xl bg-[#1e6b9c]/90 text-[12px] font-semibold text-white hover:bg-[#185580]"
          >
            Open full job board
          </Link>
        )}
      </div>
    </motion.div>
  );
}

function StatChip({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px]",
        accent ? "bg-cyan-400/15 text-cyan-100" : "bg-white/8 text-white/75"
      )}
    >
      <span className="opacity-70">{label}</span>
      <span className="font-bold tabular-nums">{value}</span>
    </span>
  );
}

function buildJobsLink(result: LocalMapAnswer): string | null {
  if (!result.jobs.length) return null;
  const qs = new URLSearchParams();
  const h = result.headline.toLowerCase();
  if (h.includes("cna")) qs.set("q", "CNA");
  else if (h.includes("nurse")) qs.set("q", "nurse");
  if (result.transitNote) qs.set("transit", "true");
  qs.set("rank", "true");
  return `/jobs?${qs}`;
}
