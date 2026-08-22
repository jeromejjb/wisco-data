import { NextResponse } from "next/server";
import { insightsAdapter } from "@/services/adapters";

export async function GET() {
  return NextResponse.json({ data: insightsAdapter.getAll() });
}
