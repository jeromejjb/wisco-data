import { NextRequest, NextResponse } from "next/server";
import {
  getExperimentDashboardPayload,
  recordExperimentEvent,
  type PromptExperimentPayload,
} from "@/lib/agent/experiment-store";

export const dynamic = "force-dynamic";

function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.ADMIN_SECRET;
  if (!secret) return true;
  const header = req.headers.get("authorization");
  const query = req.nextUrl.searchParams.get("key");
  return header === `Bearer ${secret}` || query === secret;
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
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({
    ...getExperimentDashboardPayload(),
  });
}
