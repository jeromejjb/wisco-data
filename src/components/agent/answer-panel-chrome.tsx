"use client";

import { cn } from "@/lib/utils";

/** Section header without generic icons — accent bar + typography only. */
export function AnswerSectionHeader({
  label,
  meta,
  className,
}: {
  label: string;
  meta?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("relative z-10 flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3", className)}>
      <div className="flex min-w-0 items-center gap-2.5">
        <span className="accent-bar-glow h-4 w-0.5 shrink-0 rounded-full bg-gradient-to-b from-cyan-300 to-[#1e6b9c]" aria-hidden />
        <span className="font-display text-[11px] font-semibold uppercase tracking-[0.12em] text-white/90">
          {label}
        </span>
      </div>
      {meta}
    </div>
  );
}

export function AnswerCard({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border border-white/12 bg-[#0c1222]/92 shadow-[0_16px_56px_rgba(12,18,34,0.42)] backdrop-blur-xl",
        "before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:h-28 before:bg-gradient-to-b before:from-cyan-400/[0.08] before:via-transparent before:to-transparent",
        "after:pointer-events-none after:absolute after:-right-10 after:-top-10 after:h-32 after:w-32 after:rounded-full after:bg-cyan-400/10 after:blur-3xl",
        className
      )}
    >
      {children}
    </div>
  );
}

export function MapLegendHint({ children }: { children: React.ReactNode }) {
  return (
    <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] leading-relaxed text-white/45">
      {children}
    </p>
  );
}

export function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} aria-hidden />
      {label}
    </span>
  );
}
