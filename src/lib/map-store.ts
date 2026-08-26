"use client";

import { create } from "zustand";
import type { Coordinates } from "@/lib/types";
import type {
  ChoroplethMetric,
  MapAction,
  MapMarkerAction,
} from "@/lib/agent/map-actions";
import type { AreaSentimentSnapshot, LocalNewsMapPin } from "@/lib/news-types";

export type SelectedCounty = {
  fips: string;
  name: string;
  countyId: string;
};

export type MapDemographics = {
  populationByFips: Record<string, number>;
  populationEstimateByFips: Record<string, boolean>;
  laborForceByFips: Record<string, number>;
  medianIncomeByFips: Record<string, number>;
  unemploymentByFips: Record<string, number>;
};

type MapState = {
  center: Coordinates;
  zoom: number;
  pitch: number;
  bearing: number;
  markers: MapMarkerAction[];
  choroplethMetric: ChoroplethMetric | null;
  choroplethValues: Record<string, number>;
  choroplethLabels: Record<string, string>;
  highlightedCounties: string[];
  routeCoordinates: Coordinates[];
  routeColor: string;
  flyToNonce: number;
  /** Bumps when choropleth/markers paint — drives map pulse animation */
  mapPaintNonce: number;
  /** Geographic answer pin (Option C) */
  answerPin: {
    countyId: string;
    countyName: string;
    headline: string;
  } | null;
  localNewsPins: LocalNewsMapPin[];
  areaSentiment: AreaSentimentSnapshot | null;
  localMapAnswer: import("@/lib/agent/local-map-answer").LocalMapAnswer | null;
  selectedCounty: SelectedCounty | null;
  mapDemographics: MapDemographics;
  setAnswerPin: (
    pin: { countyId: string; countyName: string; headline: string } | null
  ) => void;
  setLocalNewsLayer: (
    pins: LocalNewsMapPin[],
    sentiment: AreaSentimentSnapshot | null
  ) => void;
  clearLocalNewsLayer: () => void;
  setLocalMapAnswer: (answer: import("@/lib/agent/local-map-answer").LocalMapAnswer | null) => void;
  setMapDemographics: (data: Partial<MapDemographics>) => void;
  selectCounty: (county: SelectedCounty | null) => void;
  clearSelectedCounty: () => void;
  applyAction: (action: MapAction) => void;
  applyActions: (actions: MapAction[]) => void;
  /** Highlight a job pin and fly to it in one store update — no map paint flash. */
  focusMarker: (id: string, coords?: Coordinates) => void;
  resetMap: () => void;
};

const DEFAULT_CENTER: Coordinates = { lat: 43.95, lng: -89.15 };
const DEFAULT_ZOOM = 7.85;

const initialState = {
  center: DEFAULT_CENTER,
  zoom: DEFAULT_ZOOM,
  pitch: 0,
  bearing: 0,
  markers: [] as MapMarkerAction[],
  choroplethMetric: null as ChoroplethMetric | null,
  choroplethValues: {} as Record<string, number>,
  choroplethLabels: {} as Record<string, string>,
  highlightedCounties: [] as string[],
  routeCoordinates: [] as Coordinates[],
  routeColor: "#1e6b9c",
  flyToNonce: 0,
  mapPaintNonce: 0,
  answerPin: null as {
    countyId: string;
    countyName: string;
    headline: string;
  } | null,
  localNewsPins: [] as LocalNewsMapPin[],
  areaSentiment: null as AreaSentimentSnapshot | null,
  localMapAnswer: null as import("@/lib/agent/local-map-answer").LocalMapAnswer | null,
  selectedCounty: null as SelectedCounty | null,
  mapDemographics: {
    populationByFips: {},
    populationEstimateByFips: {},
    laborForceByFips: {},
    medianIncomeByFips: {},
    unemploymentByFips: {},
  } as MapDemographics,
};

export const useMapStore = create<MapState>((set, get) => ({
  ...initialState,

  setAnswerPin: (pin) => set({ answerPin: pin }),

  setLocalNewsLayer: (pins, sentiment) =>
    set({ localNewsPins: pins, areaSentiment: sentiment }),

  clearLocalNewsLayer: () => set({ localNewsPins: [], areaSentiment: null }),

  setLocalMapAnswer: (answer) => set({ localMapAnswer: answer }),

  setMapDemographics: (data) =>
    set((s) => ({
      mapDemographics: {
        populationByFips: data.populationByFips
          ? { ...s.mapDemographics.populationByFips, ...data.populationByFips }
          : s.mapDemographics.populationByFips,
        populationEstimateByFips: data.populationEstimateByFips
          ? { ...s.mapDemographics.populationEstimateByFips, ...data.populationEstimateByFips }
          : s.mapDemographics.populationEstimateByFips,
        laborForceByFips: data.laborForceByFips
          ? { ...s.mapDemographics.laborForceByFips, ...data.laborForceByFips }
          : s.mapDemographics.laborForceByFips,
        medianIncomeByFips: data.medianIncomeByFips
          ? { ...s.mapDemographics.medianIncomeByFips, ...data.medianIncomeByFips }
          : s.mapDemographics.medianIncomeByFips,
        unemploymentByFips: data.unemploymentByFips
          ? { ...s.mapDemographics.unemploymentByFips, ...data.unemploymentByFips }
          : s.mapDemographics.unemploymentByFips,
      },
    })),

  selectCounty: (county) => {
    if (!county) {
      set({ selectedCounty: null });
      return;
    }
    set({
      selectedCounty: county,
      highlightedCounties: [county.countyId],
    });
  },

  clearSelectedCounty: () => set({ selectedCounty: null, highlightedCounties: [] }),

  applyAction: (action) => {
    set((s) => reduceMapAction(s, action));
  },

  applyActions: (actions) => {
    if (!actions.length) return;
    set((s) => actions.reduce((acc, action) => reduceMapAction(acc, action), s));
  },

  focusMarker: (id, coords) => {
    set((s) => ({
      markers: s.markers.map((m) => ({ ...m, selected: m.id === id })),
      ...(coords
        ? {
            center: coords,
            zoom: 12.2,
            pitch: 36,
            flyToNonce: s.flyToNonce + 1,
          }
        : {}),
    }));
  },

  resetMap: () => {
    set({ ...initialState, flyToNonce: get().flyToNonce + 1 });
  },
}));

function reduceMapAction(s: MapState, action: MapAction): MapState {
  switch (action.type) {
    case "flyTo":
      return {
        ...s,
        center: action.center,
        zoom: action.zoom ?? s.zoom,
        pitch: action.pitch ?? s.pitch,
        bearing: action.bearing ?? s.bearing,
        flyToNonce: s.flyToNonce + 1,
      };
    case "setChoropleth":
      return {
        ...s,
        choroplethMetric: action.metric,
        choroplethValues: action.values,
        choroplethLabels: action.labels ?? {},
        mapPaintNonce: s.mapPaintNonce + 1,
      };
    case "setMarkers":
      return {
        ...s,
        markers: action.markers,
        mapPaintNonce: s.mapPaintNonce + 1,
      };
    case "highlightCounties":
      return { ...s, highlightedCounties: action.countyIds };
    case "drawRoute":
      return {
        ...s,
        routeCoordinates: action.coordinates,
        routeColor: action.color ?? "#1e6b9c",
      };
    case "clearRoute":
      return { ...s, routeCoordinates: [] };
    case "clearHighlights":
      return { ...s, highlightedCounties: [] };
    case "reset":
      return { ...s, ...initialState, flyToNonce: s.flyToNonce + 1 };
    default:
      return s;
  }
}
