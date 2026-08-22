"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { MapPin, Navigation, Layers, Maximize2 } from "lucide-react";
import type { MapProps, MapMarker } from "./workways-map";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const WI_CENTER = { lat: 44.5, lng: -89.5 };

export function MapFallback({
  center = WI_CENTER,
  zoom = 6.5,
  markers = [],
  className,
  onMarkerClick,
  showControls = true,
}: MapProps) {
  const projected = useMemo(() => {
    const scale = Math.pow(2, zoom - 6);
    return markers.map((m) => ({
      ...m,
      x: 50 + (m.coordinates.lng - center.lng) * 180 * scale,
      y: 50 - (m.coordinates.lat - center.lat) * 180 * scale,
    }));
  }, [markers, center, zoom]);

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-lake-50 via-cream to-forest-600/10 dark:from-navy-900 dark:via-background dark:to-lake-900/20",
        className
      )}
    >
      <svg
        viewBox="0 0 100 100"
        className="h-full w-full min-h-[280px]"
        aria-label="Wisconsin map preview"
        role="img"
      >
        <defs>
          <pattern id="grid" width="4" height="4" patternUnits="userSpaceOnUse">
            <path d="M 4 0 L 0 0 0 4" fill="none" stroke="currentColor" strokeOpacity="0.06" />
          </pattern>
        </defs>
        <rect width="100" height="100" fill="url(#grid)" className="text-lake-600" />
        {/* Simplified WI silhouette */}
        <path
          d="M28 18 L38 12 L52 14 L62 10 L72 18 L78 28 L76 42 L82 52 L78 68 L70 78 L58 82 L48 88 L38 84 L30 74 L24 58 L22 42 L26 28 Z"
          fill="currentColor"
          className="text-lake-600/15 dark:text-lake-400/10"
          stroke="currentColor"
          strokeWidth="0.3"
          strokeOpacity="0.3"
        />
        {/* Transit corridor lines */}
        <path d="M32 45 Q50 40 68 48" fill="none" stroke="#2d6a9f" strokeWidth="0.4" strokeDasharray="1 1" opacity="0.6" />
        <path d="M40 30 Q48 55 55 75" fill="none" stroke="#2d6a4e" strokeWidth="0.4" opacity="0.5" />
        {projected.map((m) => (
          <g
            key={m.id}
            transform={`translate(${Math.min(92, Math.max(8, m.x))}, ${Math.min(92, Math.max(8, m.y))})`}
            className="cursor-pointer"
            onClick={() => onMarkerClick?.(m.id)}
          >
            <circle
              r={m.selected ? 2.2 : 1.6}
              fill={m.color ?? (m.selected ? "#c4703f" : "#2d6a9f")}
              stroke="white"
              strokeWidth="0.3"
            />
          </g>
        ))}
      </svg>

      {showControls && (
        <div className="absolute right-3 top-3 flex flex-col gap-2">
          <Button variant="secondary" size="icon" className="h-9 w-9 bg-card/90 shadow-sm" aria-label="Recenter">
            <Navigation className="h-4 w-4" />
          </Button>
          <Button variant="secondary" size="icon" className="h-9 w-9 bg-card/90 shadow-sm" aria-label="Layers">
            <Layers className="h-4 w-4" />
          </Button>
          <Button variant="secondary" size="icon" className="h-9 w-9 bg-card/90 shadow-sm" aria-label="Fullscreen">
            <Maximize2 className="h-4 w-4" />
          </Button>
        </div>
      )}

      <div className="absolute bottom-3 left-3 flex items-center gap-2 rounded-xl bg-card/90 px-3 py-2 text-xs shadow-sm backdrop-blur">
        <MapPin className="h-3.5 w-3.5 text-lake-600" />
        <span className="text-muted-foreground">
          Map preview · Add <code className="text-foreground">NEXT_PUBLIC_MAPBOX_TOKEN</code> for full GIS
        </span>
      </div>

      {markers.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute left-3 top-3 rounded-xl bg-card/90 px-3 py-1.5 text-xs font-medium shadow-sm"
        >
          {markers.length} location{markers.length !== 1 ? "s" : ""}
        </motion.div>
      )}
    </div>
  );
}

export type { MapMarker };
