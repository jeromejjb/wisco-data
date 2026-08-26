import { NextResponse } from "next/server";
import { budgetsAdapter } from "@/services/adapters";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (id) {
    const entity = budgetsAdapter.getEntity(id);
    if (!entity) {
      return NextResponse.json({ error: "Entity not found" }, { status: 404 });
    }
    return NextResponse.json({ data: entity });
  }

  return NextResponse.json({
    data: {
      entities: budgetsAdapter.getEntities(),
      trend: budgetsAdapter.getTrend(),
    },
    sample: true,
    note: "Budget figures are illustrative sample data, not live municipal extracts.",
  });
}
