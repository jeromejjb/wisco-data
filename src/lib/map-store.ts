"use client";

import { create } from "zustand";
import type { Coordinates } from "@/lib/types";
import type {
  ChoroplethMetric,
  MapAction,
  MapMarkerAction,
} from "@/lib/agent/map-actions";
import type { AreaSentimentSnapshot, LocalNewsMapPin } from "@/lib/news-types";

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
  setAnswerPin: (
    pin: { countyId: string; countyName: string; headline: string } | null
  ) => void;
  setLocalNewsLayer: (
    pins: LocalNewsMapPin[],
    sentiment: AreaSentimentSnapshot | null
  ) => void;
  clearLocalNewsLayer: () => void;
  setLocalMapAnswer: (answer: import("@/lib/agent/local-map-answer").LocalMapAnswer | null) => void;
  applyAction: (action: MapAction) => void;
  applyActions: (actions: MapAction[]) => void;
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
};

export const useMapStore = create<MapState>((set, get) => ({
  ...initialState,

  setAnswerPin: (pin) => set({ answerPin: pin }),

  setLocalNewsLayer: (pins, sentiment) =>
    set({ localNewsPins: pins, areaSentiment: sentiment }),

  clearLocalNewsLayer: () => set({ localNewsPins: [], areaSentiment: null }),

  setLocalMapAnswer: (answer) => set({ localMapAnswer: answer }),

  applyAction: (action) => {
    switch (action.type) {
      case "flyTo":
        set({
          center: action.center,
          zoom: action.zoom ?? get().zoom,
          pitch: action.pitch ?? get().pitch,
          bearing: action.bearing ?? get().bearing,
          flyToNonce: get().flyToNonce + 1,
        });
        break;
      case "setChoropleth":
        set({
          choroplethMetric: action.metric,
          choroplethValues: action.values,
          choroplethLabels: action.labels ?? {},
          mapPaintNonce: get().mapPaintNonce + 1,
        });
        break;
      case "setMarkers":
        set({ markers: action.markers, mapPaintNonce: get().mapPaintNonce + 1 });
        break;
      case "highlightCounties":
        set({ highlightedCounties: action.countyIds });
        break;
      case "drawRoute":
        set({
          routeCoordinates: action.coordinates,
          routeColor: action.color ?? "#1e6b9c",
        });
        break;
      case "clearRoute":
        set({ routeCoordinates: [] });
        break;
      case "clearHighlights":
        set({ highlightedCounties: [] });
        break;
      case "reset":
        set({ ...initialState, flyToNonce: get().flyToNonce + 1 });
        break;
    }
  },

  applyActions: (actions) => {
    actions.forEach((a) => get().applyAction(a));
  },

  resetMap: () => {
    set({ ...initialState, flyToNonce: get().flyToNonce + 1 });
  },
}));
