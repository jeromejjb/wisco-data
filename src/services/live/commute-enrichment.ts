import type { Job, CommuteSummary } from "@/lib/types";
import { driveMinutesFromKm } from "@/lib/commute-policy";
import { fetchGtfsStops } from "@/services/clients/gtfs";
import { agencyByCounty, type TransitAgencyId } from "@/lib/transit-agencies";
import { countyIdsFromText } from "@/lib/county-lookup";

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

function agencyIdForJob(job: Job): TransitAgencyId | undefined {
  const [countyId] = countyIdsFromText(`${job.location.county} ${job.location.city}`);
  if (countyId) {
    const agency = agencyByCounty(countyId);
    if (agency) return agency.id;
  }
  return undefined;
}

function estimateTransitCommute(
  job: Job,
  stops: { lat: number; lng: number }[]
): CommuteSummary {
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
      mode: "transit",
      distanceKm: distKm === Infinity ? undefined : distKm,
    };
  }

  const walkMinutes = Math.max(3, Math.round(distKm * 12));
  const durationMinutes = 22 + walkMinutes + Math.round(distKm * 6);
  const transfers = distKm > 0.8 ? 1 : 0;

  return {
    durationMinutes,
    walkMinutes,
    transfers,
    fareEstimate: 2.25,
    scheduleCompatible: durationMinutes < 50,
    reliability: transfers === 0 ? "high" : "medium",
    mode: "transit",
    distanceKm: distKm,
  };
}

function estimateDriveCommute(
  job: Job,
  searchAnchor: { lat: number; lng: number }
): CommuteSummary {
  const distKm = haversineKm(
    job.location.coordinates.lat,
    job.location.coordinates.lng,
    searchAnchor.lat,
    searchAnchor.lng
  );
  const durationMinutes = driveMinutesFromKm(distKm);

  return {
    durationMinutes,
    walkMinutes: 0,
    transfers: 0,
    fareEstimate: 0,
    scheduleCompatible: durationMinutes <= 45,
    scheduleNotes: "Estimated drive time from your search area",
    reliability: durationMinutes <= 30 ? "high" : durationMinutes <= 45 ? "medium" : "low",
    mode: "drive",
    distanceKm: distKm,
  };
}

function commuteFitScore(commute: CommuteSummary, payMin?: number, payType?: string): number {
  const pay = payType === "hourly" ? (payMin ?? 0) * 2080 : payMin ?? 50000;
  const payScore = Math.min(40, pay / 2500);
  const timeScore = Math.max(0, 40 - commute.durationMinutes * 0.6);
  const transferScore = Math.max(0, 15 - commute.transfers * 6);
  const scheduleScore = commute.scheduleCompatible ? 10 : -5;
  const healthBonus = commute.durationMinutes <= 30 ? 8 : commute.durationMinutes <= 45 ? 3 : -15;
  return Math.round(
    Math.min(100, Math.max(20, payScore + timeScore + transferScore + scheduleScore + healthBonus))
  );
}

export async function enrichJobsWithCommuteEstimates(
  jobs: Job[],
  options?: { searchAnchor?: { lat: number; lng: number } }
): Promise<Job[]> {
  if (jobs.length === 0) return jobs;

  const agencyIds = [...new Set(jobs.map(agencyIdForJob).filter(Boolean))] as TransitAgencyId[];
  const stopMap = new Map<TransitAgencyId, { lat: number; lng: number }[]>();

  await Promise.all(
    agencyIds.slice(0, 7).map(async (id) => {
      const { stops } = await fetchGtfsStops(id, { limit: 350 });
      stopMap.set(
        id,
        stops.map((s) => ({ lat: s.lat, lng: s.lng }))
      );
    })
  );

  return jobs.map((job) => {
    const agencyId = agencyIdForJob(job);
    const stops = agencyId ? stopMap.get(agencyId) ?? [] : [];
    const commute = stops.length
      ? estimateTransitCommute(job, stops)
      : options?.searchAnchor
        ? estimateDriveCommute(job, options.searchAnchor)
        : undefined;

    if (!commute) {
      return { ...job, transitAccessible: false, commuteFitScore: undefined };
    }

    const transitAccessible =
      commute.mode === "transit" &&
      commute.walkMinutes <= 12 &&
      commute.reliability !== "low";

    return {
      ...job,
      commute,
      transitAccessible,
      commuteFitScore: commuteFitScore(commute, job.payMin, job.payType),
    };
  });
}
