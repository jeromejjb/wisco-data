/** Wisconsin fixed-route transit agencies with official GTFS feeds. */

export type TransitAgencyId =
  | "mcts"
  | "madison"
  | "greenbay"
  | "lacrosse"
  | "kenosha"
  | "valley"
  | "eauclaire";

export type TransitAgencyConfig = {
  id: TransitAgencyId;
  name: string;
  shortName: string;
  gtfsUrl: string;
  center: { lat: number; lng: number };
  defaultZoom: number;
  countyId: string;
  /** GTFS-RT protobuf URLs when publicly available */
  realtime?: {
    alerts?: string;
    vehicles?: string;
  };
};

export const TRANSIT_AGENCIES: Record<TransitAgencyId, TransitAgencyConfig> = {
  mcts: {
    id: "mcts",
    name: "Milwaukee County Transit System",
    shortName: "MCTS",
    gtfsUrl: "https://kamino.mcts.org/gtfs/google_transit.zip",
    center: { lat: 43.0389, lng: -87.9065 },
    defaultZoom: 11.5,
    countyId: "milwaukee",
    realtime: {
      vehicles: "https://kamino.mcts.org/gtfsrealtime/vehiclepositions",
    },
  },
  madison: {
    id: "madison",
    name: "Madison Metro Transit",
    shortName: "Madison Metro",
    gtfsUrl: "https://transitdata.cityofmadison.com/GTFS/mmt_gtfs.zip",
    center: { lat: 43.0731, lng: -89.4012 },
    defaultZoom: 11.5,
    countyId: "dane",
    realtime: {
      alerts: "https://transitdata.cityofmadison.com/Alert/Alerts.pb",
      vehicles:
        "https://transitdata.cityofmadison.com/gtfrealtime/VehiclePositions/VehiclePositions.pb",
    },
  },
  greenbay: {
    id: "greenbay",
    name: "Green Bay Metro",
    shortName: "Green Bay Metro",
    gtfsUrl: "https://greenbaywi.gov/DocumentCenter/View/12124/Transit-Data-August-2024",
    center: { lat: 44.5133, lng: -88.0133 },
    defaultZoom: 12,
    countyId: "brown",
  },
  lacrosse: {
    id: "lacrosse",
    name: "Municipal Transit Utility",
    shortName: "La Crosse MTU",
    gtfsUrl: "https://ridemtu.com/gtfs",
    center: { lat: 43.8014, lng: -91.2396 },
    defaultZoom: 12.5,
    countyId: "la-crosse",
  },
  kenosha: {
    id: "kenosha",
    name: "Kenosha Area Transit",
    shortName: "KAT",
    gtfsUrl: "https://www.kenosha.org/gtfs/google_transit.zip",
    center: { lat: 42.5847, lng: -87.8212 },
    defaultZoom: 12,
    countyId: "kenosha",
  },
  valley: {
    id: "valley",
    name: "Valley Transit",
    shortName: "Valley Transit",
    gtfsUrl: "https://www.valleytransit.org/gtfs/google_transit.zip",
    center: { lat: 44.2619, lng: -88.4154 },
    defaultZoom: 12,
    countyId: "outagamie",
  },
  eauclaire: {
    id: "eauclaire",
    name: "Eau Claire Transit",
    shortName: "Eau Claire Transit",
    gtfsUrl: "https://www.eauclairewi.gov/government/departments/transit/gtfs/google_transit.zip",
    center: { lat: 44.8113, lng: -91.4985 },
    defaultZoom: 12,
    countyId: "eau-claire",
  },
};

export const TRANSIT_AGENCY_LIST = Object.values(TRANSIT_AGENCIES);

export function isTransitAgencyId(id: string): id is TransitAgencyId {
  return id in TRANSIT_AGENCIES;
}

export function agencyByCounty(countyId: string): TransitAgencyConfig | undefined {
  return TRANSIT_AGENCY_LIST.find((a) => a.countyId === countyId);
}

/** Map query intent metro slug → agency id */
export function agencyIdFromMetro(
  metro: "milwaukee" | "madison" | "green-bay" | "la-crosse" | "kenosha" | "appleton" | "eau-claire" | "both" | "all" | string | undefined
): TransitAgencyId | "all" {
  if (metro === "milwaukee") return "mcts";
  if (metro === "madison") return "madison";
  if (metro === "green-bay") return "greenbay";
  if (metro === "la-crosse") return "lacrosse";
  if (metro === "kenosha") return "kenosha";
  if (metro === "appleton") return "valley";
  if (metro === "eau-claire") return "eauclaire";
  return "all";
}
