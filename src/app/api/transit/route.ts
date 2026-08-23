import { NextResponse } from "next/server";
import { getLiveTransitData } from "@/services/live/transit";
import { isTransitAgencyId } from "@/lib/transit-agencies";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const origin = searchParams.get("origin") ?? "Home";
  const destination = searchParams.get("destination") ?? "Workplace";
  const agency = searchParams.get("agency");
  const includeShapes = searchParams.get("shapes") !== "0";
  const includeRealtime = searchParams.get("realtime") !== "0";

  const bboxParam = searchParams.get("bbox");
  let bbox: { minLat: number; maxLat: number; minLng: number; maxLng: number } | undefined;
  if (bboxParam) {
    const [minLat, maxLat, minLng, maxLng] = bboxParam.split(",").map(Number);
    if ([minLat, maxLat, minLng, maxLng].every(Number.isFinite)) {
      bbox = { minLat, maxLat, minLng, maxLng };
    }
  }

  try {
    const data = await getLiveTransitData({
      originLabel: origin,
      destLabel: destination,
      agencyId:
        agency && agency !== "all" && isTransitAgencyId(agency) ? agency : agency === "all" ? "all" : undefined,
      bbox,
      includeShapes,
      includeRealtime,
    });

    return NextResponse.json({
      data: {
        origin: data.origin,
        routes: data.routes,
        alerts: data.alerts,
        agencies: data.agencies,
        allAgencies: data.allAgencies,
        stops: data.stops,
        routeInventory: data.routeInventory,
        shapes: data.shapes,
        vehicles: data.vehicles,
        stats: data.stats,
        mapCenter: data.mapCenter,
        mapZoom: data.mapZoom,
        activeAgencyId: data.activeAgencyId,
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
