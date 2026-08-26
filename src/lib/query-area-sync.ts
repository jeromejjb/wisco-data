import { inferMapQueryIntent } from "@/lib/agent/map-query-intent";
import { countiesFromText } from "@/lib/agent/map-query-intent-utils";
import { fipsFromCountyId, getCountyCoordinates } from "@/lib/county-lookup";
import { matchCityInText, userAreaFromCountyId, type UserArea } from "@/lib/user-area";
import { useAppStore } from "@/lib/store";
import { useMapStore } from "@/lib/map-store";

export function resolveQueryCountyId(text: string): string | undefined {
  const intent = inferMapQueryIntent(text);
  if (intent?.flyToCountyId) return intent.flyToCountyId;
  if (intent?.highlightCountyIds?.[0]) return intent.highlightCountyIds[0];
  const city = matchCityInText(text);
  if (city) return city.countyId;
  return countiesFromText(text)[0];
}

/** Map a search string to a user area, preferring city names (e.g. Green Bay over Brown). */
export function userAreaFromQueryText(text: string): UserArea | null {
  const countyId = resolveQueryCountyId(text);
  if (!countyId) return null;

  const city = matchCityInText(text);
  const base = userAreaFromCountyId(countyId);
  if (city) {
    return {
      ...base,
      displayName: city.cityLabel,
      metroName: `${city.cityLabel} area`,
      source: "manual",
    };
  }
  return { ...base, source: "manual" };
}

/** Sync area picker, map focus, and county panel from a user query or starter chip. */
export function applyQueryAreaSync(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return false;

  const area = userAreaFromQueryText(trimmed);
  if (!area) return false;

  const intent = inferMapQueryIntent(trimmed);
  const coords = getCountyCoordinates(area.countyId);
  if (!coords) return false;

  useAppStore.getState().setChosenArea(area);

  const zoom = intent?.searchJobs
    ? intent.searchJobs.transitOnly
      ? 10.5
      : 10.25
    : intent?.metric
      ? 8.15
      : 9;

  useMapStore.getState().applyActions([
    { type: "flyTo", center: coords, zoom, pitch: 34 },
    { type: "highlightCounties", countyIds: [area.countyId] },
  ]);

  const openCountySheet = Boolean(intent?.searchJobs);
  if (openCountySheet) {
    const fips = fipsFromCountyId(area.countyId);
    if (fips) {
      useMapStore.getState().selectCounty({
        fips,
        name: area.displayName,
        countyId: area.countyId,
      });
    }
  }

  return true;
}
