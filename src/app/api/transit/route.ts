import { NextResponse } from "next/server";
import { getLiveTransitData } from "@/services/live/transit";

export const revalidate = 300;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const origin = searchParams.get("origin") ?? "Home";
  const destination = searchParams.get("destination") ?? "Workplace";

  try {
    const data = await getLiveTransitData(origin, destination);
    return NextResponse.json({
      data: {
        origin: data.origin,
        routes: data.routes,
        alerts: data.alerts,
        agencies: data.agencies,
        stops: data.stops,
        routeInventory: data.routeInventory,
        stats: data.stats,
      },
      provenance: data.provenance,
    });
  } catch (error) {
    console.error("Transit API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch live transit data", detail: String(error) },
      { status: 502 }
    );
  }
}
