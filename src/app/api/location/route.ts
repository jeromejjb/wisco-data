import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { buildUserAreaFromGeo } from "@/lib/user-area";

export const dynamic = "force-dynamic";

/** Resolve approximate user location from CDN / platform geo headers. */
export async function GET() {
  const h = await headers();

  const latHeader =
    h.get("x-vercel-ip-latitude") ??
    h.get("cf-iplatitude") ??
    h.get("x-appengine-citylatlong")?.split(",")[0];

  const lngHeader =
    h.get("x-vercel-ip-longitude") ??
    h.get("cf-iplongitude") ??
    h.get("x-appengine-citylatlong")?.split(",")[1];

  const city = decodeURIComponent(h.get("x-vercel-ip-city") ?? h.get("cf-ipcity") ?? "");
  const region = h.get("x-vercel-ip-country-region") ?? h.get("cf-region");
  const country = h.get("x-vercel-ip-country") ?? h.get("cf-ipcountry");

  const lat = latHeader ? parseFloat(latHeader) : NaN;
  const lng = lngHeader ? parseFloat(lngHeader) : NaN;
  const hasCoords = Number.isFinite(lat) && Number.isFinite(lng);

  if (!hasCoords && !city) {
    return NextResponse.json({
      area: null,
      meta: {
        resolved: false,
        city: null,
        region,
        country,
        hint: "No geo headers — showing statewide Wisconsin, not a metro default",
      },
    });
  }

  const area = buildUserAreaFromGeo({
    coords: hasCoords ? { lat, lng } : null,
    city: city || null,
    region,
    source: "ip",
  });

  return NextResponse.json({
    area,
    meta: {
      resolved: hasCoords || Boolean(city),
      city: city || null,
      region,
      country,
      coordinates: hasCoords ? { lat, lng } : undefined,
    },
  });
}
