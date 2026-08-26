import type { StyleSpecification } from "maplibre-gl";

/**
 * Pan/zoom constraint. Must be looser than the state itself: a landscape
 * viewport that shows Kenosha-to-Superior has to include longitude outside
 * Wisconsin (Lake Michigan, a strip of Minnesota/Iowa). A tight bbox forces
 * MapLibre to keep zoom high and crop the south and the lake.
 */
export const WISCONSIN_BOUNDS: [[number, number], [number, number]] = [
  [-95.4, 41.15],
  [-83.9, 48.35],
];

/** Frame for the home camera: full state plus a band of Lake Michigan. */
export const WISCONSIN_FIT_BOUNDS: [[number, number], [number, number]] = [
  [-93.05, 42.32],
  [-85.85, 47.22],
];

export const WISCONSIN_CENTER = { lat: 44.62, lng: -88.95 };
/** Same statewide frame as the home map (east-shifted so the lake is in view). */
export const WISCONSIN_IMMERSIVE_CENTER = WISCONSIN_CENTER;
export const WISCONSIN_DEFAULT_ZOOM = 6.35;
export const WISCONSIN_IMMERSIVE_ZOOM = 6.35;
export const WISCONSIN_IMMERSIVE_PITCH = 0;

export function statewideCameraPadding(): {
  top: number;
  right: number;
  bottom: number;
  left: number;
} {
  let dock = 148;
  if (typeof document !== "undefined") {
    const raw = getComputedStyle(document.documentElement).getPropertyValue("--dock-total").trim();
    const parsed = Number.parseFloat(raw);
    if (Number.isFinite(parsed) && parsed > 0) dock = parsed;
  }
  return {
    top: 72,
    right: 20,
    bottom: Math.round(dock + 20),
    left: 20,
  };
}

type FitBoundsMap = {
  fitBounds: (
    bounds: [[number, number], [number, number]],
    options?: {
      padding?: { top: number; right: number; bottom: number; left: number };
      duration?: number;
      pitch?: number;
      bearing?: number;
    }
  ) => unknown;
};

/** Frame Wisconsin + Lake Michigan in the visible map, clear of the ask dock. */
export function fitWisconsinCamera(map: FitBoundsMap, duration = 0) {
  map.fitBounds(WISCONSIN_FIT_BOUNDS, {
    padding: statewideCameraPadding(),
    duration,
    pitch: 0,
    bearing: 0,
  });
}

export type MapStyleId = "streets" | "satellite" | "terrain";

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN?.trim() || "";

export function hasMapboxToken() {
  return MAPBOX_TOKEN.length > 0;
}

/** Live satellite imagery available without Mapbox (Esri World Imagery). */
export function hasSatelliteBasemap() {
  return true;
}

export function isSatelliteStyle(styleId: MapStyleId) {
  return styleId === "satellite";
}

/** Preconnect targets for layout.tsx */
export const MAP_TILE_ORIGINS = [
  "https://server.arcgisonline.com",
  "https://a.basemaps.cartocdn.com",
  "https://b.basemaps.cartocdn.com",
  "https://tile.opentopomap.org",
  "https://tiles.openfreemap.org",
  "https://api.mapbox.com",
];

function rasterTileScale(): string {
  // Stick to 1x tiles — @2x URLs 404 on some zooms and can break the whole style.
  return "";
}

const ESRI_IMAGERY =
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";

const ESRI_LABELS =
  "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}";

const ESRI_TRANSPORT =
  "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}";

function clampRaster(n: number, min = -1, max = 1) {
  return Math.min(max, Math.max(min, n));
}

function voyagerTileUrls(darkMode: boolean): string[] {
  const scale = rasterTileScale();
  return darkMode
    ? [
        `https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}${scale}.png`,
        `https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}${scale}.png`,
      ]
    : [
        `https://a.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}${scale}.png`,
        `https://b.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}${scale}.png`,
      ];
}

/** Live satellite + colorful map wash + labels */
export function getSatelliteMapStyle(darkMode: boolean): StyleSpecification {
  return {
    version: 8,
    name: "workways-satellite",
    sources: {
      imagery: {
        type: "raster",
        tiles: [ESRI_IMAGERY],
        tileSize: 256,
        maxzoom: 19,
        attribution:
          "© Esri, Maxar, Earthstar Geographics, USDA FSA, USGS, AeroGRID, IGN, GIS User Community",
      },
      colorWash: {
        type: "raster",
        tiles: voyagerTileUrls(darkMode),
        tileSize: 256,
        maxzoom: 22,
        attribution: "© CARTO © OpenStreetMap",
      },
      labels: {
        type: "raster",
        tiles: [ESRI_LABELS],
        tileSize: 256,
        maxzoom: 19,
      },
      roads: {
        type: "raster",
        tiles: [ESRI_TRANSPORT],
        tileSize: 256,
        maxzoom: 19,
      },
    },
    layers: [
      {
        id: "imagery",
        type: "raster",
        source: "imagery",
        paint: {
          "raster-saturation": clampRaster(darkMode ? 0.2 : 0.35),
          "raster-contrast": clampRaster(darkMode ? 0.1 : 0.14, 0, 1),
          "raster-brightness-min": darkMode ? 0 : 0,
          "raster-brightness-max": darkMode ? 0.82 : 1,
        },
      },
      {
        id: "color-wash",
        type: "raster",
        source: "colorWash",
        paint: {
          "raster-opacity": darkMode ? 0.2 : 0.36,
          "raster-saturation": clampRaster(0.25),
          "raster-contrast": clampRaster(0.08, 0, 1),
        },
      },
      {
        id: "roads",
        type: "raster",
        source: "roads",
        paint: { "raster-opacity": darkMode ? 0.4 : 0.6 },
      },
      {
        id: "labels",
        type: "raster",
        source: "labels",
        paint: { "raster-opacity": darkMode ? 0.75 : 0.9 },
      },
    ],
  };
}

