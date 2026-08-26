import { describe, expect, it } from "vitest";
import { parseJobSearchLocation } from "@/services/clients/jobs-api";

/**
 * Regression: job search location parsing used to only know ~7 hardcoded
 * cities and silently defaulted everything else (e.g. Lake Geneva) to
 * Milwaukee coordinates.
 */
describe("parseJobSearchLocation", () => {
  it("resolves Lake Geneva to Walworth, not Milwaukee", () => {
    const loc = parseJobSearchLocation("Lake Geneva, WI");
    expect(loc.county).toBe("Walworth");
    expect(loc.county).not.toBe("Milwaukee");
  });

  it("resolves a county name not in the featured shortlist", () => {
    const loc = parseJobSearchLocation("Door County, WI");
    expect(loc.county).toBe("Door");
  });

  it("still resolves well-known metros", () => {
    const loc = parseJobSearchLocation("Milwaukee, WI");
    expect(loc.county).toBe("Milwaukee");
  });

  it("falls back to statewide coordinates for generic Wisconsin text", () => {
    const loc = parseJobSearchLocation("Wisconsin");
    expect(loc.county).toBe("Wisconsin");
    expect(loc.city).toBe("Wisconsin");
  });
});
