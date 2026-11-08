import {
  Map,
  Marker,
  Popup,
  NavigationControl,
  ScaleControl,
  GeolocateControl,
  getVersion,
  setWorkerUrl,
} from "maplibre-gl";
import type { GeoJSONSource, Map as MapLibreMap } from "maplibre-gl";
import { MAP_WEBGL_ATTRIBUTES } from "@/lib/webgl-support";

/**
 * MapLibre 6's default worker URL is emitted by Turbopack without its
 * `maplibre-gl-shared.mjs` sibling, so the worker 404s and GeoJSON layers
 * (counties, unemployment, routes) never render. Serve both files from
 * `public/` instead — see scripts/copy-maplibre-worker.mjs.
 */
export const MAPLIBRE_WORKER_PATH = `/maplibre/${getVersion()}/maplibre-gl-worker.mjs`;
setWorkerUrl(MAPLIBRE_WORKER_PATH);

export {
  Map,
  Marker,
  Popup,
  NavigationControl,
  ScaleControl,
  GeolocateControl,
  type GeoJSONSource,
  type MapLibreMap,
  MAP_WEBGL_ATTRIBUTES,
};

/** MapLibre 6 leaves `painter` unset when WebGL2 init fails; resize/remove then throw. */
export function mapCanRender(map: MapLibreMap | null | undefined): map is MapLibreMap {
  return Boolean(map && (map as { painter?: unknown }).painter);
}

export function safeMapResize(map: MapLibreMap | null | undefined) {
  if (!mapCanRender(map)) return;
  try {
    map.resize();
  } catch {
    /* WebGL context never came up */
  }
}

export function safeMapRemove(map: MapLibreMap | null | undefined) {
  if (!map) return;
  try {
    map.remove();
  } catch {
    /* destroy() crashes when painter was never created */
  }
}
