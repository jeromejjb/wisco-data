"use client";

import { cn } from "@/lib/utils";
import {
  classifyCommute,
  commuteHealthColors,
  commuteHealthLabel,
  type CommuteHealthTier,
} from "@/lib/commute-policy";

type CommuteHealthBadgeProps = {
  minutes: number;
  mode?: "transit" | "drive";
  distanceKm?: number;
  walkMinutes?: number;
  transfers?: number;
  compact?: boolean;
  className?: string;
};

export function CommuteHealthBadge({
  minutes,
  mode = "transit",
  distanceKm,
  walkMinutes,
  transfers,
  compact,
  className,
}: CommuteHealthBadgeProps) {
  const tier = classifyCommute(minutes);
  const colors = commuteHealthColors(tier);

  return (
    <div className={cn("space-y-1", className)}>
      <div className="flex flex-wrap items-center gap-1.5">
        <span
          className={cn(
            "inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-semibold ring-1",
            colors.bg,
            colors.text,
            colors.ring
          )}
        >
          {formatCommuteTime(minutes, mode)} · {commuteHealthLabel(tier)}
        </span>
        {!compact && tier !== "unhealthy" && distanceKm != null && (
          <span className="text-[10px] tabular-nums text-white/40">
            {formatDistance(distanceKm)} from search
          </span>
        )}
      </div>
      {!compact && mode === "transit" && (walkMinutes != null || transfers != null) && (
        <p className="text-[10px] leading-snug text-white/45">
          {transfers != null && `${transfers} transfer${transfers === 1 ? "" : "s"}`}
          {walkMinutes != null && transfers != null && " · "}
          {walkMinutes != null && `${walkMinutes} min walk`}
        </p>
      )}
    </div>
  );
}

export function CommuteHealthDot({ tier }: { tier: CommuteHealthTier }) {
  const color =
    tier === "excellent"
      ? "bg-emerald-400"
      : tier === "good"
        ? "bg-amber-400"
        : "bg-rose-400";
  return <span className={cn("inline-block h-1.5 w-1.5 rounded-full", color)} aria-hidden />;
}

function formatCommuteTime(minutes: number, mode: "transit" | "drive"): string {
  const label = mode === "drive" ? "drive" : "transit";
  if (minutes < 60) return `~${minutes} min ${label}`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `~${h}h ${m}m ${label}` : `~${h}h ${label}`;
}

function formatDistance(km: number): string {
  const mi = km * 0.621371;
  return mi < 10 ? `${mi.toFixed(1)} mi` : `${Math.round(mi)} mi`;
}
