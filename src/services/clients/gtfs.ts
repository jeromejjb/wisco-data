import AdmZip from "adm-zip";
import GtfsRealtimeBindings from "gtfs-realtime-bindings";
import { cached } from "@/lib/cache";
import {
  TRANSIT_AGENCIES,
  type TransitAgencyId,
  isTransitAgencyId,
} from "@/lib/transit-agencies";
import type {
  TransitBbox,
  TransitMapRoute,
  TransitMapStop,
  TransitRouteShape,
  TransitServiceAlert,
  TransitVehicle,
} from "@/lib/transit-types";
import { inBbox } from "@/lib/transit-types";

export type GtfsStop = TransitMapStop;
export type GtfsRoute = TransitMapRoute;

export type GtfsAgencySummary = {
  id: TransitAgencyId;
  name: string;
  url: string;
  stopCount: number;
  routeCount: number;
  center: { lat: number; lng: number };
  hasRealtime: boolean;
};

/** @deprecated use TRANSIT_AGENCIES */
export const GTFS_FEEDS = Object.fromEntries(
  Object.entries(TRANSIT_AGENCIES).map(([id, a]) => [
    id,
    { name: a.name, url: a.gtfsUrl, center: a.center },
  ])
) as Record<
  TransitAgencyId,
  { name: string; url: string; center: { lat: number; lng: number } }
>;

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i]!;
    if (c === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (c === "," && !inQuotes) {
      result.push(cur.trim());
      cur = "";
    } else {
      cur += c;
    }
  }
  result.push(cur.trim());
  return result;
}

function parseGtfsTxt(content: string): Record<string, string>[] {
  const lines = content.trim().split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return [];
  const headers = parseCsvLine(lines[0]!).map((h) => h.replace(/^"|"$/g, ""));
  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line).map((v) => v.replace(/^"|"$/g, ""));
    return Object.fromEntries(headers.map((h, i) => [h, values[i] ?? ""]));
  });
}

async function downloadGtfsZip(agencyId: TransitAgencyId): Promise<Buffer | null> {
  const agency = TRANSIT_AGENCIES[agencyId];
  try {
    const res = await fetch(agency.gtfsUrl, { cache: "no-store" });
    if (!res.ok) return null;
    return Buffer.from(await res.arrayBuffer());
  } catch (e) {
    console.warn(`GTFS download failed: ${agency.name}`, e);
    return null;
  }
}

async function loadGtfsZip(agencyId: TransitAgencyId): Promise<AdmZip | null> {
  const buffer = await downloadGtfsZip(agencyId);
  if (!buffer) return null;
  try {
    return new AdmZip(buffer);
  } catch {
    return null;
  }
}

function readGtfsFile(zip: AdmZip, name: string): Record<string, string>[] {
  const entry = zip.getEntry(name);
  if (!entry) return [];
  return parseGtfsTxt(entry.getData().toString("utf8"));
}

export async function fetchGtfsAgencySummaries(): Promise<GtfsAgencySummary[]> {
  return cached("gtfs:agencies:v2", 24 * 60 * 60 * 1000, async () => {
    const summaries: GtfsAgencySummary[] = [];

    await Promise.all(
      (Object.keys(TRANSIT_AGENCIES) as TransitAgencyId[]).map(async (agencyId) => {
        const zip = await loadGtfsZip(agencyId);
        const agency = TRANSIT_AGENCIES[agencyId];
        if (!zip) return;

        const stops = readGtfsFile(zip, "stops.txt");
        const routes = readGtfsFile(zip, "routes.txt");
        const agencies = readGtfsFile(zip, "agency.txt");
        const meta = agencies[0];

        summaries.push({
          id: agencyId,
          name: meta?.agency_name ?? agency.name,
          url: meta?.agency_url ?? "",
          stopCount: stops.length,
          routeCount: routes.length,
          center: agency.center,
          hasRealtime: Boolean(agency.realtime?.vehicles || agency.realtime?.alerts),
        });
      })
    );

    return summaries.sort((a, b) => a.name.localeCompare(b.name));
  });
}

