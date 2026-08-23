import { WI_COUNTY_NAME_TO_FIPS } from "@/lib/wi-county-fips";
import { fipsToSlug, WI_COUNTIES } from "@/lib/wi-counties";
import { FIPS_TO_COUNTY_SHORT_NAME } from "@/lib/wi-county-fips";
import { WI_COUNTY_CENTROIDS } from "@/data/wi-county-centroids";

/** Stable county id for API lookups — featured metros use short ids; others use kebab slug. */
export function countyIdFromFips(fips: string): string {
  const featured = fipsToSlug(fips);
  if (featured) return featured;
  const short = FIPS_TO_COUNTY_SHORT_NAME[fips];
  if (!short) return fips;
  return short
    .toLowerCase()
    .replace(/\./g, "")
    .replace(/\s+/g, "-");
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
