"use client";

import { MapPin, Layers, Briefcase, Map, Satellite, Mountain } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ChoroplethMetric } from "@/lib/agent/map-actions";
import type { MapStyleId } from "@/lib/map-styles";

const METRIC_LABELS: Record<ChoroplethMetric, string> = {
  unemployment: "Unemployment",
  opportunity: "Opportunity index",
  "median-wage": "Median wage",
  "open-jobs": "Job openings",
  "transit-coverage": "Transit coverage",
};

type MapHudProps = {
  metric: ChoroplethMetric | null;
  markerCount: number;
  highlightedCount: number;
  mapStyleId?: MapStyleId;
  onStyleChange?: (id: MapStyleId) => void;
  className?: string;
};

const STYLE_OPTIONS: { id: MapStyleId; label: string; icon: typeof Map }[] = [
  { id: "satellite", label: "Satellite", icon: Satellite },
  { id: "streets", label: "Color map", icon: Map },
  { id: "terrain", label: "Terrain", icon: Mountain },
];

export function MapHud({
  metric,
  markerCount,
  highlightedCount,
  mapStyleId = "streets",
  onStyleChange,
  className,
}: MapHudProps) {
  return (
    <div className={cn("absolute right-3 top-3 z-10 flex flex-col gap-2 sm:right-4 sm:top-4", className)}>
      {onStyleChange && (
        <div className="pointer-events-auto flex rounded-xl bg-navy-900/90 p-1 shadow-xl backdrop-blur-md">
          {STYLE_OPTIONS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => onStyleChange(id)}
              title={label}
              className={cn(
                "flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition-all",
                mapStyleId === id
                  ? "bg-lake-600 text-white shadow-sm"
                  : "text-white/60 hover:text-white"
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </div>
      )}

      <div className="pointer-events-none flex items-center gap-2 rounded-2xl bg-navy-900/85 px-3 py-2 text-white shadow-xl backdrop-blur-md">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-lake-600/30">
          <MapPin className="h-3.5 w-3.5 text-lake-400" />
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-white/45">
            Wisconsin
          </p>
          <p className="text-xs font-medium">Live map · 72 counties</p>
        </div>
      </div>

      {(metric || markerCount > 0 || highlightedCount > 0) && (
        <div className="pointer-events-none rounded-2xl bg-navy-900/80 px-3 py-2.5 shadow-lg backdrop-blur-md">
          <div className="space-y-1.5">
            {metric && (
              <div className="flex items-center gap-2 text-[11px] text-white/75">
                <Layers className="h-3 w-3 text-lake-400" />
                {METRIC_LABELS[metric]}
              </div>
            )}
            {markerCount > 0 && (
              <div className="flex items-center gap-2 text-[11px] text-white/75">
                <Briefcase className="h-3 w-3 text-accent-500" />
                {markerCount} job{markerCount !== 1 ? "s" : ""} on map
              </div>
            )}
            {highlightedCount > 0 && (
              <div className="flex items-center gap-2 text-[11px] text-white/75">
                <span className="h-2 w-2 rounded-full bg-accent-500" />
                {highlightedCount} highlighted
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
