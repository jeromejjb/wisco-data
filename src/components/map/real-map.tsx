"use client";

import { useRef, useEffect, useCallback, useState } from "react";
import {
  Map,
  Marker,
  NavigationControl,
  MAP_WEBGL_ATTRIBUTES,
  mapCanRender,
  safeMapRemove,
  type MapLibreMap,
} from "@/lib/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import type { MapProps } from "./workways-map";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/lib/store";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import { mapFlyDurationMs } from "@/lib/motion";
import {
  getRasterBasemapStyle,
  getMapStyleUrl,
  hasMapboxToken,
  WISCONSIN_BOUNDS,
  WISCONSIN_CENTER,
} from "@/lib/map-styles";
import { getCountiesGeoJson } from "@/lib/wi-counties-geojson";
import { addWisconsinOutlineLayers, getStateOutlineGeoJson } from "@/lib/wi-state-outline";
import { buildChoroplethExpression, fipsValuesFromCountyIds } from "./map-legend";
import { MapWebGLUnavailable } from "./map-webgl-unavailable";
import { isGpuInitializationError, probeWebGL2, type WebGL2Probe } from "@/lib/webgl-support";

const COUNTIES_SOURCE = "wi-counties";
const COUNTIES_FILL = "wi-counties-fill";
const COUNTIES_LINE = "wi-counties-line";

export default function RealMap({
  center = WISCONSIN_CENTER,
  zoom = 6.5,
  markers = [],
  className,
  onMarkerClick,
  showControls = true,
  choroplethMetric = null,
  choroplethValues = {},
}: MapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markersRef = useRef<Marker[]>([]);
  const skipStyleChangeRef = useRef(true);
  const darkMode = useAppStore((s) => s.darkMode);
  const reducedMotion = usePrefersReducedMotion();
  const [webglProbe, setWebglProbe] = useState<WebGL2Probe | null>(null);

  const style = hasMapboxToken()
    ? getMapStyleUrl("streets", darkMode)
    : getRasterBasemapStyle("streets", darkMode);

  const updateMarkers = useCallback(() => {
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    const map = mapRef.current;
    if (!map) return;

    markers.forEach((marker) => {
      const el = document.createElement("div");
      el.className = cn(
        "h-4 w-4 cursor-pointer rounded-full border-2 border-white shadow-md transition-transform hover:scale-125",
        marker.selected && "scale-125 ring-2 ring-accent-500"
      );
      el.style.backgroundColor = marker.color ?? "#1e6b9c";
      el.addEventListener("click", () => onMarkerClick?.(marker.id));

      markersRef.current.push(
        new Marker({ element: el })
          .setLngLat([marker.coordinates.lng, marker.coordinates.lat])
          .addTo(map)
      );
    });
  }, [markers, onMarkerClick]);

  const applyChoropleth = useCallback(
    (map: MapLibreMap) => {
      if (!map.getLayer(COUNTIES_FILL) || !choroplethMetric) return;
      if (Object.keys(choroplethValues).length === 0) return;
      const fipsValues = fipsValuesFromCountyIds(choroplethValues);
      const expr = buildChoroplethExpression(
        choroplethMetric,
        fipsValues,
        darkMode ? "#1a2438" : "#b8c8d8"
      );
      map.setPaintProperty(COUNTIES_FILL, "fill-color", expr);
      map.setPaintProperty(COUNTIES_FILL, "fill-opacity", 0.82);
    },
    [choroplethMetric, choroplethValues, darkMode]
  );

  const ensureCountyLayers = useCallback(
    async (map: MapLibreMap) => {
      const [geo, stateGeo] = await Promise.all([getCountiesGeoJson(), getStateOutlineGeoJson()]);
      if (!map.getSource(COUNTIES_SOURCE)) {
        map.addSource(COUNTIES_SOURCE, { type: "geojson", data: geo, promoteId: "fips" });
      }
      if (!map.getLayer(COUNTIES_FILL)) {
        map.addLayer({
          id: COUNTIES_FILL,
          type: "fill",
          source: COUNTIES_SOURCE,
          paint: {
            "fill-color": darkMode ? "#1a2438" : "#d5e0ea",
            "fill-opacity": 0.45,
          },
        });
        map.addLayer({
          id: COUNTIES_LINE,
          type: "line",
          source: COUNTIES_SOURCE,
          paint: {
            "line-color": darkMode ? "#94a3b8" : "#64748b",
            "line-width": 0.7,
            "line-opacity": 0.85,
          },
        });
      }
      addWisconsinOutlineLayers(map, stateGeo, { dark: darkMode });
      applyChoropleth(map);
    },
    [applyChoropleth, darkMode]
  );

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const support = probeWebGL2();
    if (!support.ok) {
      setWebglProbe(support);
      return;
    }

    let map: MapLibreMap;
    try {
      map = new Map({
        container: containerRef.current,
        style,
        center: [center.lng, center.lat],
        zoom,
        maxBounds: WISCONSIN_BOUNDS,
        minZoom: 5,
        maxZoom: 14,
        fadeDuration: 0,
        canvasContextAttributes: { ...MAP_WEBGL_ATTRIBUTES },
      });
    } catch (err) {
      setWebglProbe(
        isGpuInitializationError(err) ? support : { ok: false, statusMessage: null }
      );
      return;
    }

    if (!mapCanRender(map)) {
      setWebglProbe(support);
      safeMapRemove(map);
      return;
    }

    map.on("error", (e) => {
      if (isGpuInitializationError(e.error)) {
        setWebglProbe({
          ok: false,
          statusMessage: e.error instanceof Error ? e.error.message : null,
        });
      }
    });

    if (showControls) {
      map.addControl(new NavigationControl(), "top-right");
    }

    map.on("load", () => {
      void ensureCountyLayers(map);
      updateMarkers();
    });
    mapRef.current = map;

    return () => {
      markersRef.current.forEach((m) => m.remove());
      safeMapRemove(map);
      mapRef.current = null;
      skipStyleChangeRef.current = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (skipStyleChangeRef.current) {
      skipStyleChangeRef.current = false;
      return;
    }
    const next = hasMapboxToken()
      ? getMapStyleUrl("streets", darkMode)
      : getRasterBasemapStyle("streets", darkMode);
    map.setStyle(next);
    map.once("idle", () => {
      void ensureCountyLayers(map);
      updateMarkers();
    });
  }, [darkMode, updateMarkers, ensureCountyLayers]);

  useEffect(() => {
    updateMarkers();
  }, [updateMarkers]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    applyChoropleth(map);
  }, [applyChoropleth]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    map.flyTo({
      center: [center.lng, center.lat],
      zoom,
      duration: mapFlyDurationMs(reducedMotion, false),
      essential: false,
    });
  }, [center.lat, center.lng, zoom, reducedMotion]);

  return (
    <div className={cn("relative h-full min-h-[300px] w-full", className)}>
      {webglProbe ? <MapWebGLUnavailable probe={webglProbe} /> : null}
      <div
        ref={containerRef}
        className="h-full min-h-[300px] w-full overflow-hidden rounded-2xl bg-navy-900"
      />
    </div>
  );
}
