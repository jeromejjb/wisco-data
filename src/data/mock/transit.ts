import type { TransitRoute } from "@/lib/types";

export const defaultOrigin = {
  address: "2433 N Holton St, Milwaukee, WI",
  coordinates: { lat: 43.0634, lng: -87.9056 },
  label: "Home",
};

export const serviceAlerts = [
  {
    id: "alert-1",
    agency: "MCTS",
    severity: "warning" as const,
    title: "Route 30 detour on Wisconsin Ave",
    description: "Detour in effect until Aug 25 due to construction. Add ~5 min.",
    expiresAt: "2026-08-25T23:59:00Z",
  },
  {
    id: "alert-2",
    agency: "Madison Metro",
    severity: "info" as const,
    title: "Real-time data delayed",
    description: "Scheduled service information is available, but real-time arrival data is temporarily unavailable.",
    expiresAt: null,
  },
];

export function generateRoutes(
  originLabel: string,
  destLabel: string
): TransitRoute[] {
  return [
    {
      id: "route-fastest",
      label: "Fastest",
      durationMinutes: 42,
      walkMinutes: 6,
      transfers: 1,
      fare: 2.25,
      departureTime: "7:12 AM",
      arrivalTime: "7:54 AM",
      reliability: "high",
      frequency: "Every 12 min",
      legs: [
        { mode: "walk", from: originLabel, to: "Holton & Center", durationMinutes: 4 },
        { mode: "bus", from: "Holton & Center", to: "Wisconsin & 6th", durationMinutes: 18, line: "Route 30", color: "#2B6CB0" },
        { mode: "bus", from: "Wisconsin & 6th", to: "Workplace stop", durationMinutes: 14, line: "Route 57", color: "#276749" },
        { mode: "walk", from: "Workplace stop", to: destLabel, durationMinutes: 6 },
      ],
    },
    {
      id: "route-fewest",
      label: "Fewest Transfers",
      durationMinutes: 48,
      walkMinutes: 10,
      transfers: 0,
      fare: 2.25,
      departureTime: "7:05 AM",
      arrivalTime: "7:53 AM",
      reliability: "medium",
      frequency: "Every 20 min",
      legs: [
        { mode: "walk", from: originLabel, to: "Farwell & North", durationMinutes: 8 },
        { mode: "bus", from: "Farwell & North", to: "Workplace stop", durationMinutes: 30, line: "Route 30X", color: "#2B6CB0" },
        { mode: "walk", from: "Workplace stop", to: destLabel, durationMinutes: 10 },
      ],
    },
    {
      id: "route-walking",
      label: "Lowest Walking",
      durationMinutes: 52,
      walkMinutes: 3,
      transfers: 2,
      fare: 2.25,
      departureTime: "7:00 AM",
      arrivalTime: "7:52 AM",
      reliability: "high",
      frequency: "Every 15 min",
      legs: [
        { mode: "walk", from: originLabel, to: "Holton & Locust", durationMinutes: 3 },
        { mode: "bus", from: "Holton & Locust", to: "Transfer Point", durationMinutes: 12, line: "Route 14", color: "#C05621" },
        { mode: "bus", from: "Transfer Point", to: "Workplace stop", durationMinutes: 22, line: "Route 57", color: "#276749" },
        { mode: "walk", from: "Workplace stop", to: destLabel, durationMinutes: 3 },
      ],
      scheduleWarnings: ["Requires tight transfer at Transfer Point"],
    },
    {
      id: "route-reliable",
      label: "Most Reliable",
      durationMinutes: 55,
      walkMinutes: 8,
      transfers: 1,
      fare: 2.25,
      departureTime: "6:50 AM",
      arrivalTime: "7:45 AM",
      reliability: "high",
      frequency: "Every 10 min",
      legs: [
        { mode: "walk", from: originLabel, to: "Holton & Center", durationMinutes: 4 },
        { mode: "rail", from: "Holton & Center", to: "Downtown", durationMinutes: 15, line: "Streetcar", color: "#1A365D" },
        { mode: "bus", from: "Downtown", to: "Workplace stop", durationMinutes: 28, line: "Route 57", color: "#276749" },
        { mode: "walk", from: "Workplace stop", to: destLabel, durationMinutes: 8 },
      ],
    },
  ];
}

export const isochroneLayers = [
  { minutes: 15, color: "#63B3ED", label: "15 min" },
  { minutes: 30, color: "#4299E1", label: "30 min" },
  { minutes: 45, color: "#3182CE", label: "45 min" },
  { minutes: 60, color: "#2B6CB0", label: "60 min" },
  { minutes: 90, color: "#1A365D", label: "90 min" },
];

export const transitStops = [
  { id: "stop-1", name: "Holton & Center", coordinates: { lat: 43.0612, lng: -87.9051 }, routes: ["14", "30"] },
  { id: "stop-2", name: "Wisconsin & 6th", coordinates: { lat: 43.0389, lng: -87.9189 }, routes: ["30", "57"] },
  { id: "stop-3", name: "Farwell & North", coordinates: { lat: 43.0598, lng: -87.8876 }, routes: ["30X"] },
];
