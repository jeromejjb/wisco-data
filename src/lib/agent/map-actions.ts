import type { Coordinates } from "@/lib/types";

export type ChoroplethMetric =
  | "unemployment"
  | "opportunity"
  | "median-wage"
  | "open-jobs"
  | "transit-coverage";

export type MapMarkerAction = {
  id: string;
  coordinates: Coordinates;
  label?: string;
  color?: string;
  selected?: boolean;
};

export type MapAction =
  | {
      type: "flyTo";
      center: Coordinates;
      zoom?: number;
      pitch?: number;
      bearing?: number;
    }
  | {
      type: "setChoropleth";
      metric: ChoroplethMetric;
      /** county id → normalized value for coloring */
      values: Record<string, number>;
      labels?: Record<string, string>;
    }
  | { type: "setMarkers"; markers: MapMarkerAction[] }
  | { type: "highlightCounties"; countyIds: string[] }
  | { type: "drawRoute"; coordinates: Coordinates[]; color?: string }
  | { type: "clearRoute" }
  | { type: "clearHighlights" }
  | { type: "reset" };

export type ToolResultWithMap = {
  summary: string;
  data?: unknown;
  mapActions?: MapAction[];
};

export function extractMapActionsFromOutput(output: unknown): MapAction[] {
  if (!output || typeof output !== "object") return [];
  const result = output as ToolResultWithMap;
  return result.mapActions ?? [];
}
