import { describe, expect, it, vi } from "vitest";
import type { Job } from "@/lib/types";

vi.mock("@/services/clients/gtfs", () => ({
  fetchGtfsStops: vi.fn(async (agencyId: string) => ({
    stops:
      agencyId === "mcts"
        ? [{ lat: 43.0389, lng: -87.9065 }]
        : agencyId === "madison"
          ? [{ lat: 43.0731, lng: -89.4012 }]
          : [],
    routes: [],
  })),
}));

import { enrichJobsWithCommuteEstimates } from "@/services/live/commute-enrichment";

function makeJob(overrides: Partial<Job>): Job {
  return {
    id: "job-1",
    title: "Test Role",
    employer: "Acme",
    employerId: "acme",
    industry: "General",
    location: {
      address: "",
      city: "La Crosse",
      county: "La Crosse",
      zip: "",
      coordinates: { lat: 43.8014, lng: -91.2396 },
    },
    payType: "annual",
    employmentType: "full-time",
    workMode: "on-site",
    postedDate: "2026-01-01",
    skills: [],
    benefits: [],
    experienceLevel: "Varies",
    education: "See posting",
    shift: "Day",
    schedule: "Full-time",
    isOpen: true,
    applicationUrl: "https://example.com",
    transitAccessible: false,
    ...overrides,
  };
}

/**
 * Regression: jobs outside Milwaukee/Madison with no search anchor used to
 * silently get a "transit commute" estimate computed against MCTS/Madison
 * GTFS stops hundreds of miles away, implying nonexistent bus service.
 */
describe("enrichJobsWithCommuteEstimates", () => {
  it("does not fabricate a transit commute for non-metro jobs with no search anchor", async () => {
    const [job] = await enrichJobsWithCommuteEstimates([makeJob({})]);
    expect(job.commute).toBeUndefined();
    expect(job.transitAccessible).toBe(false);
  });

  it("estimates a drive commute for non-metro jobs when a search anchor is provided", async () => {
    const [job] = await enrichJobsWithCommuteEstimates([makeJob({})], {
      searchAnchor: { lat: 43.8, lng: -91.25 },
    });
    expect(job.commute?.mode).toBe("drive");
  });

  it("still estimates a transit commute for jobs inside a known transit metro", async () => {
    const [job] = await enrichJobsWithCommuteEstimates([
      makeJob({
        location: {
          address: "",
          city: "Milwaukee",
          county: "Milwaukee",
          zip: "",
          coordinates: { lat: 43.0389, lng: -87.9065 },
        },
      }),
    ]);
    expect(job.commute?.mode).toBe("transit");
  });
});
