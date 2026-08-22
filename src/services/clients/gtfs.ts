import AdmZip from "adm-zip";
import GtfsRealtimeBindings from "gtfs-realtime-bindings";
import { cached } from "@/lib/cache";

const GTFS_FEEDS = {
  mcts: {
    name: "Milwaukee County Transit System",
    url: "https://kamino.mcts.org/gtfs/google_transit.zip",
    center: { lat: 43.0389, lng: -87.9065 },
  },
  madison: {
    name: "Madison Metro Transit",
    url: "https://transitdata.cityofmadison.com/GTFS/mmt_gtfs.zip",
    center: { lat: 43.0731, lng: -89.4012 },
  },
} as const;

export type GtfsStop = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  agency: string;
};

export type GtfsRoute = {
  id: string;
  shortName: string;
  longName: string;
  color: string;
  agency: string;
};

export type GtfsAgencySummary = {
  id: string;
  name: string;
  url: string;
  stopCount: number;
  routeCount: number;
  center: { lat: number; lng: number };
};

function parseGtfsTxt(content: string): Record<string, string>[] {
  const lines = content.trim().split("\n");
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map((h) => h.trim().replace(/"/g, ""));
  return lines.slice(1).map((line) => {
    const values = line.split(",").map((v) => v.trim().replace(/"/g, ""));
    return Object.fromEntries(headers.map((h, i) => [h, values[i] ?? ""]));
  });
}

async function downloadGtfsFeed(feedKey: keyof typeof GTFS_FEEDS) {
  const feed = GTFS_FEEDS[feedKey];
  // GTFS zips exceed Next.js 2MB fetch cache — use our in-memory cache instead.
  const res = await fetch(feed.url, { cache: "no-store" });
  if (!res.ok) throw new Error(`GTFS download failed: ${feed.name}`);
  return Buffer.from(await res.arrayBuffer());
}

export async function fetchGtfsAgencySummaries() {
  return cached("gtfs:agencies", 24 * 60 * 60 * 1000, async () => {
    const summaries: GtfsAgencySummary[] = [];

    for (const key of Object.keys(GTFS_FEEDS) as (keyof typeof GTFS_FEEDS)[]) {
      const buffer = await downloadGtfsFeed(key);
      const zip = new AdmZip(buffer);
      const stopsEntry = zip.getEntry("stops.txt");
      const routesEntry = zip.getEntry("routes.txt");
      const agencyEntry = zip.getEntry("agency.txt");

      if (!stopsEntry || !routesEntry || !agencyEntry) continue;

      const stops = parseGtfsTxt(stopsEntry.getData().toString("utf8"));
      const routes = parseGtfsTxt(routesEntry.getData().toString("utf8"));
      const agencies = parseGtfsTxt(agencyEntry.getData().toString("utf8"));
      const agency = agencies[0];

      summaries.push({
        id: key,
        name: agency?.agency_name ?? GTFS_FEEDS[key].name,
        url: agency?.agency_url ?? "",
        stopCount: stops.length,
        routeCount: routes.length,
        center: GTFS_FEEDS[key].center,
      });
    }

    return summaries;
  });
}

export async function fetchGtfsStops(agencyId: keyof typeof GTFS_FEEDS, limit = 200) {
  return cached(`gtfs:stops:${agencyId}:${limit}`, 24 * 60 * 60 * 1000, async () => {
    const buffer = await downloadGtfsFeed(agencyId);
    const zip = new AdmZip(buffer);
    const stopsEntry = zip.getEntry("stops.txt");
    const routesEntry = zip.getEntry("routes.txt");
    if (!stopsEntry) return { stops: [] as GtfsStop[], routes: [] as GtfsRoute[] };

    const stopsRaw = parseGtfsTxt(stopsEntry.getData().toString("utf8"));
    const routesRaw = routesEntry
      ? parseGtfsTxt(routesEntry.getData().toString("utf8"))
      : [];

    const stops: GtfsStop[] = stopsRaw.slice(0, limit).map((s) => ({
      id: `${agencyId}-${s.stop_id}`,
      name: s.stop_name,
      lat: parseFloat(s.stop_lat),
      lng: parseFloat(s.stop_lon),
      agency: GTFS_FEEDS[agencyId].name,
    }));

    const routes: GtfsRoute[] = routesRaw.slice(0, 50).map((r) => ({
      id: `${agencyId}-${r.route_id}`,
      shortName: r.route_short_name,
      longName: r.route_long_name,
      color: r.route_color ? `#${r.route_color}` : "#2d6a9f",
      agency: GTFS_FEEDS[agencyId].name,
    }));

    return { stops, routes };
  });
}

export async function fetchMadisonServiceAlerts() {
  return cached("gtfs:madison-alerts", 60 * 1000, async () => {
    const url = "https://transitdata.cityofmadison.com/Alert/Alerts.pb";
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
          id: e.id ?? `alert-${Math.random()}`,
          agency: "Madison Metro",
          severity: "warning" as const,
          title: header,
          description,
          expiresAt: null,
        };
      });
  });
}

export { GTFS_FEEDS };
