import { isInWisconsin } from "@/lib/user-area";

export type GeocodeResult = {
  lat: number;
  lng: number;
  matchedAddress: string;
};

/** Census Bureau public geocoder — Wisconsin addresses only. */
export async function geocodeWisconsinAddress(address: string): Promise<GeocodeResult | null> {
  const q = address.trim();
  if (q.length < 4) return null;

  const url = new URL("https://geocoding.geo.census.gov/geocoder/locations/onelineaddress");
  url.searchParams.set("address", q);
  url.searchParams.set("benchmark", "Public_AR_Current");
  url.searchParams.set("format", "json");

  const res = await fetch(url.toString(), { signal: AbortSignal.timeout(8000) });
  if (!res.ok) return null;

  const json = (await res.json()) as {
    result?: {
      addressMatches?: Array<{
        matchedAddress?: string;
        coordinates?: { x: number; y: number };
      }>;
    };
  };

  const match = json.result?.addressMatches?.[0];
  const lng = match?.coordinates?.x;
  const lat = match?.coordinates?.y;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (!isInWisconsin(lat!, lng!)) return null;

  return {
    lat: lat!,
    lng: lng!,
    matchedAddress: match?.matchedAddress ?? q,
  };
}
