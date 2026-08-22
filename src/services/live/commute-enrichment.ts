import type { Job, CommuteSummary } from "@/lib/types";
import { fetchGtfsStops } from "@/services/clients/gtfs";

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function nearestStopDistanceKm(
  jobLat: number,
  jobLng: number,
  stops: { lat: number; lng: number }[]
) {
  if (!stops.length) return Infinity;
  let best = Infinity;
  for (const s of stops) {
    const d = haversineKm(jobLat, jobLng, s.lat, s.lng);
    if (d < best) best = d;
    if (best < 0.15) break;
  }
  return best;
}

function estimateCommute(
  job: Job,
  mctsStops: { lat: number; lng: number }[],
  madisonStops: { lat: number; lng: number }[]
): CommuteSummary {
  const city = job.location.city.toLowerCase();
  const stops =
    city.includes("madison") || city.includes("verona")
      ? madisonStops
      : mctsStops;

  const distKm = nearestStopDistanceKm(
    job.location.coordinates.lat,
    job.location.coordinates.lng,
    stops
  );

  if (distKm === Infinity || distKm > 3) {
    return {
      durationMinutes: 55 + Math.round(distKm * 8),
      walkMinutes: Math.min(25, Math.round(distKm * 12)),
      transfers: distKm > 1.5 ? 2 : 1,
      fareEstimate: 2.25,
      scheduleCompatible: false,
      scheduleNotes: distKm > 2 ? "Limited transit access to this location" : undefined,
      reliability: "low",
    };
  }

  const walkMinutes = Math.max(3, Math.round(distKm * 12));
  const durationMinutes = 22 + walkMinutes + Math.round(distKm * 6);
  const transfers = distKm > 0.8 ? 1 : 0;

  return {
    durationMinutes,
    walkMinutes,
    transfers,
    fareEstimate: city.includes("madison") ? 2.0 : 2.25,
    scheduleCompatible: durationMinutes < 50,
    reliability: transfers === 0 ? "high" : "medium",
  };
}

function commuteFitScore(commute: CommuteSummary, payMin?: number, payType?: string): number {
  const pay = payType === "hourly" ? (payMin ?? 0) * 2080 : payMin ?? 50000;
  const payScore = Math.min(40, pay / 2500);
  const timeScore = Math.max(0, 40 - commute.durationMinutes * 0.6);
  const transferScore = Math.max(0, 15 - commute.transfers * 6);
  const scheduleScore = commute.scheduleCompatible ? 10 : -5;
  return Math.round(Math.min(100, Math.max(20, payScore + timeScore + transferScore + scheduleScore)));
}

export async function enrichJobsWithCommuteEstimates(jobs: Job[]): Promise<Job[]> {
  if (jobs.length === 0) return jobs;

  const [{ stops: mctsStops }, { stops: madisonStops }] = await Promise.all([
    fetchGtfsStops("mcts", 350),
    fetchGtfsStops("madison", 250),
  ]);

  return jobs.map((job) => {
    const commute = estimateCommute(job, mctsStops, madisonStops);
    const transitAccessible = commute.walkMinutes <= 12 && commute.reliability !== "low";
    return {
      ...job,
      commute,
      transitAccessible,
      commuteFitScore: commuteFitScore(commute, job.payMin, job.payType),
    };
  });
}
