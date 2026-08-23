import type { TransitAgencyId } from "@/lib/transit-agencies";

export type TransitMapStop = {
  id: string;
  stopId: string;
  name: string;
  lat: number;
  lng: number;
  agencyId: TransitAgencyId;
  agency: string;
  routeIds?: string[];
};

export type TransitMapRoute = {
  id: string;
  routeId: string;
  shortName: string;
  longName: string;
  color: string;
  textColor?: string;
  agencyId: TransitAgencyId;
  agency: string;
};

export type TransitRouteShape = {
  id: string;
  routeId: string;
  agencyId: TransitAgencyId;
  shortName: string;
  color: string;
  /** GeoJSON coordinates [lng, lat][] */
  coordinates: [number, number][];
};

export type TransitVehicle = {
  id: string;
  agencyId: TransitAgencyId;
  agency: string;
  routeId?: string;
  routeLabel?: string;
  lat: number;
  lng: number;
  bearing?: number;
  label?: string;
  updatedAt: string;
};

export type TransitServiceAlert = {
  id: string;
  agencyId: TransitAgencyId;
  agency: string;
  severity: "info" | "warning" | "critical";
  title: string;
  description: string;
  expiresAt: string | null;
};

export type TransitMapLayers = {
  stops: TransitMapStop[];
  routes: TransitMapRoute[];
  shapes: TransitRouteShape[];
  vehicles: TransitVehicle[];
  alerts: TransitServiceAlert[];
};

export type TransitBbox = {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
};

export function bboxFromCenter(
  center: { lat: number; lng: number },
  delta = 0.12
): TransitBbox {
  return {
    minLat: center.lat - delta,
    maxLat: center.lat + delta,
    minLng: center.lng - delta * 1.4,
    maxLng: center.lng + delta * 1.4,
  };
}

export function inBbox(lat: number, lng: number, bbox: TransitBbox): boolean {
  return lat >= bbox.minLat && lat <= bbox.maxLat && lng >= bbox.minLng && lng <= bbox.maxLng;
}
