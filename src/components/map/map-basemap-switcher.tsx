"use client";

import { Map, Mountain, Satellite } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MapStyleId } from "@/lib/map-styles";

const OPTIONS: { id: MapStyleId; label: string; icon: typeof Map }[] = [
  { id: "satellite", label: "Satellite", icon: Satellite },
  { id: "streets", label: "Color map", icon: Map },
  { id: "terrain", label: "Terrain", icon: Mountain },
];

type MapBasemapSwitcherProps = {
  value: MapStyleId;
  onChange: (id: MapStyleId) => void;
  className?: string;
};

export function MapBasemapSwitcher({ value, onChange, className }: MapBasemapSwitcherProps) {
  return (
    <div
      className={cn(
        "pointer-events-auto flex rounded-full border border-white/15 bg-navy-900/80 p-0.5 shadow-xl backdrop-blur-xl",
        className
      )}
      role="group"
      aria-label="Basemap style"
    >
      {OPTIONS.map(({ id, label, icon: Icon }) => {
        const active = value === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => onChange(id)}
            title={label}
            className={cn(
              "flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[11px] font-semibold transition-all",
              active
                ? "bg-white text-navy-900 shadow-sm"
                : "text-white/70 hover:bg-white/10 hover:text-white"
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{label}</span>
          </button>
        );
      })}
    </div>
  );
}
