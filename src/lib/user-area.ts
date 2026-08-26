import { WI_COUNTIES } from "@/lib/wi-counties";
import { WI_COUNTY_NAME_TO_FIPS } from "@/lib/wi-county-fips";
import { allCountyRecords, countyIdFromFips, getCountyCoordinates } from "@/lib/county-lookup";
import { WI_COUNTY_CENTROIDS } from "@/data/wi-county-centroids";
import { metroRegions } from "@/data/mock/economy";
import { WISCONSIN_CENTER } from "@/lib/map-styles";

export type UserAreaSource = "home" | "saved" | "browser" | "ip" | "default" | "manual";

export type UserArea = {
  countyId: string;
  countyName: string;
  metroName: string;
  displayName: string;
  lat: number;
  lng: number;
  source: UserAreaSource;
  inWisconsin: boolean;
};

const WI_BOUNDS = {
  minLat: 42.4,
  maxLat: 47.1,
  minLng: -92.9,
  maxLng: -86.7,
};

export function isInWisconsin(lat: number, lng: number): boolean {
  return (
    lat >= WI_BOUNDS.minLat &&
    lat <= WI_BOUNDS.maxLat &&
    lng >= WI_BOUNDS.minLng &&
    lng <= WI_BOUNDS.maxLng
  );
}

export function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function nearestCountyFromCoords(coords: {
  lat: number;
  lng: number;
}): Pick<UserArea, "countyId" | "countyName" | "metroName" | "displayName" | "lat" | "lng"> {
  const counties = allCountyRecords();
  let best = counties[0]!;
  let bestDist = Infinity;

  for (const c of counties) {
    const d = haversineKm(coords, { lat: c.lat, lng: c.lng });
    if (d < bestDist) {
      bestDist = d;
      best = c;
    }
  }

  const metro =
    metroRegions.find((m) => m.id === best.id)?.name ??
    `${best.name.replace(" County", "")} area`;

  const display = best.name.replace(" County", "");

  return {
    countyId: best.id,
    countyName: best.name,
    metroName: metro,
    displayName: display,
    lat: best.lat,
    lng: best.lng,
  };
}

export function buildUserArea(
  coords: { lat: number; lng: number },
  source: UserAreaSource
): UserArea {
  const nearest = nearestCountyFromCoords(coords);
  return {
    ...nearest,
    source,
    inWisconsin: isInWisconsin(coords.lat, coords.lng),
  };
}

/** Common city / IP labels → county id */
const CITY_TO_COUNTY: Record<string, string> = {
  milwaukee: "milwaukee",
  "west allis": "milwaukee",
  wauwatosa: "milwaukee",
  madison: "dane",
  "green bay": "brown",
  waukesha: "waukesha",
  kenosha: "kenosha",
  racine: "racine",
  appleton: "outagamie",
  oshkosh: "winnebago",
  "eau claire": "eau-claire",
  wausau: "marathon",
  "la crosse": "la-crosse",
  sheboygan: "sheboygan",
  "fond du lac": "fond-du-lac",
  janesville: "rock",
  beloit: "rock",
  manitowoc: "manitowoc",
  superior: "douglas",
  "stevens point": "portage",
  "wisconsin dells": "columbia",
  "door county": "door",
  "st. croix": "st-croix",
  "st croix": "st-croix",
  "lake geneva": "walworth",
};

/** Match Wisconsin city names in free text (longest label first). */
export function matchCityInText(text: string): { countyId: string; cityLabel: string } | null {
  const lower = text.toLowerCase();
  const entries = Object.entries(CITY_TO_COUNTY).sort((a, b) => b[0].length - a[0].length);
  for (const [label, countyId] of entries) {
    if (!lower.includes(label)) continue;
    const cityLabel = label
      .split(" ")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
    return { countyId, cityLabel };
  }
  return null;
}

