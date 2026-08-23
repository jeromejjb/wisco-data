import { NextRequest, NextResponse } from "next/server";
import { fetchAreaNewsBundle } from "@/services/clients/local-news";
import { userAreaFromCountyId, buildUserArea, DEFAULT_USER_AREA } from "@/lib/user-area";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const countyId = searchParams.get("county");
  const lat = searchParams.get("lat");
  const lng = searchParams.get("lng");
  const limit = Math.min(10, parseInt(searchParams.get("limit") ?? "6", 10) || 6);
  const developmentOnly = searchParams.get("development") === "1";

  let area = DEFAULT_USER_AREA;

  if (lat && lng) {
    const la = parseFloat(lat);
    const ln = parseFloat(lng);
    if (Number.isFinite(la) && Number.isFinite(ln)) {
      area = buildUserArea({ lat: la, lng: ln }, "ip");
    }
  } else if (countyId) {
    area = userAreaFromCountyId(countyId);
  }

  try {
    const bundle = await fetchAreaNewsBundle(area, limit, {
      includeBizJournals: true,
      bizDevelopmentOnly: developmentOnly,
    });
    return NextResponse.json({
      data: bundle.items,
      sentiment: bundle.sentiment,
      mapPins: bundle.mapPins,
      bizJournalItems: bundle.bizJournalItems ?? [],
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
