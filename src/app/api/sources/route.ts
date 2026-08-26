import { NextRequest, NextResponse } from "next/server";
import {
  getDataSourceStatuses,
  refreshAllLiveSources,
  refreshLiveSources,
  refreshStaleSources,
} from "@/services/live/refresh";
import { resolveAgentModelFallback } from "@/lib/agent/model";
import { adminUnauthorizedResponse, isAdminAuthorized } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const { provider, modelId } = resolveAgentModelFallback();
  return NextResponse.json({
    sources: getDataSourceStatuses(),
    agent: { provider, modelId },
    refreshedAt: new Date().toISOString(),
  });
}

export async function POST(request: Request) {
  if (!isAdminAuthorized(request)) {
    return adminUnauthorizedResponse();
  }
  try {
    const body = await request.json().catch(() => ({}));
    const mode = body.mode as "all" | "stale" | "selected" | undefined;
    const sources = body.sources as string[] | undefined;

    let result;
    if (mode === "stale") {
      result = await refreshStaleSources();
      if (!result) {
        return NextResponse.json({
          message: "All sources are fresh",
          sources: getDataSourceStatuses(),
        });
      }
    } else if (mode === "selected" && sources?.length) {
      result = await refreshLiveSources(sources);
    } else {
      result = await refreshAllLiveSources();
    }

    return NextResponse.json({
      ...result,
      sources: getDataSourceStatuses(),
    });
  } catch (error) {
    console.error("Source refresh error:", error);
    return NextResponse.json(
      { error: "Refresh failed", detail: String(error) },
      { status: 502 }
    );
  }
}
