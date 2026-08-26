"use client";

import { useCallback, useLayoutEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import type { LocalMapAnswer } from "@/lib/agent/local-map-answer";

export function JobSheetSummary({ result }: { result: LocalMapAnswer }) {
  const { stats, subline } = result;
  if (!stats.total && !subline) return null;

  return (
    <div className="shrink-0 space-y-1.5 border-b border-white/8 px-4 py-2">
      {subline ? (
        <p className="text-[12px] leading-snug text-white/55">{subline}</p>
      ) : null}
      {stats.total > 0 ? (
        <p className="flex flex-wrap gap-x-2 gap-y-0.5 text-[11px] tabular-nums text-white/45">
          <span>{stats.healthyCount} within 45 min</span>
          {stats.transitCount > 0 ? <span>· {stats.transitCount} transit</span> : null}
          {stats.liveCount ? <span>· {stats.liveCount} live</span> : null}
        </p>
      ) : null}
    </div>
  );
}

export function CompactJobList({
  jobs,
  selectedJobId,
  onFocusJob,
}: {
  jobs: LocalMapAnswer["jobs"];
  selectedJobId?: string | null;
  onFocusJob?: (job: LocalMapAnswer["jobs"][number]) => void;
}) {
  const listRef = useRef<HTMLUListElement>(null);
  const [moreBelow, setMoreBelow] = useState(false);

  const updateOverflow = useCallback(() => {
    const el = listRef.current;
    if (!el) return;
    setMoreBelow(el.scrollHeight - el.scrollTop - el.clientHeight > 12);
  }, []);

  useLayoutEffect(() => {
    updateOverflow();
    const el = listRef.current;
    if (!el) return;
    const observer = new ResizeObserver(updateOverflow);
    observer.observe(el);
    return () => observer.disconnect();
  }, [jobs.length, updateOverflow]);

  useLayoutEffect(() => {
    if (!selectedJobId || !listRef.current) return;
    const row = listRef.current.querySelector('[aria-current="true"]');
    row?.scrollIntoView({ block: "nearest" });
  }, [selectedJobId]);

  if (!jobs.length) return null;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="relative min-h-0 flex-1">
        <ul
          ref={listRef}
          onScroll={updateOverflow}
          className="job-sheet-scroll h-full min-h-0 overflow-y-auto overscroll-contain"
          aria-label={`${jobs.length} job roles. Scroll to see all.`}
        >
          {jobs.map((job) => {
            const selected = selectedJobId === job.id;
            return (
              <li key={job.id} className="border-t border-white/8 first:border-t-0">
                <div
                  className={cn(
                    "flex items-stretch",
                    selected && "bg-cyan-400/[0.08]"
                  )}
                >
                  <button
                    type="button"
                    onClick={() => onFocusJob?.(job)}
                    aria-current={selected ? "true" : undefined}
                    aria-label={`${job.title} at ${job.employer}. Show on map.`}
                    className="flex min-h-[52px] min-w-0 flex-1 items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-white/[0.05] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-cyan-300/70"
                  >
                    <span
                      className={cn(
                        "w-[3px] shrink-0 self-stretch rounded-full",
                        selected ? "bg-cyan-300" : "bg-transparent"
                      )}
                      aria-hidden
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[14px] font-semibold leading-snug text-white">
                        {job.title}
                      </span>
                      <span className="mt-0.5 block truncate text-[12px] leading-snug text-white/55">
                        {job.employer}
                        {job.city ? ` · ${job.city}` : ""}
                        {job.commuteMinutes != null ? ` · ${job.commuteMinutes} min` : ""}
                      </span>
                    </span>
                    {job.payLabel ? (
                      <span className="shrink-0 text-[13px] font-semibold tabular-nums text-emerald-200">
                        {job.payLabel}
                      </span>
                    ) : null}
                  </button>
                  {job.applicationUrl ? (
                    <a
                      href={job.applicationUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex min-h-[52px] shrink-0 items-center px-3 text-[12px] font-semibold text-cyan-200 hover:bg-white/[0.06] hover:text-cyan-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-cyan-300/70"
                    >
                      Apply
                      <span className="sr-only">
                        {" "}
                        for {job.title} at {job.employer} (opens in a new tab)
                      </span>
                    </a>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
        {moreBelow ? (
          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-[#0c1222] to-transparent"
            aria-hidden
          />
        ) : null}
      </div>
      <p className="shrink-0 border-t border-white/8 px-4 py-2.5 text-[12px] leading-snug text-white/55">
        {moreBelow
          ? `Scroll for more · ${jobs.length} roles`
          : selectedJobId
            ? "Pinned on the map · tap another role to move"
            : `${jobs.length} roles · tap a role to see it on the map`}
      </p>
    </div>
  );
}