export function resolveAreaFromCityLabel(
  city?: string | null,
  region?: string | null
): Pick<UserArea, "countyId" | "countyName" | "metroName" | "displayName" | "lat" | "lng"> | null {
  if (!city && !region) return null;
  const blob = `${city ?? ""} ${region ?? ""}`.toLowerCase();

  for (const [label, countyId] of Object.entries(CITY_TO_COUNTY)) {
    if (!blob.includes(label)) continue;
    const area = userAreaFromCountyId(countyId);
    if (area.countyId === "statewide") continue;
    return {
      countyId: area.countyId,
      countyName: area.countyName,
      metroName: area.metroName,
      displayName: area.displayName,
      lat: area.lat,
      lng: area.lng,
    };
  }
  return null;
}

/** Prefer IP city name over coarse/wrong coordinates (e.g. Milwaukee user → Marathon). */
export function buildUserAreaFromGeo(input: {
  coords?: { lat: number; lng: number } | null;
  city?: string | null;
  region?: string | null;
  source: UserAreaSource;
}): UserArea {
  const fromCity = resolveAreaFromCityLabel(input.city, input.region);

  if (!input.coords || !Number.isFinite(input.coords.lat) || !Number.isFinite(input.coords.lng)) {
    if (fromCity) {
      return { ...fromCity, source: input.source, inWisconsin: true };
    }
    return DEFAULT_USER_AREA;
  }

  const fromCoords = buildUserArea(input.coords, input.source);

  if (fromCity && input.source === "ip") {
    const centralIds = new Set(["marathon", "winnebago", "eau-claire"]);
    const distToCityMetro = haversineKm(input.coords, { lat: fromCity.lat, lng: fromCity.lng });
    if (
      fromCity.countyId !== fromCoords.countyId &&
      (centralIds.has(fromCoords.countyId) || distToCityMetro < 100)
    ) {
      return {
        ...fromCity,
        source: input.source,
        inWisconsin: isInWisconsin(input.coords.lat, input.coords.lng),
      };
    }
  }

  return fromCoords;
}

/** Statewide frame when location is unknown — never a silent Milwaukee default. */
export const DEFAULT_USER_AREA: UserArea = {
  countyId: "statewide",
  countyName: "Wisconsin",
  metroName: "Wisconsin",
  displayName: "Wisconsin",
  lat: WISCONSIN_CENTER.lat,
  lng: WISCONSIN_CENTER.lng,
  source: "default",
  inWisconsin: true,
};

/** Build a UserArea from any Wisconsin county id (featured or slug). */
export function userAreaFromCountyId(countyId: string): UserArea {
  const featured = WI_COUNTIES.find((c) => c.id === countyId);
  if (featured) {
    const metro =
      metroRegions.find((m) => m.id === featured.id)?.name ??
      `${featured.name.replace(" County", "")} area`;
    return {
      countyId: featured.id,
      countyName: featured.name,
      metroName: metro,
      displayName: featured.name.replace(" County", ""),
      lat: featured.lat,
      lng: featured.lng,
      source: "manual",
      inWisconsin: true,
    };
  }

  for (const [fullName, fips] of Object.entries(WI_COUNTY_NAME_TO_FIPS)) {
    if (countyIdFromFips(fips) !== countyId) continue;
    const centroid = WI_COUNTY_CENTROIDS[fips];
    const short = fullName.replace(/ County$/, "");
    return {
      countyId,
      countyName: fullName,
      metroName: `${short} area`,
      displayName: short,
      lat: centroid?.lat ?? 44.5,
      lng: centroid?.lng ?? -89.5,
      source: "manual",
      inWisconsin: true,
    };
  }

  const coords = getCountyCoordinates(countyId);
  if (coords) {
    return {
      countyId,
      countyName: `${countyId} County`,
      metroName: `${countyId} area`,
      displayName: countyId,
      lat: coords.lat,
      lng: coords.lng,
      source: "manual",
      inWisconsin: true,
    };
  }

  return DEFAULT_USER_AREA;
}

/** Match insights / news to a county or metro label */
export function areaMatchesRegion(area: UserArea, region?: string | null): boolean {
  if (!region) return true;
  const r = region.toLowerCase();
  const tokens = [
    area.displayName.toLowerCase(),
    area.countyId,
    area.countyName.toLowerCase(),
    area.metroName.toLowerCase(),
  ];
  return tokens.some((t) => r.includes(t) || t.includes(r.split(" ")[0]));
}
