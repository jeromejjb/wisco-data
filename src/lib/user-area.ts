import { WI_COUNTIES } from "@/lib/wi-counties";
import { metroRegions } from "@/data/mock/economy";

export type UserAreaSource = "home" | "saved" | "browser" | "ip" | "default";

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

function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
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
  let best: (typeof WI_COUNTIES)[number] = WI_COUNTIES[0];
  let bestDist = Infinity;

  for (const c of WI_COUNTIES) {
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
};

export function resolveAreaFromCityLabel(
  city?: string | null,
  region?: string | null
): Pick<UserArea, "countyId" | "countyName" | "metroName" | "displayName" | "lat" | "lng"> | null {
  if (!city && !region) return null;
  const blob = `${city ?? ""} ${region ?? ""}`.toLowerCase();

  for (const [label, countyId] of Object.entries(CITY_TO_COUNTY)) {
    if (!blob.includes(label)) continue;
    const county = WI_COUNTIES.find((c) => c.id === countyId);
    if (!county) continue;
    const metro =
      metroRegions.find((m) => m.id === county.id)?.name ??
      `${county.name.replace(" County", "")} area`;
    return {
      countyId: county.id,
      countyName: county.name,
      metroName: metro,
      displayName: county.name.replace(" County", ""),
      lat: county.lat,
      lng: county.lng,
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

/** Milwaukee — largest metro; do NOT use geographic center (that resolves to Marathon). */
export const DEFAULT_USER_AREA: UserArea = {
  countyId: "milwaukee",
  countyName: "Milwaukee County",
  metroName: "Milwaukee Metro",
  displayName: "Milwaukee",
  lat: 43.0389,
  lng: -87.9065,
  source: "default",
  inWisconsin: true,
};

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
