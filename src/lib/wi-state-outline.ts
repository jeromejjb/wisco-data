import type { GeoJSONSource, MapLibreMap } from "@/lib/maplibre";
import type { DataDrivenPropertyValueSpecification } from "maplibre-gl";

/** Natural Earth 50m admin-1 outline (public domain), Wisconsin only. */

export const STATE_SOURCE = "wi-state";
export const STATE_GLOW = "wi-state-glow";
export const STATE_GLOW_MID = "wi-state-glow-mid";
export const STATE_LINE = "wi-state-line";

type StateOutlineTheme = {
  glow: string;
  glowMid: string;
  line: string;
};

export function stateOutlineTheme(opts: {
  satellite?: boolean;
  dark?: boolean;
}): StateOutlineTheme {
  if (opts.satellite) {
    return {
      glow: "rgba(103, 232, 249, 0.55)",
      glowMid: "rgba(224, 247, 255, 0.55)",
      line: "#f8feff",
    };
  }
  if (opts.dark) {
    return {
      glow: "rgba(34, 211, 238, 0.5)",
      glowMid: "rgba(103, 232, 249, 0.85)",
      line: "#e0f7ff",
    };
  }
  return {
    glow: "rgba(77, 163, 212, 0.42)",
    glowMid: "rgba(30, 107, 156, 0.8)",
    line: "#185580",
  };
}

let cached: GeoJSON.FeatureCollection | null = null;
let promise: Promise<GeoJSON.FeatureCollection> | null = null;

export function preloadStateOutlineGeoJson() {
  if (cached || promise) return;
  promise = fetch("/data/wi-state.geojson")
    .then((r) => {
      if (!r.ok) throw new Error(`State outline failed: ${r.status}`);
      return r.json();
    })
    .then((geo: GeoJSON.FeatureCollection) => {
      cached = geo;
      return cached;
    })
    .catch((err) => {
      promise = null;
      throw err;
    });
}

export function getStateOutlineGeoJson(): Promise<GeoJSON.FeatureCollection> {
  if (cached) return Promise.resolve(cached);
  if (typeof window === "undefined") {
    return Promise.reject(new Error("getStateOutlineGeoJson is client-only"));
  }
  preloadStateOutlineGeoJson();
  return promise!;
}

const LINE_LAYOUT = {
  "line-cap": "round" as const,
  "line-join": "round" as const,
};

function zoomWidth(stops: [number, number][]): DataDrivenPropertyValueSpecification<number> {
  return ["interpolate", ["linear"], ["zoom"], ...stops.flat()];
}

/** Halo + crisp rim so Wisconsin reads as one shape against the Great Lakes. */
export function addWisconsinOutlineLayers(
  map: MapLibreMap,
  geo: GeoJSON.FeatureCollection,
  opts: { beforeId?: string; satellite?: boolean; dark?: boolean }
) {
  const theme = stateOutlineTheme(opts);
  const beforeId = opts.beforeId && map.getLayer(opts.beforeId) ? opts.beforeId : undefined;

  if (!map.getSource(STATE_SOURCE)) {
    map.addSource(STATE_SOURCE, { type: "geojson", data: geo });
  } else {
    (map.getSource(STATE_SOURCE) as GeoJSONSource).setData(geo);
  }

  if (!map.getLayer(STATE_GLOW)) {
    map.addLayer(
      {
        id: STATE_GLOW,
        type: "line",
        source: STATE_SOURCE,
        layout: LINE_LAYOUT,
        paint: {
          "line-color": theme.glow,
          "line-width": zoomWidth([
            [5, 12],
            [8, 16],
            [11, 10],
          ]),
          "line-blur": zoomWidth([
            [5, 10],
            [8, 8],
            [11, 5],
          ]),
          "line-opacity": 0.9,
        },
      },
      beforeId
    );
  } else {
    map.setPaintProperty(STATE_GLOW, "line-color", theme.glow);
  }

  if (!map.getLayer(STATE_GLOW_MID)) {
    map.addLayer(
      {
        id: STATE_GLOW_MID,
        type: "line",
        source: STATE_SOURCE,
        layout: LINE_LAYOUT,
        paint: {
          "line-color": theme.glowMid,
          "line-width": zoomWidth([
            [5, 3.5],
            [8, 4.5],
            [11, 3],
          ]),
          "line-blur": 1.4,
          "line-opacity": 0.95,
        },
      },
      beforeId
    );
  } else {
    map.setPaintProperty(STATE_GLOW_MID, "line-color", theme.glowMid);
  }

  if (!map.getLayer(STATE_LINE)) {
    map.addLayer(
      {
        id: STATE_LINE,
        type: "line",
        source: STATE_SOURCE,
        layout: LINE_LAYOUT,
        paint: {
          "line-color": theme.line,
          "line-width": zoomWidth([
            [5, 1.5],
            [8, 2.1],
            [11, 2.6],
          ]),
          "line-opacity": 1,
        },
      },
      beforeId
    );
  } else {
    map.setPaintProperty(STATE_LINE, "line-color", theme.line);
  }
}
