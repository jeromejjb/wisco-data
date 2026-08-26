import { FIPS_TO_COUNTY_SHORT_NAME, WI_COUNTY_NAME_TO_FIPS } from "@/lib/wi-county-fips";

/** Featured metros used by marketing/compare UI — not a complete county list. */
export const WI_COUNTIES = [
  { id: "milwaukee", name: "Milwaukee County", fips: "55079", lat: 43.0389, lng: -87.9065 },
  { id: "dane", name: "Dane County", fips: "55025", lat: 43.0731, lng: -89.4012 },
  { id: "brown", name: "Brown County", fips: "55009", lat: 44.5133, lng: -88.0133 },
  { id: "kenosha", name: "Kenosha County", fips: "55059", lat: 42.5847, lng: -87.8212 },
  { id: "racine", name: "Racine County", fips: "55101", lat: 42.7261, lng: -87.7829 },
  { id: "outagamie", name: "Outagamie County", fips: "55087", lat: 44.2619, lng: -88.4154 },
  { id: "eau-claire", name: "Eau Claire County", fips: "55035", lat: 44.8113, lng: -91.4985 },
  { id: "waukesha", name: "Waukesha County", fips: "55133", lat: 43.0117, lng: -88.2315 },
  { id: "marathon", name: "Marathon County", fips: "55073", lat: 44.9591, lng: -89.6301 },
  { id: "winnebago", name: "Winnebago County", fips: "55139", lat: 44.0853, lng: -88.6684 },
] as const;

export function fipsToSlug(fips: string): string | undefined {
  return WI_COUNTIES.find((c) => c.fips === fips)?.id;
}

/** Stable id for any of Wisconsin's 72 counties. */
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

export const FIPS_BY_COUNTY_ID: Record<string, string> = Object.fromEntries(
  Object.entries(WI_COUNTY_NAME_TO_FIPS).map(([, fips]) => [countyIdFromFips(fips), fips])
);

export function countySlugFromName(name: string): string | undefined {
  const normalized = name.trim().toLowerCase();
  const featured = WI_COUNTIES.find(
    (c) => c.name.toLowerCase() === normalized || normalized.startsWith(c.name.split(" ")[0].toLowerCase())
  )?.id;
  if (featured) return featured;
  for (const [fullName, fips] of Object.entries(WI_COUNTY_NAME_TO_FIPS)) {
    if (fullName.toLowerCase() === normalized || fullName.toLowerCase().startsWith(normalized)) {
      return countyIdFromFips(fips);
    }
  }
  return undefined;
}
