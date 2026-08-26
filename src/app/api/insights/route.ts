import { NextResponse } from "next/server";
import { insightsAdapter } from "@/services/adapters";

export async function GET() {
    return NextResponse.json({
      data: insightsAdapter.getAll(),
      sample: true,
      note: "Insights are illustrative sample copy, not live-generated reports.",
    });
}
