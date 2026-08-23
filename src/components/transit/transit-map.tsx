"use client";

import { useRef, useEffect, useCallback } from "react";
import {
  Map,
  Marker,
  NavigationControl,
  type GeoJSONSource,
  type MapLibreMap,
} from "@/lib/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/lib/store";
import {
  getRasterBasemapStyle,
  getMapStyleUrl,
  hasMapboxToken,
  WISCONSIN_BOUNDS,
} from "@/lib/map-styles";
import type {
  TransitMapStop,
  TransitRouteShape,
  TransitVehicle,
} from "@/lib/transit-types";

export type TransitMapSelection =
  | { type: "stop"; item: TransitMapStop }
  | { type: "route"; item: TransitRouteShape }
  | { type: "vehicle"; item: TransitVehicle };

type TransitMapProps = {
  center: { lat: number; lng: number };
  zoom?: number;
  shapes?: TransitRouteShape[];
  stops?: TransitMapStop[];
  vehicles?: TransitVehicle[];
  selectedId?: string;
  onSelect?: (selection: TransitMapSelection | null) => void;
  className?: string;
  layers?: { routes: boolean; stops: boolean; vehicles: boolean };
};

const SHAPES_SOURCE = "transit-route-shapes";
const SHAPES_LAYER = "transit-route-lines";
const STOPS_SOURCE = "transit-stops";

function shapesToGeoJson(shapes: TransitRouteShape[]) {
  return {
    type: "FeatureCollection" as const,
    features: shapes.map((s) => ({
      type: "Feature" as const,
      properties: {
        id: s.id,
        color: s.color,
        shortName: s.shortName,
        routeId: s.routeId,
        agencyId: s.agencyId,
      },
      geometry: {
        type: "LineString" as const,
        coordinates: s.coordinates,
      },
    })),
  };
}

function stopsToGeoJson(stops: TransitMapStop[]) {
  return {
    type: "FeatureCollection" as const,
    features: stops.map((s) => ({
      type: "Feature" as const,
      properties: {
        id: s.id,
        name: s.name,
        agencyId: s.agencyId,
        agency: s.agency,
      },
      geometry: {
        type: "Point" as const,
        coordinates: [s.lng, s.lat],
      },
    })),
  };
}

