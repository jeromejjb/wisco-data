"use client";

import { useRef, useEffect, useCallback, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import {
  Map,
  Marker,
  Popup,
  NavigationControl,
  ScaleControl,
  type GeoJSONSource,
  type MapLibreMap,
} from "@/lib/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import { cn } from "@/lib/utils";
import { useMapStore } from "@/lib/map-store";
import { useAppStore } from "@/lib/store";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import { mapFlyDurationMs } from "@/lib/motion";
import { FIPS_BY_COUNTY_ID } from "@/lib/wi-counties";
import { fipsFromCountyId, getCountyCoordinates, countyIdFromFips, countyDisplayName } from "@/lib/county-lookup";
import { userAreaFromCountyId } from "@/lib/user-area";
import { buildCountyHoverHtml } from "@/lib/county-hover-html";
import { getCountiesGeoJson } from "@/lib/wi-counties-geojson";
import {
  MapLegend,
  buildChoroplethExpression,
  fipsValuesFromCountyIds,
} from "./map-legend";
import { MapHud } from "./map-hud";
import { MapStoryBanner } from "./map-story-banner";
import {
  getInitialMapStyle,
  resolveBasemapStyle,
  getMapStyleUrl,
  hasMapboxToken,
  isSatelliteStyle,
  WISCONSIN_BOUNDS,
  WISCONSIN_CENTER,
  WISCONSIN_DEFAULT_ZOOM,
  WISCONSIN_IMMERSIVE_CENTER,
  WISCONSIN_IMMERSIVE_ZOOM,
  WISCONSIN_IMMERSIVE_PITCH,
  type MapStyleId,
} from "@/lib/map-styles";
import { MapBasemapSwitcher } from "./map-basemap-switcher";
import type { MapMarkerAction } from "@/lib/agent/map-actions";
import type { ChoroplethMetric } from "@/lib/agent/map-actions";
import { topicLabel, toneColor } from "@/lib/news-geo";
import type { LocalNewsMapPin } from "@/lib/news-types";
import { escapeHtml, safeHref } from "@/lib/escape-html";

type AgentMapProps = {
  className?: string;
  showHud?: boolean;
  /** Home: full-bleed map, zero chrome overlays. */
  immersive?: boolean;
  /** @deprecated use immersive */
  overlayMode?: boolean;
  /** Basemap on first paint */
  defaultStyleId?: MapStyleId;
};

function resolveStyle(styleId: MapStyleId, darkMode: boolean, forceLight: boolean) {
  if (hasMapboxToken()) return getMapStyleUrl(styleId, forceLight ? false : darkMode);
  return resolveBasemapStyle(styleId, darkMode, { forceLight });
}

type MarkerEntry = {
  marker: Marker;
  color: string;
  label?: string;
  selected?: boolean;
};

function syncMarkerDom(el: HTMLElement, marker: MapMarkerAction) {
  const color = marker.color ?? "#1e6b9c";
  const ring = el.querySelector<HTMLElement>(".map-marker-ring");
  const dot = el.querySelector<HTMLElement>(".map-marker-dot");
  if (ring) ring.style.backgroundColor = color;
  if (dot) dot.style.backgroundColor = color;
  el.classList.toggle("map-marker-selected", Boolean(marker.selected));

  const existingLabel = el.querySelector<HTMLElement>(".map-marker-label");
  if (marker.label) {
    if (existingLabel) {
      existingLabel.textContent = marker.label;
    } else {
      const label = document.createElement("div");
      label.className = "map-marker-label";
      label.textContent = marker.label;
      el.appendChild(label);
    }
  } else if (existingLabel) {
    existingLabel.remove();
  }
}

function createMarkerElement(marker: MapMarkerAction): HTMLElement {
  const el = document.createElement("div");
  el.className = "map-marker group relative cursor-pointer";

  const ring = document.createElement("div");
  ring.className = "map-marker-ring absolute inset-0 rounded-full";
  el.appendChild(ring);

  const dot = document.createElement("div");
  dot.className =
    "map-marker-dot relative h-3.5 w-3.5 rounded-full border-2 border-white shadow-lg";
  el.appendChild(dot);

  syncMarkerDom(el, marker);
  return el;
}

function createNewsMarkerElement(pin: LocalNewsMapPin): HTMLElement {
  const el = document.createElement("div");
  el.className = "map-news-marker group relative cursor-pointer";

  const pulse = document.createElement("div");
  pulse.className = "map-news-marker-pulse absolute inset-0 rounded-sm";
  pulse.style.backgroundColor = toneColor(pin.tone);
  el.appendChild(pulse);

  const icon = document.createElement("div");
  icon.className = "map-news-marker-icon relative flex h-4 w-4 items-center justify-center rounded-sm border-2 border-white shadow-lg";
  icon.style.backgroundColor = toneColor(pin.tone);
  icon.textContent = "▲";
  icon.style.fontSize = "8px";
  icon.style.color = "#fff";
  icon.style.lineHeight = "1";
  el.appendChild(icon);

  return el;
}

function newsPopupHtml(pin: LocalNewsMapPin): string {
  const topic = escapeHtml(topicLabel(pin.topic).toUpperCase());
  const place = pin.countyName
    ? `${topic} · ${escapeHtml(pin.countyName)}`
    : topic;
  const href = safeHref(pin.url);
  const link = href
    ? `<a href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer" class="map-news-popup-link">Read story →</a>`
    : "";
  return `<div class="map-news-popup-card">
    <p class="map-news-popup-kicker">${place}</p>
    <p class="map-news-popup-headline">${escapeHtml(pin.headline)}</p>
    ${pin.blurb ? `<p class="map-news-popup-blurb">${escapeHtml(pin.blurb)}</p>` : ""}
    ${link}
  </div>`;
}

const COUNTIES_SOURCE = "wi-counties";
const COUNTIES_FILL = "wi-counties-fill";
const COUNTIES_LINE = "wi-counties-line";
const COUNTIES_HIGHLIGHT = "wi-counties-highlight";
const ROUTE_SOURCE = "agent-route";
const ROUTE_LAYER = "agent-route-line";

/** Insert data layers below city/road labels on vector basemaps. */
function findDataLayerAnchor(map: MapLibreMap): string | undefined {
  const layers = map.getStyle()?.layers;
  if (!layers) return undefined;
  const symbol = layers.find(
    (l) =>
      l.type === "symbol" &&
      l.layout &&
      ("text-field" in l.layout || "icon-image" in l.layout)
  );
  return symbol?.id;
}

export function AgentMap({
  className,
  showHud,
  immersive: immersiveProp,
  overlayMode,
  defaultStyleId = "streets",
}: AgentMapProps) {
  const immersive = immersiveProp ?? !!overlayMode;
  const forceLightBasemap = false;
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markersByIdRef = useRef(new globalThis.Map<string, MarkerEntry>());
  const newsMarkersByIdRef = useRef(new globalThis.Map<string, MarkerEntry>());
  const newsPopupRef = useRef<Popup | null>(null);
  const popupRef = useRef<Popup | null>(null);
  const answerPinMarkerRef = useRef<Marker | null>(null);
  const answerPinPopupRef = useRef<Popup | null>(null);
  const hoverPopupRef = useRef<Popup | null>(null);
  const hoverCountyRef = useRef<string | null>(null);
  const hoverHandlersBound = useRef(false);
  const mapDemographicsRef = useRef(useMapStore.getState().mapDemographics);
  const choroplethMetricRef = useRef<ChoroplethMetric | null>(null);
  const choroplethValuesRef = useRef<Record<string, number>>({});
  const choroplethLabelsRef = useRef<Record<string, string>>({});
  const skipStyleChangeRef = useRef(true);
  const addCountyLayersRef = useRef<(map: MapLibreMap) => Promise<void>>(async () => {});
  const navControlAddedRef = useRef(false);
  const scaleControlAddedRef = useRef(false);
  const choroplethSigRef = useRef("");
  const resizeTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const darkMode = useAppStore((s) => s.darkMode);
  const reducedMotion = usePrefersReducedMotion();

  const [mapStyleId, setMapStyleId] = useState<MapStyleId>(defaultStyleId);
  const onSatellite = isSatelliteStyle(mapStyleId);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [countiesReady, setCountiesReady] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);

  const {
    center,
    zoom,
    pitch,
    bearing,
    markers,
    choroplethMetric,
    choroplethValues,
    choroplethLabels,
    highlightedCounties,
    selectedCounty,
    mapDemographics,
    routeCoordinates,
    routeColor,
    flyToNonce,
    mapPaintNonce,
    answerPin,
    localNewsPins,
  } = useMapStore(
    useShallow((s) => ({
      center: s.center,
      zoom: s.zoom,
      pitch: s.pitch,
      bearing: s.bearing,
      markers: s.markers,
      choroplethMetric: s.choroplethMetric,
      choroplethValues: s.choroplethValues,
      choroplethLabels: s.choroplethLabels,
      highlightedCounties: s.highlightedCounties,
      selectedCounty: s.selectedCounty,
      mapDemographics: s.mapDemographics,
      routeCoordinates: s.routeCoordinates,
      routeColor: s.routeColor,
      flyToNonce: s.flyToNonce,
      mapPaintNonce: s.mapPaintNonce,
      answerPin: s.answerPin,
      localNewsPins: s.localNewsPins,
    }))
  );

  const [mapPulsing, setMapPulsing] = useState(false);
  const hasChoropleth =
    Boolean(choroplethMetric) && Object.keys(choroplethValues).length > 0;

  useEffect(() => {
    mapDemographicsRef.current = mapDemographics;
    choroplethMetricRef.current = choroplethMetric;
    choroplethValuesRef.current = choroplethValues;
    choroplethLabelsRef.current = choroplethLabels;
  }, [mapDemographics, choroplethMetric, choroplethValues, choroplethLabels]);

  useEffect(() => {
    if (mapPaintNonce === 0 || reducedMotion) return;
    setMapPulsing(true);
    const timer = window.setTimeout(() => setMapPulsing(false), 1800);
    return () => window.clearTimeout(timer);
  }, [mapPaintNonce, reducedMotion]);

  const applyChoropleth = useCallback(
    (map: MapLibreMap) => {
      if (!map.getLayer(COUNTIES_FILL)) return;

      const valSum = Object.values(choroplethValues).reduce((a, b) => a + b, 0);
      const sig = `${choroplethMetric ?? ""}:${Object.keys(choroplethValues).length}:${valSum.toFixed(2)}:${onSatellite}:${immersive}`;
      if (sig === choroplethSigRef.current) return;
      choroplethSigRef.current = sig;

      if (onSatellite) {
        map.setPaintProperty(COUNTIES_LINE, "line-color", "rgba(255,255,255,0.82)");
        map.setPaintProperty(COUNTIES_LINE, "line-width", [
          "interpolate",
          ["linear"],
          ["zoom"],
          5,
          0.75,
          8,
          1.25,
          11,
          2,
        ]);
        map.setPaintProperty(
          COUNTIES_LINE,
          "line-opacity",
          choroplethMetric ? 0.95 : immersive ? 0 : 0.95
        );
      } else {
        map.setPaintProperty(COUNTIES_LINE, "line-color", darkMode ? "#94a3b8" : "#64748b");
        map.setPaintProperty(COUNTIES_LINE, "line-width", [
          "interpolate",
          ["linear"],
          ["zoom"],
          5,
          0.5,
          8,
          1,
          11,
          1.5,
        ]);
        map.setPaintProperty(COUNTIES_LINE, "line-opacity", 0.9);
      }

      if (choroplethMetric && Object.keys(choroplethValues).length > 0) {
        const fipsValues = fipsValuesFromCountyIds(choroplethValues);
        const expr = buildChoroplethExpression(
          choroplethMetric,
          fipsValues,
          onSatellite ? "rgba(12,18,34,0.55)" : darkMode ? "#1a2438" : "#b8c8d8"
        );
        map.setPaintProperty(COUNTIES_FILL, "fill-color", expr);
        map.setPaintProperty(
          COUNTIES_FILL,
          "fill-opacity",
          onSatellite ? 0.82 : immersive ? 0.92 : 0.85
        );
        if (immersive) {
          map.setPaintProperty(COUNTIES_LINE, "line-color", "rgba(255,255,255,0.92)");
          map.setPaintProperty(COUNTIES_LINE, "line-width", [
            "interpolate",
            ["linear"],
            ["zoom"],
            5,
            0.85,
            8,
            1.35,
            11,
            2.1,
          ]);
          map.setPaintProperty(COUNTIES_LINE, "line-opacity", 0.98);
        }
      } else {
        map.setPaintProperty(COUNTIES_FILL, "fill-color", "rgba(0,0,0,0)");
        map.setPaintProperty(COUNTIES_FILL, "fill-opacity", immersive ? 0 : onSatellite ? 0.35 : 0.45);
        if (immersive && !choroplethMetric) {
          map.setPaintProperty(COUNTIES_LINE, "line-opacity", 0.55);
          map.setPaintProperty(COUNTIES_LINE, "line-color", "rgba(12,18,34,0.35)");
        }
      }
    },
    [choroplethMetric, choroplethValues, darkMode, onSatellite, immersive]
  );

  const addCountyLayers = useCallback(
    async (map: MapLibreMap) => {
      const geo = await getCountiesGeoJson();
      const mapDark = forceLightBasemap ? false : darkMode;
      const beforeLabels = findDataLayerAnchor(map);

      if (!map.getSource(COUNTIES_SOURCE)) {
        map.addSource(COUNTIES_SOURCE, { type: "geojson", data: geo, promoteId: "fips" });
      } else {
        (map.getSource(COUNTIES_SOURCE) as GeoJSONSource).setData(geo);
      }

      if (!map.getLayer(COUNTIES_FILL)) {
        map.addLayer(
          {
            id: COUNTIES_FILL,
            type: "fill",
            source: COUNTIES_SOURCE,
            paint: {
              "fill-color": onSatellite
                ? "rgba(255,255,255,0.04)"
                : mapDark
                  ? "rgba(26,39,68,0.35)"
                  : "rgba(30,107,156,0.12)",
              "fill-opacity": onSatellite ? 0.35 : 0.85,
              "fill-outline-color": onSatellite
                ? "rgba(255,255,255,0.5)"
                : "rgba(30,107,156,0.45)",
            },
          },
          beforeLabels
        );
      }

      if (!map.getLayer(COUNTIES_LINE)) {
        map.addLayer(
          {
            id: COUNTIES_LINE,
            type: "line",
            source: COUNTIES_SOURCE,
            paint: {
              "line-color": onSatellite
                ? "rgba(255,255,255,0.82)"
                : mapDark
                  ? "#94a3b8"
                  : "#64748b",
              "line-width": [
                "interpolate",
                ["linear"],
                ["zoom"],
                5,
                onSatellite ? 0.75 : 0.65,
                8,
                onSatellite ? 1.25 : 1.1,
                11,
                onSatellite ? 2 : 1.6,
              ],
              "line-opacity": 0.85,
            },
          },
          beforeLabels
        );
      }

      if (!map.getLayer(COUNTIES_HIGHLIGHT)) {
        map.addLayer({
          id: COUNTIES_HIGHLIGHT,
          type: "line",
          source: COUNTIES_SOURCE,
          paint: {
            "line-color": onSatellite ? "#fde047" : "#d4824a",
            "line-width": 3.5,
            "line-opacity": 0,
          },
          filter: ["==", ["get", "fips"], ""],
        });
      }

      if (!map.getSource(ROUTE_SOURCE)) {
        map.addSource(ROUTE_SOURCE, {
          type: "geojson",
          data: { type: "FeatureCollection", features: [] },
        });
      }

      if (!map.getLayer(ROUTE_LAYER)) {
        map.addLayer({
          id: ROUTE_LAYER,
          type: "line",
          source: ROUTE_SOURCE,
          layout: { "line-cap": "round", "line-join": "round" },
          paint: { "line-color": "#1e6b9c", "line-width": 5, "line-opacity": 0.9 },
        });
      }

      if (!hoverHandlersBound.current) {
        hoverHandlersBound.current = true;
        map.on("mousemove", COUNTIES_FILL, (e) => {
          if (!e.features?.length) return;
          map.getCanvas().style.cursor = "pointer";
          const rawName = e.features[0].properties?.name as string | undefined;
          const fips = String(e.features[0].properties?.fips ?? e.features[0].id ?? "");
          if (!rawName || !fips) return;

          const demo = mapDemographicsRef.current;
          const pop = demo.populationByFips[fips];
          const metric = choroplethMetricRef.current;
          const popupKey = `${fips}:${metric ?? ""}:${pop ?? ""}`;

          if (popupKey === hoverCountyRef.current && hoverPopupRef.current) {
            hoverPopupRef.current.setLngLat(e.lngLat);
            return;
          }

          hoverCountyRef.current = popupKey;
          if (!hoverPopupRef.current) {
            hoverPopupRef.current = new Popup({
              closeButton: false,
              closeOnClick: false,
              className: "workways-popup workways-county-popup",
              offset: 12,
              maxWidth: "240px",
            }).addTo(map);
          }

          const html = buildCountyHoverHtml({
            name: countyDisplayName(rawName),
            fips,
            population: pop,
            populationIsEstimate: demo.populationEstimateByFips[fips],
            medianIncome: demo.medianIncomeByFips[fips],
            choroplethMetric: metric,
            choroplethValues: choroplethValuesRef.current,
            choroplethLabels: choroplethLabelsRef.current,
            unemploymentRate: demo.unemploymentByFips[fips],
          });

          hoverPopupRef.current.setLngLat(e.lngLat).setHTML(html);
        });
        map.on("mouseleave", COUNTIES_FILL, () => {
          map.getCanvas().style.cursor = "";
          hoverCountyRef.current = null;
          hoverPopupRef.current?.remove();
          hoverPopupRef.current = null;
        });
        map.on("click", COUNTIES_FILL, (e) => {
          if (!e.features?.length) return;
          const rawName = e.features[0].properties?.name as string | undefined;
          const fips = String(e.features[0].properties?.fips ?? e.features[0].id ?? "");
          if (!rawName || !fips) return;

          const shortName = rawName.replace(/ County$/i, "").trim();
          useMapStore.getState().selectCounty({
            fips,
            name: shortName,
            countyId: countyIdFromFips(fips),
          });

          hoverCountyRef.current = null;
          hoverPopupRef.current?.remove();
          hoverPopupRef.current = null;
        });
        map.on("click", (e) => {
          const hit = map.queryRenderedFeatures(e.point, { layers: [COUNTIES_FILL] });
          if (hit.length) return;
          useMapStore.getState().clearSelectedCounty();
        });
      }

      applyChoropleth(map);
      setCountiesReady(true);
    },
    [applyChoropleth, choroplethLabels, choroplethMetric, choroplethValues, darkMode, onSatellite, forceLightBasemap]
  );

  useEffect(() => {
    addCountyLayersRef.current = addCountyLayers;
  }, [addCountyLayers]);

  // Init map once — show basemap immediately, counties layer async
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const container = containerRef.current;
    const style = getInitialMapStyle(mapStyleId, darkMode, { forceLight: forceLightBasemap });

    const map = new Map({
      container,
      style,
      center: [center.lng ?? WISCONSIN_CENTER.lng, center.lat ?? WISCONSIN_CENTER.lat],
      zoom: zoom ?? WISCONSIN_DEFAULT_ZOOM,
      pitch: pitch ?? 0,
      bearing: bearing ?? 0,
      maxBounds: WISCONSIN_BOUNDS,
      minZoom: 5.5,
      maxZoom: onSatellite ? 18 : 14,
      attributionControl: { compact: true },
      fadeDuration: 0,
      refreshExpiredTiles: false,
      maxTileCacheSize: 256,
      dragRotate: false,
      pitchWithRotate: false,
    });

    const readyFallback = window.setTimeout(() => {
      map.resize();
      setMapLoaded(true);
    }, 2500);

    let ready = false;

    const markReady = () => {
      if (ready) return;
      ready = true;
      window.clearTimeout(readyFallback);
      setMapLoaded(true);
      setMapError(null);
      map.resize();
      if (immersive) {
        map.jumpTo({
          center: [WISCONSIN_IMMERSIVE_CENTER.lng, WISCONSIN_IMMERSIVE_CENTER.lat],
          zoom: WISCONSIN_IMMERSIVE_ZOOM,
          pitch: WISCONSIN_IMMERSIVE_PITCH,
          bearing: 0,
        });
      }
      addCountyLayersRef.current(map).catch(console.error);
      requestAnimationFrame(() => {
        map.resize();
        if (!navControlAddedRef.current) {
          navControlAddedRef.current = true;
          map.addControl(
            new NavigationControl({ visualizePitch: false, showCompass: false }),
            "bottom-right"
          );
        }
        if (!scaleControlAddedRef.current) {
          scaleControlAddedRef.current = true;
          map.addControl(new ScaleControl({ maxWidth: 120, unit: "imperial" }), "bottom-left");
        }
      });
    };

    map.on("load", markReady);
    map.on("style.load", () => map.resize());
    map.on("error", (e) => {
      const message =
        e.error instanceof Error
          ? e.error.message
          : typeof e.error === "string"
            ? e.error
            : "";
      // Ignore transient tile fetch failures; surface style/parse errors only.
      if (message.includes("Failed to fetch") || message.includes("404")) return;
      if (message.includes("raster-") || !map.isStyleLoaded()) {
        console.error("Map error:", message || e);
        setMapError("Map failed to load. Hard refresh the page (Cmd+Shift+R).");
      }
    });

    mapRef.current = map;

    requestAnimationFrame(() => {
      map.resize();
      if (map.loaded()) markReady();
    });

    return () => {
      window.clearTimeout(readyFallback);
      for (const { marker } of markersByIdRef.current.values()) marker.remove();
      markersByIdRef.current.clear();
      popupRef.current?.remove();
      hoverPopupRef.current?.remove();
      hoverCountyRef.current = null;
      hoverHandlersBound.current = false;
      map.remove();
      mapRef.current = null;
      navControlAddedRef.current = false;
      scaleControlAddedRef.current = false;
      skipStyleChangeRef.current = true;
      setMapLoaded(false);
      setCountiesReady(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep map sized when panel layout changes
  useEffect(() => {
    const container = containerRef.current;
    const map = mapRef.current;
    if (!container || !map) return;

    const ro = new ResizeObserver(() => {
      if (resizeTimerRef.current) clearTimeout(resizeTimerRef.current);
      resizeTimerRef.current = setTimeout(() => map.resize(), 120);
    });
    ro.observe(container);
    return () => {
      ro.disconnect();
      if (resizeTimerRef.current) clearTimeout(resizeTimerRef.current);
    };
  }, [mapLoaded]);

  // Style / basemap switch — home (forceLight) ignores theme toggles
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;
    if (skipStyleChangeRef.current) {
      skipStyleChangeRef.current = false;
      return;
    }

    const next = resolveStyle(mapStyleId, darkMode, forceLightBasemap);
    choroplethSigRef.current = "";
    map.setStyle(next);
    map.once("idle", () => {
      hoverHandlersBound.current = false;
      hoverCountyRef.current = null;
      setCountiesReady(false);
      addCountyLayersRef.current(map).catch(console.error);
    });
  }, [
    mapStyleId,
    mapLoaded,
    forceLightBasemap,
    ...(forceLightBasemap ? [] : [darkMode]),
  ]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !countiesReady) return;
    applyChoropleth(map);
  }, [applyChoropleth, countiesReady]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || flyToNonce === 0) return;
    map.flyTo({
      center: [center.lng, center.lat],
      zoom,
      pitch: reducedMotion ? 0 : pitch,
      bearing: reducedMotion ? 0 : bearing,
      duration: mapFlyDurationMs(reducedMotion, immersive),
      essential: false,
      curve: immersive ? 1.2 : 1.35,
    });
  }, [flyToNonce, center, zoom, pitch, bearing, immersive, reducedMotion]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !countiesReady || !map.getLayer(COUNTIES_HIGHLIGHT)) return;

    const fipsList = Array.from(
      new Set([
        ...highlightedCounties.map((id) => FIPS_BY_COUNTY_ID[id] ?? fipsFromCountyId(id)).filter(Boolean),
        ...(selectedCounty ? [selectedCounty.fips] : []),
      ])
    );
    if (fipsList.length === 0) {
      map.setPaintProperty(COUNTIES_HIGHLIGHT, "line-opacity", 0);
      return;
    }
    map.setFilter(COUNTIES_HIGHLIGHT, ["in", ["get", "fips"], ["literal", fipsList]]);
    map.setPaintProperty(COUNTIES_HIGHLIGHT, "line-opacity", 1);
  }, [highlightedCounties, selectedCounty, countiesReady]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.getSource(ROUTE_SOURCE)) return;

    const source = map.getSource(ROUTE_SOURCE) as GeoJSONSource;
    if (routeCoordinates.length >= 2) {
      source.setData({
        type: "Feature",
        properties: {},
        geometry: {
          type: "LineString",
          coordinates: routeCoordinates.map((c) => [c.lng, c.lat]),
        },
      });
      if (map.getLayer(ROUTE_LAYER)) {
        map.setPaintProperty(ROUTE_LAYER, "line-color", routeColor);
      }
    } else {
      source.setData({ type: "FeatureCollection", features: [] });
    }
  }, [routeCoordinates, routeColor, countiesReady]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    const nextIds = new Set(markers.map((m) => m.id));
    for (const [id, entry] of markersByIdRef.current) {
      if (!nextIds.has(id)) {
        entry.marker.remove();
        markersByIdRef.current.delete(id);
      }
    }

    for (const marker of markers) {
      const color = marker.color ?? "#1e6b9c";
      const existing = markersByIdRef.current.get(marker.id);

      if (existing) {
        existing.marker.setLngLat([marker.coordinates.lng, marker.coordinates.lat]);
        if (
          existing.color !== color ||
          existing.label !== marker.label ||
          existing.selected !== marker.selected
        ) {
          syncMarkerDom(existing.marker.getElement(), marker);
          existing.color = color;
          existing.label = marker.label;
          existing.selected = marker.selected;
        }
        continue;
      }

      const el = createMarkerElement(marker);
      const mbMarker = new Marker({ element: el, anchor: "center" })
        .setLngLat([marker.coordinates.lng, marker.coordinates.lat])
        .addTo(map);

      if (marker.label) {
        const popupLabel = marker.label;
        el.addEventListener("click", () => {
          popupRef.current?.remove();
          popupRef.current = new Popup({
            offset: 14,
            closeButton: true,
            className: "workways-popup",
          })
            .setLngLat([marker.coordinates.lng, marker.coordinates.lat])
            .setHTML(
              `<div class="workways-popup-inner"><strong>${escapeHtml(popupLabel)}</strong></div>`
            )
            .addTo(map);
        });
      }

      markersByIdRef.current.set(marker.id, {
        marker: mbMarker,
        color,
        label: marker.label,
        selected: marker.selected,
      });
    }
  }, [markers, mapLoaded]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    if (!answerPin) {
      answerPinMarkerRef.current?.remove();
      answerPinMarkerRef.current = null;
      answerPinPopupRef.current?.remove();
      answerPinPopupRef.current = null;
      return;
    }

    const coords =
      getCountyCoordinates(answerPin.countyId) ??
      (() => {
        const a = userAreaFromCountyId(answerPin.countyId);
        return { lat: a.lat, lng: a.lng };
      })();

    if (!answerPinMarkerRef.current) {
      const el = document.createElement("div");
      el.className = "workways-answer-pin";
      el.innerHTML = '<span class="workways-answer-pin-dot" aria-hidden="true"></span>';
      answerPinMarkerRef.current = new Marker({ element: el, anchor: "center" })
        .setLngLat([coords.lng, coords.lat])
        .addTo(map);
    } else {
      answerPinMarkerRef.current.setLngLat([coords.lng, coords.lat]);
    }

    answerPinPopupRef.current?.remove();
    answerPinPopupRef.current = null;
    // Headline already lives in the summary card — a second map bubble
    // repeats the same sentence and covers the map on phones.
  }, [answerPin, mapLoaded]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    const nextIds = new Set(localNewsPins.map((p) => p.id));
    for (const [id, entry] of newsMarkersByIdRef.current) {
      if (!nextIds.has(id)) {
        entry.marker.remove();
        newsMarkersByIdRef.current.delete(id);
      }
    }

    for (const pin of localNewsPins) {
      const existing = newsMarkersByIdRef.current.get(pin.id);
      if (existing) {
        existing.marker.setLngLat([pin.coordinates.lng, pin.coordinates.lat]);
        continue;
      }

      const el = createNewsMarkerElement(pin);
      const mbMarker = new Marker({ element: el, anchor: "center" })
        .setLngLat([pin.coordinates.lng, pin.coordinates.lat])
        .addTo(map);

      el.addEventListener("click", () => {
        newsPopupRef.current?.remove();
        newsPopupRef.current = new Popup({
          offset: 16,
          closeButton: true,
          className: "map-news-popup",
          maxWidth: "280px",
        })
          .setLngLat([pin.coordinates.lng, pin.coordinates.lat])
          .setHTML(newsPopupHtml(pin))
          .addTo(map);
      });

      newsMarkersByIdRef.current.set(pin.id, {
        marker: mbMarker,
        color: toneColor(pin.tone),
        label: pin.headline,
      });
    }
  }, [localNewsPins, mapLoaded]);

  return (
    <div
      className={cn(
        "map-canvas relative h-full w-full min-h-[240px] overflow-hidden",
        immersive && "map-canvas--immersive",
        hasChoropleth && immersive && "map-canvas--painted",
        mapPulsing && "map-canvas--pulse",
        onSatellite ? "bg-[#1a2834]" : "bg-[#dbeafe]",
        className
      )}
    >
      {!mapLoaded && !mapError && (
        <div className="pointer-events-none absolute right-14 top-3 z-20 flex items-center gap-2 rounded-full bg-black/50 px-3 py-1.5 backdrop-blur-md">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/80 border-t-transparent" />
          <p className="text-[11px] text-white/80">Loading map…</p>
        </div>
      )}
      {mapError && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-2 bg-[#eef2f6] px-6 text-center dark:bg-navy-900">
          <p className="text-sm font-medium text-foreground">Map unavailable</p>
          <p className="text-xs text-muted-foreground">{mapError}</p>
        </div>
      )}
      <div ref={containerRef} className="absolute inset-0 z-0 h-full w-full" />
      {!immersive && mapLoaded && !countiesReady && (
        <div className="pointer-events-none absolute bottom-14 left-4 z-10 rounded-full bg-navy-900/70 px-2.5 py-1 text-[10px] text-white/60 backdrop-blur-sm">
          Loading counties…
        </div>
      )}
      {!immersive && (
        <>
          <MapStoryBanner
            metric={choroplethMetric}
            values={choroplethValues}
            labels={choroplethLabels}
            onImagery={onSatellite}
            className="z-10"
          />
          <MapLegend metric={choroplethMetric} className="z-10" />
        </>
      )}
      {!immersive && overlayMode && (
        <MapBasemapSwitcher
          value={mapStyleId}
          onChange={setMapStyleId}
          className="absolute bottom-4 left-1/2 z-10 -translate-x-1/2"
        />
      )}
      {showHud && (
        <MapHud
          metric={choroplethMetric}
          markerCount={markers.length}
          highlightedCount={highlightedCounties.length}
          mapStyleId={mapStyleId}
          onStyleChange={setMapStyleId}
        />
      )}
    </div>
  );
}