export async function fetchGtfsStops(
  agencyId: TransitAgencyId,
  opts?: { limit?: number; bbox?: TransitBbox }
): Promise<{ stops: GtfsStop[]; routes: GtfsRoute[] }> {
  const limit = opts?.limit ?? 400;
  const bboxKey = opts?.bbox
    ? [
        opts.bbox.minLat.toFixed(2),
        opts.bbox.maxLat.toFixed(2),
        opts.bbox.minLng.toFixed(2),
        opts.bbox.maxLng.toFixed(2),
      ].join(",")
    : "all";
  const cacheKey = `gtfs:stops:v2:${agencyId}:${limit}:${bboxKey}`;

  return cached(cacheKey, 24 * 60 * 60 * 1000, async () => {
    const zip = await loadGtfsZip(agencyId);
    const agency = TRANSIT_AGENCIES[agencyId];
    if (!zip) return { stops: [], routes: [] };

    const stopsRaw = readGtfsFile(zip, "stops.txt");
    const routesRaw = readGtfsFile(zip, "routes.txt");

    const stopsFiltered = stopsRaw
      .map((s) => ({
        lat: parseFloat(s.stop_lat),
        lng: parseFloat(s.stop_lon),
        raw: s,
      }))
      .filter((s) => Number.isFinite(s.lat) && Number.isFinite(s.lng))
      .filter((s) => (opts?.bbox ? inBbox(s.lat, s.lng, opts.bbox) : true));

    if (opts?.bbox) {
      stopsFiltered.sort((a, b) => {
        const da =
          (a.lat - agency.center.lat) ** 2 + (a.lng - agency.center.lng) ** 2;
        const db =
          (b.lat - agency.center.lat) ** 2 + (b.lng - agency.center.lng) ** 2;
        return da - db;
      });
    }

    const stops: GtfsStop[] = stopsFiltered.slice(0, limit).map(({ raw: s }) => ({
      id: `${agencyId}-${s.stop_id}`,
      stopId: s.stop_id,
      name: s.stop_name,
      lat: parseFloat(s.stop_lat),
      lng: parseFloat(s.stop_lon),
      agencyId,
      agency: agency.name,
    }));

    const routes: GtfsRoute[] = routesRaw.slice(0, 80).map((r) => ({
      id: `${agencyId}-${r.route_id}`,
      routeId: r.route_id,
      shortName: r.route_short_name,
      longName: r.route_long_name,
      color: r.route_color ? `#${r.route_color}` : "#2d6a9f",
      textColor: r.route_text_color ? `#${r.route_text_color}` : "#ffffff",
      agencyId,
      agency: agency.name,
    }));

    return { stops, routes };
  });
}

export async function fetchGtfsRouteShapes(
  agencyId: TransitAgencyId,
  opts?: { bbox?: TransitBbox; maxRoutes?: number }
): Promise<TransitRouteShape[]> {
  const maxRoutes = opts?.maxRoutes ?? 40;
  const bboxKey = opts?.bbox
    ? [
        opts.bbox.minLat.toFixed(2),
        opts.bbox.maxLat.toFixed(2),
        opts.bbox.minLng.toFixed(2),
        opts.bbox.maxLng.toFixed(2),
      ].join(",")
    : "all";
  const cacheKey = `gtfs:shapes:v2:${agencyId}:${maxRoutes}:${bboxKey}`;

  return cached(cacheKey, 24 * 60 * 60 * 1000, async () => {
    const zip = await loadGtfsZip(agencyId);
    if (!zip) return [];

    const shapesRaw = readGtfsFile(zip, "shapes.txt");
    const tripsRaw = readGtfsFile(zip, "trips.txt");
    const routesRaw = readGtfsFile(zip, "routes.txt");

    if (!shapesRaw.length || !tripsRaw.length) return [];

    const shapePoints = new Map<string, { lat: number; lng: number; seq: number }[]>();
    for (const row of shapesRaw) {
      const shapeId = row.shape_id;
      if (!shapeId) continue;
      const seq = parseInt(row.shape_pt_sequence ?? "0", 10);
      const lat = parseFloat(row.shape_pt_lat);
      const lng = parseFloat(row.shape_pt_lon);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
      const list = shapePoints.get(shapeId) ?? [];
      list.push({ lat, lng, seq });
      shapePoints.set(shapeId, list);
    }

    const routeToShape = new Map<string, string>();
    for (const trip of tripsRaw) {
      if (!trip.route_id || !trip.shape_id) continue;
      if (!routeToShape.has(trip.route_id)) routeToShape.set(trip.route_id, trip.shape_id);
    }

    const routeMeta = new Map(
      routesRaw.map((r) => [
        r.route_id,
        {
          shortName: r.route_short_name,
          color: r.route_color ? `#${r.route_color}` : "#2d6a9f",
        },
      ])
    );

    const shapes: TransitRouteShape[] = [];
    for (const [routeId, shapeId] of routeToShape) {
      const pts = shapePoints.get(shapeId);
      if (!pts?.length) continue;

      const sorted = [...pts].sort((a, b) => a.seq - b.seq);
      const coordinates = sorted.map((p) => [p.lng, p.lat] as [number, number]);

      if (opts?.bbox) {
        const intersects = sorted.some((p) => inBbox(p.lat, p.lng, opts.bbox!));
        if (!intersects) continue;
      }

      const meta = routeMeta.get(routeId);
      shapes.push({
        id: `${agencyId}-${routeId}`,
        routeId,
        agencyId,
        shortName: meta?.shortName ?? routeId,
        color: meta?.color ?? "#2d6a9f",
        coordinates,
      });
      if (shapes.length >= maxRoutes) break;
    }

    return shapes;
  });
}

