import { adminUnauthorizedResponse, isAdminAuthorized } from "@/lib/admin-auth";
import { NextRequest, NextResponse } from "next/server";
import {
  getExperimentDashboardPayload,
  recordExperimentEvent,
  type PromptExperimentPayload,
} from "@/lib/agent/experiment-store";

export const dynamic = "force-dynamic";

function authorized(req: NextRequest): boolean {
  return isAdminAuthorized(req);
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as PromptExperimentPayload;
    if (!body.experimentId || !body.starterId || !body.action) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }
    recordExperimentEvent(body);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) {
    return adminUnauthorizedResponse();
  }

  return NextResponse.json({
    ...getExperimentDashboardPayload(),
  });
}
