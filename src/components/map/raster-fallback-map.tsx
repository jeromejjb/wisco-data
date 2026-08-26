"use client";

import { useEffect, useRef, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import type { Map as LeafletMap, GeoJSON as LeafletGeoJSON, LayerGroup } from "leaflet";
import "leaflet/dist/leaflet.css";
import { cn } from "@/lib/utils";
import { useMapStore } from "@/lib/map-store";
import { FIPS_BY_COUNTY_ID } from "@/lib/wi-counties";
import { countyIdFromFips, countyDisplayName } from "@/lib/county-lookup";
import { getCountiesGeoJson } from "@/lib/wi-counties-geojson";
import { getStateOutlineGeoJson } from "@/lib/wi-state-outline";
import {
  fipsValuesFromCountyIds,
  interpolateMetricColor,
} from "./map-legend";
import {
  WISCONSIN_BOUNDS,
  WISCONSIN_FIT_BOUNDS,
  streetRasterTiles,
  type MapStyleId,
} from "@/lib/map-styles";
import { toneColor } from "@/lib/news-geo";

type RasterFallbackMapProps = {
  className?: string;
  immersive?: boolean;
  darkMode?: boolean;
  mapStyleId?: MapStyleId;
};

type LeafletNS = typeof import("leaflet");

function tileForStyle(styleId: MapStyleId, darkMode: boolean) {
  if (styleId === "satellite") {
    return {
      url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      attribution: "© Esri, Maxar, Earthstar Geographics",
    };
  }
  if (styleId === "terrain") {
    return {
      url: "https://tile.opentopomap.org/{z}/{x}/{y}.png",
      attribution: "© OpenTopoMap © OpenStreetMap",
    };
  }
  return streetRasterTiles(darkMode);
}

function fitWisconsin(L: LeafletNS, map: LeafletMap) {
  const [[west, south], [east, north]] = WISCONSIN_FIT_BOUNDS;
  map.fitBounds(L.latLngBounds([south, west], [north, east]), {
    animate: false,
    paddingTopLeft: [16, 72],
    paddingBottomRight: [16, 168],
  });
}

/**
 * Canvas/DOM map used when MapLibre cannot get WebGL2 (common in Firefox
 * Developer Edition). Same tiles, counties, and state outline — no GPU.
 */
export function RasterFallbackMap({
  className,
  immersive = false,
  darkMode = false,
  mapStyleId = "streets",
}: RasterFallbackMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const LRef = useRef<LeafletNS | null>(null);
  const countiesRef = useRef<LeafletGeoJSON | null>(null);
  const markersRef = useRef<LayerGroup | null>(null);
  const tilesRef = useRef<ReturnType<LeafletNS["tileLayer"]> | null>(null);
  const [ready, setReady] = useState(false);

  const {
    markers,
    choroplethMetric,
    choroplethValues,
    highlightedCounties,
    selectedCounty,
    flyToNonce,
    localNewsPins,
    routeCoordinates,
    routeColor,
  } = useMapStore(
    useShallow((s) => ({
      markers: s.markers,
      choroplethMetric: s.choroplethMetric,
      choroplethValues: s.choroplethValues,
      highlightedCounties: s.highlightedCounties,
      selectedCounty: s.selectedCounty,
      flyToNonce: s.flyToNonce,
      localNewsPins: s.localNewsPins,
      routeCoordinates: s.routeCoordinates,
      routeColor: s.routeColor,
    }))
  );

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    let cancelled = false;

    void (async () => {
      const leaflet = await import("leaflet");
      const L = leaflet.default ?? leaflet;
      if (cancelled || !containerRef.current) return;

      LRef.current = L;
      const [[west, south], [east, north]] = WISCONSIN_BOUNDS;
      const map = L.map(containerRef.current, {
        zoomControl: false,
        attributionControl: true,
        minZoom: 5,
        maxZoom: 14,
        maxBounds: L.latLngBounds([south, west], [north, east]),
        maxBoundsViscosity: 0.85,
      });
      L.control.zoom({ position: "bottomright" }).addTo(map);
      mapRef.current = map;

      const tile = tileForStyle(mapStyleId, darkMode);
      tilesRef.current = L.tileLayer(tile.url, {
        attribution: tile.attribution,
        ...(tile.subdomains ? { subdomains: tile.subdomains } : {}),
      }).addTo(map);

      fitWisconsin(L, map);

      const [counties, outline] = await Promise.all([
        getCountiesGeoJson(),
        getStateOutlineGeoJson(),
      ]);
      if (cancelled || mapRef.current !== map) return;

      const countyLayer = L.geoJSON(counties, {
        style: () => ({
          color: darkMode ? "#94a3b8" : "#64748b",
          weight: 0.7,
          fillColor: darkMode ? "#1a2744" : "#c5d4e8",
          fillOpacity: 0.28,
        }),
        onEachFeature: (feature, layer) => {
          layer.on("click", (event) => {
            L.DomEvent.stopPropagation(event);
            const props = (feature.properties ?? {}) as {
              fips?: string;
              name?: string;
              NAME?: string;
            };
            const fips = String(props.fips ?? "");
            if (!fips) return;
            useMapStore.getState().selectCounty({
              fips,
              countyId: countyIdFromFips(fips),
              name: countyDisplayName(String(props.name ?? props.NAME ?? "County")),
            });
          });
        },
      }).addTo(map);
      countiesRef.current = countyLayer;

      L.geoJSON(outline, {
        interactive: false,
        style: {
          color: darkMode ? "rgba(34, 211, 238, 0.45)" : "rgba(77, 163, 212, 0.4)",
          weight: 10,
          opacity: 1,
          fillOpacity: 0,
        },
      }).addTo(map);
      L.geoJSON(outline, {
        interactive: false,
        style: {
          color: darkMode ? "#e0f7ff" : "#185580",
          weight: 2.2,
          opacity: 1,
          fillOpacity: 0,
        },
      }).addTo(map);

      markersRef.current = L.layerGroup().addTo(map);
      setReady(true);
      map.invalidateSize();
    })();

    return () => {
      cancelled = true;
      setReady(false);
      mapRef.current?.remove();
      mapRef.current = null;
      countiesRef.current = null;
      markersRef.current = null;
      tilesRef.current = null;
    };
    // Map is created once; style/data updates happen in the effects below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const L = LRef.current;
    if (!map || !L || !ready) return;
    tilesRef.current?.remove();
    const tile = tileForStyle(mapStyleId, darkMode);
    tilesRef.current = L.tileLayer(tile.url, {
      attribution: tile.attribution,
      ...(tile.subdomains ? { subdomains: tile.subdomains } : {}),
    }).addTo(map);
    tilesRef.current.bringToBack();
  }, [mapStyleId, darkMode, ready]);

  useEffect(() => {
    const layer = countiesRef.current;
    if (!layer) return;
    const fipsValues = choroplethMetric
      ? fipsValuesFromCountyIds(choroplethValues)
      : {};
    const highlighted = new Set(
      highlightedCounties
        .map((id) => FIPS_BY_COUNTY_ID[id] ?? (/^\d{5}$/.test(id) ? id : ""))
        .filter(Boolean)
    );
    if (selectedCounty?.fips) highlighted.add(selectedCounty.fips);

    layer.setStyle((feature) => {
      const fips = String((feature?.properties as { fips?: string } | undefined)?.fips ?? "");
      const value = fipsValues[fips];
      const painted = Boolean(choroplethMetric && value != null);
      const isHi = highlighted.has(fips);
      return {
        color: isHi ? (darkMode ? "#fde047" : "#d4824a") : darkMode ? "#94a3b8" : "#64748b",
        weight: isHi ? 2.4 : 0.7,
        fillColor: painted
          ? interpolateMetricColor(choroplethMetric!, value!)
          : darkMode
            ? "#1a2744"
            : "#c5d4e8",
        fillOpacity: painted ? 0.82 : 0.28,
      };
    });
  }, [
    choroplethMetric,
    choroplethValues,
    highlightedCounties,
    selectedCounty,
    darkMode,
    ready,
  ]);

  useEffect(() => {
    const map = mapRef.current;
    const L = LRef.current;
    if (!map || !L || !ready) return;
    if (flyToNonce === 0) {
      if (immersive) fitWisconsin(L, map);
      return;
    }
    const { center, zoom } = useMapStore.getState();
    map.flyTo([center.lat, center.lng], Math.min(14, Math.max(5, zoom)), {
      duration: 0.7,
    });
  }, [flyToNonce, immersive, ready]);

  useEffect(() => {
    const L = LRef.current;
    const group = markersRef.current;
    if (!L || !group || !ready) return;
    group.clearLayers();

    for (const marker of markers) {
      L.circleMarker([marker.coordinates.lat, marker.coordinates.lng], {
        radius: 7,
        color: "#fff",
        weight: 2,
        fillColor: marker.color ?? "#1e6b9c",
        fillOpacity: 1,
      })
        .bindTooltip(marker.label ?? "", { direction: "top" })
        .addTo(group);
    }

    for (const pin of localNewsPins) {
      L.circleMarker([pin.coordinates.lat, pin.coordinates.lng], {
        radius: 6,
        color: "#fff",
        weight: 1.5,
        fillColor: toneColor(pin.tone),
        fillOpacity: 1,
      })
        .bindTooltip(pin.headline, { direction: "top" })
        .addTo(group);
    }

    if (routeCoordinates.length > 1) {
      L.polyline(
        routeCoordinates.map((c) => [c.lat, c.lng] as [number, number]),
        { color: routeColor || "#1e6b9c", weight: 4, opacity: 0.9 }
      ).addTo(group);
    }
  }, [markers, localNewsPins, routeCoordinates, routeColor, ready]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !containerRef.current) return;
    const ro = new ResizeObserver(() => map.invalidateSize());
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  return (
    <div className={cn("absolute inset-0 z-0", className)}>
      <div
        ref={containerRef}
        className={cn(
          "raster-fallback-map h-full w-full",
          darkMode && "raster-fallback-map--dark"
        )}
      />
      <p className="pointer-events-none absolute left-1/2 top-3 z-[400] -translate-x-1/2 rounded-full bg-black/55 px-3 py-1 text-[10px] font-medium text-white/85 backdrop-blur-md">
        2D map — WebGL is off in this browser
      </p>
    </div>
  );
}
