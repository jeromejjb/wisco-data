import { WI_COUNTY_NAME_TO_FIPS } from "@/lib/wi-county-fips";
import { countyIdFromFips, WI_COUNTIES } from "@/lib/wi-counties";
import { WI_COUNTY_CENTROIDS } from "@/data/wi-county-centroids";

export { countyIdFromFips } from "@/lib/wi-counties";

export type CountyRecord = {
  id: string;
  name: string;
  fips: string;
  lat: number;
  lng: number;
};

/** All 72 Wisconsin counties with centroids. */
export function allCountyRecords(): CountyRecord[] {
  return Object.entries(WI_COUNTY_NAME_TO_FIPS).map(([name, fips]) => {
    const c = WI_COUNTY_CENTROIDS[fips];
    return {
      id: countyIdFromFips(fips),
      name,
      fips,
      lat: c?.lat ?? 44.5,
      lng: c?.lng ?? -89.5,
    };
  });
}

export function countyDisplayName(name: string): string {
  const trimmed = name.trim();
  if (trimmed.toLowerCase().endsWith(" county")) return trimmed;
  return `${trimmed} County`;
}

export function censusRowNameToFips(censusName: string): string | undefined {
  const countyPart = censusName.replace(/, Wisconsin$/i, "").trim();
  return WI_COUNTY_NAME_TO_FIPS[countyPart];
}

export function fipsFromCountyId(countyId: string): string | undefined {
  const featured = WI_COUNTIES.find((c) => c.id === countyId);
  if (featured) return featured.fips;
  for (const [, fips] of Object.entries(WI_COUNTY_NAME_TO_FIPS)) {
    if (countyIdFromFips(fips) === countyId) return fips;
  }
  return /^\d{5}$/.test(countyId) ? countyId : undefined;
}

export function getCountyCoordinates(countyId: string): { lat: number; lng: number } | null {
  const featured = WI_COUNTIES.find((c) => c.id === countyId);
  if (featured) return { lat: featured.lat, lng: featured.lng };
  const fips = fipsFromCountyId(countyId);
  if (!fips) return null;
  const c = WI_COUNTY_CENTROIDS[fips];
  return c ? { lat: c.lat, lng: c.lng } : null;
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Match any of Wisconsin's 72 counties in free text (longest name wins). */
export function countyIdsFromText(text: string): string[] {
  const matches: { id: string; len: number }[] = [];
  for (const [fullName, fips] of Object.entries(WI_COUNTY_NAME_TO_FIPS)) {
    const short = fullName.replace(/ County$/, "");
    const pattern = new RegExp(`\\b${escapeRegExp(short)}\\b`, "i");
    if (pattern.test(text)) {
      matches.push({ id: countyIdFromFips(fips), len: short.length });
    }
  }
  matches.sort((a, b) => b.len - a.len);
  return [...new Set(matches.map((m) => m.id))];
}

export function primaryCountyIdFromText(text: string): string | undefined {
  return countyIdsFromText(text)[0];
}
