import { NextResponse } from "next/server";
import { getEconomyMapSeed } from "@/services/live/economy";

export const revalidate = 3600;

/** Minimal payload for home map choropleth — avoids full economy JSON. */
export async function GET() {
  try {
    const data = await getEconomyMapSeed();
    return NextResponse.json({ data });
  } catch (error) {
    console.error("Economy map seed error:", error);
    return NextResponse.json(
      { error: "Failed to fetch map layer data", detail: String(error) },
      { status: 502 }
    );
  }
}
