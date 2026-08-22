import { NextRequest, NextResponse } from "next/server";
import { fetchAreaNewsBundle } from "@/services/clients/local-news";
import { buildUserArea, DEFAULT_USER_AREA } from "@/lib/user-area";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const countyId = searchParams.get("county");
  const lat = searchParams.get("lat");
  const lng = searchParams.get("lng");
  const limit = Math.min(8, parseInt(searchParams.get("limit") ?? "6", 10) || 6);

  let area = DEFAULT_USER_AREA;

  if (lat && lng) {
    const la = parseFloat(lat);
    const ln = parseFloat(lng);
    if (Number.isFinite(la) && Number.isFinite(ln)) {
      area = buildUserArea({ lat: la, lng: ln }, "ip");
    }
  } else if (countyId) {
    const { WI_COUNTIES } = await import("@/lib/wi-counties");
    const fromList = WI_COUNTIES.find((c) => c.id === countyId);
    if (fromList) {
      area = buildUserArea({ lat: fromList.lat, lng: fromList.lng }, "default");
    }
  }

  try {
    const bundle = await fetchAreaNewsBundle(area, limit);
    return NextResponse.json({
      data: bundle.items,
      sentiment: bundle.sentiment,
      mapPins: bundle.mapPins,
      meta: bundle.meta,
      area: {
        countyId: area.countyId,
        displayName: area.displayName,
        source: area.source,
      },
    });
  } catch (error) {
    console.error("News API error:", error);
    return NextResponse.json(
      {
        data: [],
        sentiment: null,
        mapPins: [],
        error: "Failed to fetch area news",
        detail: String(error),
        meta: { sources: [], gnewsConfigured: false, sentimentAvailable: false },
      },
      { status: 502 }
    );
  }
}