async function decodeGtfsRealtimeVehicles(
  agencyId: TransitAgencyId,
  url: string
): Promise<TransitVehicle[]> {
  const agency = TRANSIT_AGENCIES[agencyId];
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return [];
    const buffer = Buffer.from(await res.arrayBuffer());
    const feed = GtfsRealtimeBindings.transit_realtime.FeedMessage.decode(buffer);
    const now = new Date().toISOString();

    return feed.entity
      .filter((e) => e.vehicle?.position)
      .map((e) => {
        const v = e.vehicle!;
        const pos = v.position!;
        return {
          id: `${agencyId}-${e.id ?? v.vehicle?.id ?? Math.random()}`,
          agencyId,
          agency: agency.name,
          routeId: v.trip?.routeId ?? undefined,
          routeLabel: v.trip?.routeId ?? v.vehicle?.label ?? undefined,
          lat: pos.latitude ?? 0,
          lng: pos.longitude ?? 0,
          bearing: pos.bearing ?? undefined,
          label: v.vehicle?.label ?? undefined,
          updatedAt: now,
        };
      })
      .filter((v) => Number.isFinite(v.lat) && Number.isFinite(v.lng) && v.lat !== 0);
  } catch (e) {
    console.warn(`GTFS-RT vehicles failed: ${agency.name}`, e);
    return [];
  }
}

async function decodeGtfsRealtimeAlerts(
  agencyId: TransitAgencyId,
  url: string
): Promise<TransitServiceAlert[]> {
  const agency = TRANSIT_AGENCIES[agencyId];
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return [];
    const buffer = Buffer.from(await res.arrayBuffer());
    const feed = GtfsRealtimeBindings.transit_realtime.FeedMessage.decode(buffer);

    return feed.entity
      .filter((e) => e.alert)
      .map((e) => {
        const alert = e.alert!;
        const header = alert.headerText?.translation?.[0]?.text ?? "Service alert";
        const description = alert.descriptionText?.translation?.[0]?.text ?? "";
        return {
          id: `${agencyId}-${e.id ?? header.slice(0, 24)}`,
          agencyId,
          agency: agency.shortName,
          severity: "warning" as const,
          title: header,
          description,
          expiresAt: null,
        };
      });
  } catch (e) {
    console.warn(`GTFS-RT alerts failed: ${agency.name}`, e);
    return [];
  }
}

export async function fetchAgencyRealtime(
  agencyId: TransitAgencyId
): Promise<{ vehicles: TransitVehicle[]; alerts: TransitServiceAlert[] }> {
  const cacheKey = `gtfs:rt:v2:${agencyId}`;
  return cached(cacheKey, 20 * 1000, async () => {
    const agency = TRANSIT_AGENCIES[agencyId];
    const [vehicles, alerts] = await Promise.all([
      agency.realtime?.vehicles
        ? decodeGtfsRealtimeVehicles(agencyId, agency.realtime.vehicles)
        : Promise.resolve([]),
      agency.realtime?.alerts
        ? decodeGtfsRealtimeAlerts(agencyId, agency.realtime.alerts)
        : Promise.resolve([]),
    ]);
    return { vehicles, alerts };
  });
}

/** Backward-compatible Madison alerts helper */
export async function fetchMadisonServiceAlerts(): Promise<
  { id: string; agency: string; severity: "warning"; title: string; description: string; expiresAt: null }[]
> {
  const alerts = await fetchAgencyRealtime("madison");
  return alerts.alerts.map((a) => ({
    id: a.id,
    agency: a.agency,
    severity: "warning" as const,
    title: a.title,
    description: a.description,
    expiresAt: null,
  }));
}

export async function fetchTransitMapLayers(input: {
  agencyIds: TransitAgencyId[];
  bbox?: TransitBbox;
  includeShapes?: boolean;
  includeRealtime?: boolean;
}): Promise<{
  stops: TransitMapStop[];
  routes: TransitMapRoute[];
  shapes: TransitRouteShape[];
  vehicles: TransitVehicle[];
  alerts: TransitServiceAlert[];
}> {
  const agencyIds = input.agencyIds.filter(isTransitAgencyId);
  const stops: TransitMapStop[] = [];
  const routes: TransitMapRoute[] = [];
  const shapes: TransitRouteShape[] = [];
  const vehicles: TransitVehicle[] = [];
  const alerts: TransitServiceAlert[] = [];

  await Promise.all(
    agencyIds.map(async (agencyId) => {
      const [stopData, shapeData, rt] = await Promise.allSettled([
        fetchGtfsStops(agencyId, { limit: 500, bbox: input.bbox }),
        input.includeShapes !== false
          ? fetchGtfsRouteShapes(agencyId, { bbox: input.bbox, maxRoutes: 35 })
          : Promise.resolve([]),
        input.includeRealtime !== false
          ? fetchAgencyRealtime(agencyId)
          : Promise.resolve({ vehicles: [], alerts: [] }),
      ]);

      if (stopData.status === "fulfilled") {
        stops.push(...stopData.value.stops);
        routes.push(...stopData.value.routes);
      }
      if (shapeData.status === "fulfilled") shapes.push(...shapeData.value);
      if (rt.status === "fulfilled") {
        vehicles.push(...rt.value.vehicles);
        alerts.push(...rt.value.alerts);
      }
    })
  );

  return { stops, routes, shapes, vehicles, alerts };
}

export { TRANSIT_AGENCIES, isTransitAgencyId };