export function TransitMap({
  center,
  zoom = 12,
  shapes = [],
  stops = [],
  vehicles = [],
  selectedId,
  onSelect,
  className,
  layers = { routes: true, stops: true, vehicles: true },
}: TransitMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const vehicleMarkersRef = useRef<Marker[]>([]);
  const skipStyleChangeRef = useRef(true);
  const darkMode = useAppStore((s) => s.darkMode);

  const style = hasMapboxToken()
    ? getMapStyleUrl("streets", darkMode)
    : getRasterBasemapStyle("streets", darkMode);

  const syncRouteLayer = useCallback(
    (map: MapLibreMap) => {
      const geo = shapesToGeoJson(layers.routes ? shapes : []);
      const existing = map.getSource(SHAPES_SOURCE) as GeoJSONSource | undefined;
      if (existing) {
        existing.setData(geo);
        return;
      }

      map.addSource(SHAPES_SOURCE, { type: "geojson", data: geo });
      map.addLayer({
        id: SHAPES_LAYER,
        type: "line",
        source: SHAPES_SOURCE,
        paint: {
          "line-color": ["get", "color"],
          "line-width": ["interpolate", ["linear"], ["zoom"], 10, 2, 14, 5],
          "line-opacity": 0.85,
        },
        layout: { "line-cap": "round", "line-join": "round" },
      });

      map.on("click", SHAPES_LAYER, (e) => {
        const f = e.features?.[0];
        if (!f?.properties?.id) return;
        const shape = shapes.find((s) => s.id === f.properties!.id);
        if (shape) onSelect?.({ type: "route", item: shape });
      });
      map.on("mouseenter", SHAPES_LAYER, () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", SHAPES_LAYER, () => {
        map.getCanvas().style.cursor = "";
      });
    },
    [shapes, layers.routes, onSelect]
  );

  const syncStopLayer = useCallback(
    (map: MapLibreMap) => {
      const geo = stopsToGeoJson(layers.stops ? stops : []);
      const existing = map.getSource(STOPS_SOURCE) as GeoJSONSource | undefined;
      if (existing) {
        existing.setData(geo);
        return;
      }

      map.addSource(STOPS_SOURCE, { type: "geojson", data: geo });
      map.addLayer({
        id: "transit-stop-circles",
        type: "circle",
        source: STOPS_SOURCE,
        paint: {
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 10, 3, 14, 7],
          "circle-color": "#1e6b9c",
          "circle-stroke-width": 1.5,
          "circle-stroke-color": "#ffffff",
          "circle-opacity": 0.9,
        },
      });

      map.on("click", "transit-stop-circles", (e) => {
        const f = e.features?.[0];
        if (!f?.properties?.id) return;
        const stop = stops.find((s) => s.id === f.properties!.id);
        if (stop) onSelect?.({ type: "stop", item: stop });
      });
      map.on("mouseenter", "transit-stop-circles", () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", "transit-stop-circles", () => {
        map.getCanvas().style.cursor = "";
      });
    },
    [stops, layers.stops, onSelect]
  );

  const syncVehicles = useCallback(() => {
    vehicleMarkersRef.current.forEach((m) => m.remove());
    vehicleMarkersRef.current = [];

    const map = mapRef.current;
    if (!map || !layers.vehicles) return;

    for (const v of vehicles) {
      const el = document.createElement("button");
      el.type = "button";
      el.className = cn(
        "transit-vehicle-marker flex h-9 w-9 items-center justify-center rounded-full border-2 border-white shadow-lg",
        selectedId === v.id && "ring-2 ring-amber-400 ring-offset-1"
      );
      el.style.backgroundColor = "#d4824a";
      el.setAttribute("aria-label", `Bus ${v.routeLabel ?? v.label ?? "vehicle"}`);
      el.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.2"><path d="M8 6v6M16 6v6M4 10h16v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-6Z"/><circle cx="7.5" cy="18" r="1.5"/><circle cx="16.5" cy="18" r="1.5"/></svg>`;
      if (typeof v.bearing === "number") {
        el.style.transform = `rotate(${v.bearing}deg)`;
      }

      el.addEventListener("click", (ev) => {
        ev.stopPropagation();
        onSelect?.({ type: "vehicle", item: v });
      });

      vehicleMarkersRef.current.push(
        new Marker({ element: el, anchor: "center" })
          .setLngLat([v.lng, v.lat])
          .addTo(map)
      );
    }
  }, [vehicles, layers.vehicles, selectedId, onSelect]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new Map({
      container: containerRef.current,
      style,
      center: [center.lng, center.lat],
      zoom,
      maxBounds: WISCONSIN_BOUNDS,
      minZoom: 8,
      maxZoom: 16,
      fadeDuration: 0,
    });

    map.addControl(new NavigationControl({ showCompass: false }), "top-right");

    map.on("load", () => {
      syncRouteLayer(map);
      syncStopLayer(map);
      syncVehicles();
    });

    map.on("click", (e) => {
      const hits = map.queryRenderedFeatures(e.point, {
        layers: [SHAPES_LAYER, "transit-stop-circles"],
      });
      if (!hits.length) onSelect?.(null);
    });

    mapRef.current = map;

    return () => {
      vehicleMarkersRef.current.forEach((m) => m.remove());
      map.remove();
      mapRef.current = null;
      skipStyleChangeRef.current = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map?.isStyleLoaded()) return;
    syncRouteLayer(map);
    syncStopLayer(map);
    syncVehicles();
  }, [syncRouteLayer, syncStopLayer, syncVehicles]);

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
      syncRouteLayer(map);
      syncStopLayer(map);
      syncVehicles();
    });
  }, [darkMode, syncRouteLayer, syncStopLayer, syncVehicles]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    map.flyTo({ center: [center.lng, center.lat], zoom, duration: 700 });
  }, [center.lat, center.lng, zoom]);

  return (
    <div className="relative h-full min-h-[280px] w-full">
      <div
        ref={containerRef}
        className={cn(
          "h-full min-h-[280px] w-full overflow-hidden rounded-2xl bg-navy-900 sm:min-h-[360px] lg:min-h-[420px]",
          className
        )}
      />
    </div>
  );
}
