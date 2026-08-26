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
import { WISCONSIN_CENTER } from "@/lib/map-styles";
import { bboxFromCenter } from "@/lib/transit-types";
import type { TransitRoute } from "@/lib/types";

export async function getLiveTransitData(input?: {
  originLabel?: string;
  destLabel?: string;
  agencyId?: TransitAgencyId | "all";
  bbox?: { minLat: number; maxLat: number; minLng: number; maxLng: number };
  includeShapes?: boolean;
  includeRealtime?: boolean;
}) {
  const originLabel = input?.originLabel ?? "Origin";
  const allAgencies = input?.agencyId === "all" || input?.agencyId == null;

  const agencyIds: TransitAgencyId[] =
    input?.agencyId && input.agencyId !== "all" && isTransitAgencyId(input.agencyId)
      ? [input.agencyId]
      : TRANSIT_AGENCY_LIST.map((a) => a.id);

  const primaryAgency = TRANSIT_AGENCIES[agencyIds[0]!]!;
  const statewide = allAgencies || agencyIds.length > 1;
  const bbox =
    input?.bbox ?? (statewide ? undefined : bboxFromCenter(primaryAgency.center, 0.18));

  const [agencies, layers] = await Promise.all([
    fetchGtfsAgencySummaries(),
    fetchTransitMapLayers({
      agencyIds,
      bbox,
      includeShapes: input?.includeShapes !== false,
      includeRealtime: input?.includeRealtime !== false,
    }),
  ]);

  const activeAgencies = agencies.filter((a) => agencyIds.includes(a.id));
  const coverageNames = statewide
    ? `${agencyIds.length} Wisconsin agencies`
    : agencyIds.map((id) => TRANSIT_AGENCIES[id].shortName).join(", ");

  const mapCenter = statewide ? WISCONSIN_CENTER : primaryAgency.center;
  const mapZoom = statewide ? 7 : primaryAgency.defaultZoom;

  return {
    origin: {
      address: originLabel,
      coordinates: mapCenter,
      label: originLabel,
    },
    routes: [] as TransitRoute[],
    alerts: layers.alerts,
    agencies: activeAgencies.length ? activeAgencies : agencies.filter((a) => agencyIds.includes(a.id)),
    allAgencies: agencies,
    stops: layers.stops,
    routeInventory: layers.routes,
    shapes: layers.shapes,
    vehicles: layers.vehicles,
    mapCenter,
    mapZoom,
    activeAgencyId: statewide ? ("all" as const) : agencyIds[0]!,
    provenance: {
      source: [
        ...agencyIds.map((id) => `GTFS: ${TRANSIT_AGENCIES[id].name}`),
        layers.vehicles.length ? "GTFS-Realtime vehicle positions" : null,
        layers.alerts.length ? "GTFS-Realtime service alerts" : null,
      ]
        .filter(Boolean)
        .join(" · "),
      lastUpdated: new Date().toISOString(),
      coverage: `${coverageNames} · live stops/shapes/vehicles — trip plans require a router`,
      confidence: "medium" as const,
      methodology:
        "Stop inventory, route shapes, and vehicle positions from official GTFS static and GTFS-Realtime feeds. Point-to-point trip cards are hidden until a router (OTP/OSRM transit) is integrated — we do not invent itineraries.",
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
