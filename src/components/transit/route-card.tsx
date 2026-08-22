"use client";

import { motion } from "framer-motion";
import { Bus, Footprints, TrainFront, AlertTriangle } from "lucide-react";
import type { TransitRoute } from "@/lib/types";
import { cn, formatDuration } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

const modeIcons = {
  walk: Footprints,
  bus: Bus,
  rail: TrainFront,
  brt: Bus,
  bike: Footprints,
  "park-and-ride": Bus,
};

export function RouteCard({
  route,
  selected,
  onSelect,
}: {
  route: TransitRoute;
  selected?: boolean;
  onSelect?: () => void;
}) {
  const Icon = modeIcons[route.legs[0]?.mode ?? "walk"];

  return (
    <Card
      className={cn(
        "cursor-pointer transition-all hover:shadow-md",
        selected && "ring-2 ring-lake-600"
      )}
      onClick={onSelect}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onSelect?.()}
    >
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <Badge variant="default" className="mb-2">
              {route.label}
            </Badge>
            <p className="text-3xl font-bold tabular-nums tracking-tight">
              {formatDuration(route.durationMinutes)}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {route.departureTime} → {route.arrivalTime}
            </p>
          </div>
          <div className="text-right">
            <p className="text-lg font-semibold">${route.fare.toFixed(2)}</p>
            <p className="text-xs text-muted-foreground">{route.frequency}</p>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-3 text-sm text-muted-foreground">
          <span>{route.transfers} transfer{route.transfers !== 1 ? "s" : ""}</span>
          <span>·</span>
          <span>{route.walkMinutes} min walk</span>
          <span>·</span>
          <ReliabilityBadge level={route.reliability} />
        </div>

        <div className="mt-4 space-y-2">
          {route.legs.map((leg, i) => {
            const LegIcon = modeIcons[leg.mode];
            return (
              <div key={i} className="flex items-center gap-2 text-sm">
                <div
                  className="flex h-7 w-7 items-center justify-center rounded-lg"
                  style={{ backgroundColor: leg.color ? `${leg.color}20` : undefined }}
                >
                  <LegIcon className="h-3.5 w-3.5" style={{ color: leg.color }} />
                </div>
                <span className="flex-1 truncate">
                  {leg.line ? `${leg.line}: ` : ""}
                  {leg.from} → {leg.to}
                </span>
                <span className="tabular-nums text-muted-foreground">
                  {leg.durationMinutes}m
                </span>
              </div>
            );
          })}
        </div>

        {route.scheduleWarnings?.map((w) => (
          <div
            key={w}
            className="mt-3 flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:bg-amber-900/20 dark:text-amber-200"
          >
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            {w}
          </div>
        ))}
      </div>
    </Card>
  );
}

function ReliabilityBadge({ level }: { level: "high" | "medium" | "low" }) {
  const variant = level === "high" ? "success" : level === "medium" ? "warning" : "danger";
  return <Badge variant={variant}>{level} reliability</Badge>;
}

export function RouteTimeline({ route }: { route: TransitRoute }) {
  return (
    <div className="relative py-2">
      <div className="absolute left-3 top-4 bottom-4 w-0.5 bg-border" />
      {route.legs.map((leg, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.05 }}
          className="relative flex gap-4 pb-4 last:pb-0"
        >
          <div
            className="relative z-10 mt-1 h-6 w-6 rounded-full border-2 border-card bg-lake-600"
            style={{ boxShadow: leg.color ? `0 0 0 2px ${leg.color}` : undefined }}
          />
          <div>
            <p className="font-medium capitalize">{leg.mode}{leg.line ? ` · ${leg.line}` : ""}</p>
            <p className="text-sm text-muted-foreground">
              {leg.from} → {leg.to} · {leg.durationMinutes} min
            </p>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
