"use client";

import { useEffect, useState } from "react";
import { useAppStore } from "@/lib/store";
import {
  buildUserArea,
  DEFAULT_USER_AREA,
  type UserArea,
} from "@/lib/user-area";

type LocationMeta = {
  city?: string | null;
  region?: string | null;
  country?: string | null;
  resolved?: boolean;
};

export function useUserArea() {
  const chosenArea = useAppStore((s) => s.chosenArea);
  const homeLocation = useAppStore((s) => s.homeLocation);
  const savedPlaces = useAppStore((s) => s.savedPlaces);
  const detectedArea = useAppStore((s) => s.detectedArea);
  const setDetectedArea = useAppStore((s) => s.setDetectedArea);
  const browserLocationEnabled = useAppStore((s) => s.browserLocationEnabled);
  const locationPromptsEnabled = useAppStore((s) => s.locationPromptsEnabled);

  const [meta, setMeta] = useState<LocationMeta>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!locationPromptsEnabled) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function resolve() {
      setLoading(true);

      if (homeLocation?.coordinates) {
        const area = buildUserArea(homeLocation.coordinates, "home");
        if (!cancelled) {
          setDetectedArea(area);
          setMeta({ resolved: true });
          setLoading(false);
        }
        return;
      }

      const savedWithCoords = savedPlaces.find((p) => p.coordinates);
      if (savedWithCoords?.coordinates) {
        const area = buildUserArea(savedWithCoords.coordinates, "saved");
        if (!cancelled) {
          setDetectedArea(area);
          setMeta({ resolved: true });
          setLoading(false);
        }
        return;
      }

      if (browserLocationEnabled && typeof navigator !== "undefined" && navigator.geolocation) {
        try {
          const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              timeout: 8000,
              maximumAge: 300_000,
            });
          });
          const area = buildUserArea(
            { lat: pos.coords.latitude, lng: pos.coords.longitude },
            "browser"
          );
          if (!cancelled) {
            setDetectedArea(area);
            setMeta({ resolved: true });
            setLoading(false);
          }
          return;
        } catch {
          /* fall through to IP */
        }
      }

      try {
        const res = await fetch("/api/location");
        if (res.ok) {
          const json = (await res.json()) as {
            area: UserArea | null;
            meta: LocationMeta;
          };
          if (!cancelled) {
            if (json.area) setDetectedArea(json.area);
            setMeta(json.meta ?? {});
            setLoading(false);
          }
          return;
        }
      } catch {
        /* try client IP fallback */
      }

      try {
        const ipRes = await fetch("https://ipapi.co/json/", { signal: AbortSignal.timeout(5000) });
        if (ipRes.ok) {
          const ip = (await ipRes.json()) as {
            latitude?: number;
            longitude?: number;
            city?: string;
            region_code?: string;
          };
          if (ip.latitude && ip.longitude) {
            const { buildUserAreaFromGeo } = await import("@/lib/user-area");
            const area = buildUserAreaFromGeo({
              coords: { lat: ip.latitude, lng: ip.longitude },
              city: ip.city,
              region: ip.region_code,
              source: "ip",
            });
            if (!cancelled) {
              setDetectedArea(area);
              setMeta({ resolved: true, city: ip.city, region: ip.region_code });
              setLoading(false);
            }
            return;
          }
        }
      } catch {
        /* default */
      }

      if (!cancelled) {
        setDetectedArea(DEFAULT_USER_AREA);
        setMeta({ resolved: false });
        setLoading(false);
      }
    }

    void resolve();
    return () => {
      cancelled = true;
    };
  }, [
    homeLocation,
    savedPlaces,
    browserLocationEnabled,
    locationPromptsEnabled,
    setDetectedArea,
  ]);

  const area = chosenArea
    ? chosenArea
    : locationPromptsEnabled
      ? (detectedArea ?? DEFAULT_USER_AREA)
      : DEFAULT_USER_AREA;

  return { area, meta, loading, locationPromptsEnabled, chosenArea };
}
