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
    <div className={cn("relative z-10 flex items-center justify-between gap-3 border-b border-white/[0.06] px-4 py-3", className)}>
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
        // Floating glass slab: no hard border — hairline rim light + layered
        // contact/ambient shadows make it levitate over the map.
        // 8-digit hex alpha (no /modifier) so opacity can never misparse.
        "relative overflow-hidden rounded-[24px] bg-[#0e1626f5]",
        "ring-1 ring-inset ring-white/10",
        "shadow-[0_2px_6px_rgba(4,8,18,0.25),0_18px_44px_-8px_rgba(4,8,18,0.48),0_44px_90px_-18px_rgba(4,8,18,0.42)]",
        "backdrop-blur-2xl saturate-[1.15]",
        "before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:h-24 before:bg-gradient-to-b before:from-white/5 before:to-transparent",
        "after:pointer-events-none after:absolute after:-right-12 after:-top-12 after:h-36 after:w-36 after:rounded-full after:bg-cyan-400/10 after:blur-3xl",
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
