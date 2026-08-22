"use client";

import { useRef, useEffect, useCallback } from "react";
import {
  Map,
  Marker,
  NavigationControl,
  type MapLibreMap,
} from "@/lib/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import type { MapProps } from "./workways-map";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/lib/store";
import {
  getRasterBasemapStyle,
  getMapStyleUrl,
  hasMapboxToken,
  WISCONSIN_BOUNDS,
  WISCONSIN_CENTER,
} from "@/lib/map-styles";

export default function RealMap({
  center = WISCONSIN_CENTER,
  zoom = 6.5,
  markers = [],
  className,
  onMarkerClick,
  showControls = true,
}: MapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markersRef = useRef<Marker[]>([]);
  const skipStyleChangeRef = useRef(true);
  const darkMode = useAppStore((s) => s.darkMode);

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

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new Map({
      container: containerRef.current,
      style,
      center: [center.lng, center.lat],
      zoom,
      maxBounds: WISCONSIN_BOUNDS,
      minZoom: 5,
      maxZoom: 14,
      fadeDuration: 0,
    });

    if (showControls) {
      map.addControl(new NavigationControl(), "top-right");
    }

    map.on("load", updateMarkers);
    mapRef.current = map;

    return () => {
      markersRef.current.forEach((m) => m.remove());
      map.remove();
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
    map.once("idle", updateMarkers);
  }, [darkMode, updateMarkers]);

  useEffect(() => {
    updateMarkers();
  }, [updateMarkers]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    map.flyTo({ center: [center.lng, center.lat], zoom, duration: 800 });
  }, [center.lat, center.lng, zoom]);

  return (
    <div
      ref={containerRef}
      className={cn("h-full min-h-[300px] w-full overflow-hidden rounded-2xl bg-navy-900", className)}
    />
  );
}