/** Colorful CARTO Voyager — bold land use & water colors */
export function getVoyagerMapStyle(darkMode: boolean): StyleSpecification {
  const tiles = voyagerTileUrls(darkMode);

  return {
    version: 8,
    name: "workways-voyager",
    sources: {
      basemap: {
        type: "raster",
        tiles,
        tileSize: 256,
        attribution: "© CARTO © OpenStreetMap",
      },
    },
    layers: [
      {
        id: "basemap",
        type: "raster",
        source: "basemap",
        minzoom: 0,
        maxzoom: 22,
        paint: {
          "raster-saturation": clampRaster(0.3),
          "raster-contrast": clampRaster(0.12, 0, 1),
        },
      },
    ],
  };
}

/** OpenTopoMap — shaded relief and trails (boosted color) */
export function getTerrainMapStyle(): StyleSpecification {
  return {
    version: 8,
    name: "workways-terrain",
    sources: {
      topo: {
        type: "raster",
        tiles: ["https://tile.opentopomap.org/{z}/{x}/{y}.png"],
        tileSize: 256,
        maxzoom: 17,
        attribution: "© OpenTopoMap © OpenStreetMap",
      },
    },
    layers: [
      {
        id: "topo",
        type: "raster",
        source: "topo",
        minzoom: 0,
        maxzoom: 17,
        paint: {
          "raster-saturation": clampRaster(0.25),
          "raster-contrast": clampRaster(0.1, 0, 1),
        },
      },
    ],
  };
}

/** Clean minimal basemap for secondary pages */
export function getDataMapStyle(darkMode: boolean): StyleSpecification {
  const scale = rasterTileScale();
  const tiles = darkMode
    ? [
        `https://a.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}${scale}.png`,
        `https://b.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}${scale}.png`,
      ]
    : [
        `https://a.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}${scale}.png`,
        `https://b.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}${scale}.png`,
      ];

  return {
    version: 8,
    name: "workways-data",
    sources: {
      basemap: {
        type: "raster",
        tiles,
        tileSize: 256,
        attribution: "© CARTO © OpenStreetMap",
      },
    },
    layers: [{ id: "basemap", type: "raster", source: "basemap", minzoom: 0, maxzoom: 22 }],
  };
}

/** Primary raster basemap resolver — no API key required */
export function getRasterBasemapStyle(
  styleId: MapStyleId,
  darkMode: boolean
): StyleSpecification {
  switch (styleId) {
    case "satellite":
      return getSatelliteMapStyle(darkMode);
    case "terrain":
      return getTerrainMapStyle();
    case "streets":
    default:
      return getVoyagerMapStyle(darkMode);
  }
}

/** @deprecated use getRasterBasemapStyle */
export function getInstantMapStyle(darkMode: boolean): StyleSpecification {
  return getVoyagerMapStyle(darkMode);
}

export const OPENFREEMAP_STREETS = "https://tiles.openfreemap.org/styles/liberty";
export const OPENFREEMAP_DARK = "https://tiles.openfreemap.org/styles/dark";

export function getMapStyleUrl(styleId: MapStyleId, darkMode: boolean): string {
  if (MAPBOX_TOKEN) {
    switch (styleId) {
      case "satellite":
        return `https://api.mapbox.com/styles/v1/mapbox/satellite-streets-v12?access_token=${MAPBOX_TOKEN}`;
      case "terrain":
        return `https://api.mapbox.com/styles/v1/mapbox/outdoors-v12?access_token=${MAPBOX_TOKEN}`;
      case "streets":
      default:
        return darkMode
          ? `https://api.mapbox.com/styles/v1/mapbox/dark-v11?access_token=${MAPBOX_TOKEN}`
          : `https://api.mapbox.com/styles/v1/mapbox/streets-v12?access_token=${MAPBOX_TOKEN}`;
    }
  }

  if (styleId === "terrain") {
    return darkMode ? OPENFREEMAP_DARK : OPENFREEMAP_STREETS;
  }

  return darkMode ? OPENFREEMAP_DARK : OPENFREEMAP_STREETS;
}

export function getInitialMapStyle(
  styleId: MapStyleId,
  darkMode: boolean,
  options?: { forceLight?: boolean }
): StyleSpecification | string {
  const dark = options?.forceLight ? false : darkMode;

  if (MAPBOX_TOKEN) return getMapStyleUrl(styleId, dark);

  switch (styleId) {
    case "satellite":
      return getSatelliteMapStyle(false);
    case "terrain":
      return getTerrainMapStyle();
    case "streets":
    default:
      // CARTO Voyager raster — vivid, reliable, reads instantly as a map
      return getVoyagerMapStyle(false);
  }
}

export function resolveBasemapStyle(
  styleId: MapStyleId,
  darkMode: boolean,
  options?: { forceLight?: boolean }
): StyleSpecification | string {
  if (MAPBOX_TOKEN) return getMapStyleUrl(styleId, options?.forceLight ? false : darkMode);
  if (styleId === "satellite") return getSatelliteMapStyle(false);
  if (styleId === "terrain") return getTerrainMapStyle();
  return getRasterBasemapStyle(styleId, options?.forceLight ? false : darkMode);
}

export function getMapStyle(styleId: MapStyleId, darkMode: boolean): string {
  return getMapStyleUrl(styleId, darkMode);
}
