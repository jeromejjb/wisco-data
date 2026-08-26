"use client";

import { cn } from "@/lib/utils";
import {
  classifyCommute,
  commuteHealthColors,
  commuteHealthLabel,
  type CommuteHealthTier,
} from "@/lib/commute-policy";
import { ArrowLeftRight, Bus, Car, Footprints, Navigation } from "lucide-react";

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
  const ModeIcon = mode === "drive" ? Car : Bus;

  return (
    <div className={cn("space-y-1", className)}>
      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1",
            colors.bg,
            colors.text,
            colors.ring
          )}
          title="Estimated from GTFS schedules"
        >
          <ModeIcon className="h-3 w-3 shrink-0" aria-hidden />
          <span className="tabular-nums">{formatCommuteTime(minutes)}</span>
          <span aria-hidden>·</span>
          {commuteHealthLabel(tier)}
        </span>
        {!compact && tier !== "unhealthy" && distanceKm != null && (
          <span className="inline-flex items-center gap-1 text-[10px] font-medium tabular-nums text-white/45">
            <Navigation className="h-2.5 w-2.5 shrink-0 text-white/30" aria-hidden />
            {formatDistance(distanceKm)} away
          </span>
        )}
      </div>
      {!compact && mode === "transit" && (walkMinutes != null || transfers != null) && (
        <p className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[10px] leading-snug text-white/45">
          {transfers != null && (
            <span className="inline-flex items-center gap-1">
              <ArrowLeftRight className="h-2.5 w-2.5 shrink-0 text-white/30" aria-hidden />
              {transfers === 0 ? "Direct route" : `${transfers} transfer${transfers === 1 ? "" : "s"}`}
            </span>
          )}
          {walkMinutes != null && walkMinutes > 0 && (
            <span className="inline-flex items-center gap-1 tabular-nums">
              <Footprints className="h-2.5 w-2.5 shrink-0 text-white/30" aria-hidden />
              {walkMinutes} min walk
            </span>
          )}
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

function formatCommuteTime(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function formatDistance(km: number): string {
  const mi = km * 0.621371;
  // One decimal only for short walks; whole miles read cleaner past that.
  return mi < 3 ? `${mi.toFixed(1)} mi` : `${Math.round(mi)} mi`;
}
