import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { SavedPlace, Job } from "./types";
import type { UserArea } from "./user-area";

type AppState = {
  darkMode: boolean;
  toggleDarkMode: () => void;
  homeLocation: SavedPlace | null;
  setHomeLocation: (place: SavedPlace | null) => void;
  /** User-picked metro — persists across sessions */
  chosenArea: UserArea | null;
  setChosenArea: (area: UserArea | null) => void;
  /** Detected or chosen area for localized prompts */
  detectedArea: UserArea | null;
  setDetectedArea: (area: UserArea | null) => void;
  locationPromptsEnabled: boolean;
  setLocationPromptsEnabled: (v: boolean) => void;
  /** Opt-in: show news-based starter chips */
  newsPromptsEnabled: boolean;
  setNewsPromptsEnabled: (v: boolean) => void;
  /** Opt-in: use browser GPS (requires permission) */
  browserLocationEnabled: boolean;
  setBrowserLocationEnabled: (v: boolean) => void;
  savedJobs: string[];
  savedPlaces: SavedPlace[];
  savedCommutes: { id: string; name: string; originId: string; destinationId: string }[];
  toggleSaveJob: (jobId: string) => void;
  addSavedPlace: (place: SavedPlace) => void;
  removeSavedPlace: (id: string) => void;
};

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      darkMode: false,
      toggleDarkMode: () => set({ darkMode: !get().darkMode }),
      homeLocation: null,
      setHomeLocation: (place) => set({ homeLocation: place }),
      chosenArea: null,
      setChosenArea: (area) => set({ chosenArea: area }),
      detectedArea: null,
      setDetectedArea: (area) => set({ detectedArea: area }),
      locationPromptsEnabled: true,
      setLocationPromptsEnabled: (v) => set({ locationPromptsEnabled: v }),
      newsPromptsEnabled: false,
      setNewsPromptsEnabled: (v) => set({ newsPromptsEnabled: v }),
      browserLocationEnabled: false,
      setBrowserLocationEnabled: (v) => set({ browserLocationEnabled: v }),
      savedJobs: [],
      savedPlaces: [],
      savedCommutes: [],
      toggleSaveJob: (jobId) => {
        const current = get().savedJobs;
        set({
          savedJobs: current.includes(jobId)
            ? current.filter((id) => id !== jobId)
            : [...current, jobId],
        });
      },
      addSavedPlace: (place) =>
        set({ savedPlaces: [...get().savedPlaces, place] }),
      removeSavedPlace: (id) =>
        set({ savedPlaces: get().savedPlaces.filter((p) => p.id !== id) }),
    }),
    {
      name: "wisconsin-workways",
      version: 3,
      partialize: (state) => ({
        darkMode: state.darkMode,
        homeLocation: state.homeLocation,
        chosenArea: state.chosenArea,
        locationPromptsEnabled: state.locationPromptsEnabled,
        newsPromptsEnabled: state.newsPromptsEnabled,
        browserLocationEnabled: state.browserLocationEnabled,
        savedJobs: state.savedJobs,
        savedPlaces: state.savedPlaces,
        savedCommutes: state.savedCommutes,
        // detectedArea re-resolved each session — never persist stale Marathon, etc.
      }),
    }
  )
);

export function isJobSaved(jobId: string, savedJobs: string[]) {
  return savedJobs.includes(jobId);
}

export type { Job };
