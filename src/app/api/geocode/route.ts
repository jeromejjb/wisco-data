import { NextRequest, NextResponse } from "next/server";
import { geocodeWisconsinAddress } from "@/lib/geocode-wisconsin";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < 4) {
    return NextResponse.json({ error: "Address is too short" }, { status: 400 });
  }

  try {
    const result = await geocodeWisconsinAddress(q);
    if (!result) {
      return NextResponse.json(
        { error: "Could not geocode that Wisconsin address" },
        { status: 404 }
      );
    }
    return NextResponse.json({ data: result });
  } catch (error) {
    console.error("Geocode error:", error);
    return NextResponse.json({ error: "Geocoder unavailable" }, { status: 502 });
  }
}
