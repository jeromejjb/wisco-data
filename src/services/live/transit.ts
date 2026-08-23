import { generateRoutes, defaultOrigin } from "@/data/mock/transit";
import {
  fetchGtfsAgencySummaries,
  fetchTransitMapLayers,
} from "@/services/clients/gtfs";
import {
  TRANSIT_AGENCY_LIST,
  TRANSIT_AGENCIES,
  isTransitAgencyId,
  type TransitAgencyId,
} from "@/lib/transit-agencies";
import { bboxFromCenter } from "@/lib/transit-types";

export async function getLiveTransitData(input?: {
  originLabel?: string;
  destLabel?: string;
  agencyId?: TransitAgencyId | "all";
  bbox?: { minLat: number; maxLat: number; minLng: number; maxLng: number };
  includeShapes?: boolean;
  includeRealtime?: boolean;
}) {
  const originLabel = input?.originLabel ?? "Home";
  const destLabel = input?.destLabel ?? "Workplace";

  const agencyIds: TransitAgencyId[] =
    input?.agencyId && input.agencyId !== "all" && isTransitAgencyId(input.agencyId)
      ? [input.agencyId]
      : (["mcts", "madison"] as TransitAgencyId[]);

  const primaryAgency = TRANSIT_AGENCIES[agencyIds[0]!]!;
  const bbox = input?.bbox ?? bboxFromCenter(primaryAgency.center, 0.14);

  const [agencies, layers] = await Promise.all([
    fetchGtfsAgencySummaries(),
    fetchTransitMapLayers({
      agencyIds,
      bbox,
      includeShapes: input?.includeShapes !== false,
      includeRealtime: input?.includeRealtime !== false,
    }),
  ]);

  const routes = generateRoutes(originLabel, destLabel);
  const activeAgencies = agencies.filter((a) => agencyIds.includes(a.id));

  const coverageNames =
    agencyIds.length === 2
      ? "Milwaukee & Madison"
      : agencyIds.map((id) => TRANSIT_AGENCIES[id].shortName).join(", ");

  return {
    origin: defaultOrigin,
    routes,
    alerts: layers.alerts,
    agencies: activeAgencies.length ? activeAgencies : agencies.slice(0, agencyIds.length),
    allAgencies: agencies,
    stops: layers.stops,
    routeInventory: layers.routes,
    shapes: layers.shapes,
    vehicles: layers.vehicles,
    mapCenter: primaryAgency.center,
    mapZoom: primaryAgency.defaultZoom,
    activeAgencyId: agencyIds[0],
    provenance: {
      source: [
        ...agencyIds.map((id) => `GTFS: ${TRANSIT_AGENCIES[id].name}`),
        layers.vehicles.length ? "GTFS-Realtime vehicle positions" : null,
        layers.alerts.length ? "GTFS-Realtime service alerts" : null,
      ]
        .filter(Boolean)
        .join(" · "),
      lastUpdated: new Date().toISOString(),
      coverage: `${coverageNames} transit networks · ${TRANSIT_AGENCY_LIST.length} WI agencies in registry`,
      confidence: "high" as const,
      methodology:
        "Stop inventory, route shapes, and vehicle positions from official GTFS static and GTFS-Realtime feeds. Trip plans use scheduled estimates until a router (OTP/Mapbox) is integrated.",
    },
    stats: {
      totalStops: agencies.reduce((s, a) => s + a.stopCount, 0),
      totalRoutes: agencies.reduce((s, a) => s + a.routeCount, 0),
      agencies: agencies.length,
      liveVehicles: layers.vehicles.length,
      routeShapes: layers.shapes.length,
    },
  };
}

export type LiveTransitData = Awaited<ReturnType<typeof getLiveTransitData>>;
