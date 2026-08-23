import { NextResponse } from "next/server";
import { getLiveJobs } from "@/services/live/jobs";

export const revalidate = 900;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  try {
    const result = await getLiveJobs({
      keyword: searchParams.get("q") ?? undefined,
      location: searchParams.get("location") ?? undefined,
      industry: searchParams.get("industry") ?? undefined,
      transitOnly: searchParams.get("transit") === "true",
      maxCommute: searchParams.get("maxCommute")
        ? Number(searchParams.get("maxCommute"))
        : undefined,
      maxTransfers: searchParams.get("maxTransfers")
        ? Number(searchParams.get("maxTransfers"))
        : undefined,
      minSalary: searchParams.get("minSalary")
        ? Number(searchParams.get("minSalary"))
        : undefined,
      rankByReach: searchParams.get("rank") === "true",
    });

    return NextResponse.json({
      data: result.jobs,
      provenance: result.provenance,
      count: result.count,
      meta: result.meta,
    });
  } catch (error) {
    console.error("Jobs API error:", error);
    return NextResponse.json(
      {
        data: [],
        count: 0,
        error: "Failed to fetch live job data",
        detail: String(error),
        meta: {
          liveCount: 0,
          keysRequired: false,
          status: "failed",
          userMessage: "Something went wrong loading jobs. Please try again in a moment.",
          errors: [],
        },
      },
      { status: 503 }
    );
  }
}
