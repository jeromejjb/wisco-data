import { NextResponse } from "next/server";
import { getLiveEconomyData } from "@/services/live/economy";

export const revalidate = 3600;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const countyId = searchParams.get("county");

  try {
    const data = await getLiveEconomyData();

    if (countyId) {
      const county = data.counties.find((c) => c.id === countyId);
      if (!county) {
        return NextResponse.json({ error: "County not found" }, { status: 404 });
      }
      return NextResponse.json({
        data: county,
        provenance: data.statewide.provenance,
      });
    }

    return NextResponse.json({
      data: {
        statewide: data.statewide,
        counties: data.counties,
        metros: data.metros,
        unemploymentByFips: data.unemploymentByFips,
        countyLabelsByFips: data.countyLabelsByFips,
        unemploymentTrend: data.unemploymentTrend,
        industryBreakdown: data.industryBreakdown,
        rawSources: data.rawSources,
      },
      provenance: data.statewide.provenance,
    });
  } catch (error) {
    console.error("Economy API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch live economic data", detail: String(error) },
      { status: 502 }
    );
  }
}
