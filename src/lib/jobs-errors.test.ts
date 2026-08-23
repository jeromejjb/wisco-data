import { describe, expect, it } from "vitest";
import { buildJobsMeta } from "@/lib/jobs-errors";

const configuredEnv = {
  anyLiveSource: true,
  adzunaReady: true,
  usajobsReady: true,
  missing: [],
};

const unconfiguredEnv = {
  anyLiveSource: false,
  adzunaReady: false,
  usajobsReady: false,
  missing: ["USAJOBS_AUTH_KEY", "ADZUNA_APP_ID"],
};

describe("buildJobsMeta", () => {
  it("marks unconfigured servers", () => {
    const meta = buildJobsMeta({
      env: unconfiguredEnv,
      usajobsError: "USAJobs not configured",
      adzunaError: "Adzuna not configured",
      liveCount: 0,
      resultCount: 0,
    });

    expect(meta.status).toBe("unconfigured");
    expect(meta.keysRequired).toBe(true);
    expect(meta.userMessage).toMatch(/not configured/i);
  });

  it("marks failed when all configured sources error", () => {
    const meta = buildJobsMeta({
      env: configuredEnv,
      usajobsError: "USAJobs fetch failed",
      adzunaError: "Adzuna fetch failed",
      liveCount: 0,
      resultCount: 0,
    });

    expect(meta.status).toBe("failed");
    expect(meta.errors).toHaveLength(2);
  });

  it("marks partial when one source succeeds", () => {
    const meta = buildJobsMeta({
      env: configuredEnv,
      usajobsError: "USAJobs fetch failed",
      adzunaError: null,
      liveCount: 12,
      resultCount: 12,
    });

    expect(meta.status).toBe("partial");
    expect(meta.userMessage).toMatch(/available sources/i);
  });

  it("explains commute-filter empty results", () => {
    const meta = buildJobsMeta({
      env: configuredEnv,
      usajobsError: null,
      adzunaError: null,
      liveCount: 20,
      resultCount: 0,
    });

    expect(meta.status).toBe("empty");
    expect(meta.userMessage).toMatch(/commute filters/i);
  });

  it("explains location-specific empty results when the regional pool is empty", () => {
    const meta = buildJobsMeta({
      env: configuredEnv,
      usajobsError: null,
      adzunaError: null,
      liveCount: 8,
      resultCount: 0,
      searchLocation: "La Crosse",
      poolCount: 0,
    });

    expect(meta.status).toBe("empty");
    expect(meta.userMessage).toMatch(/near La Crosse/i);
  });

  it("parses credential and rate-limit errors", () => {
    const meta = buildJobsMeta({
      env: configuredEnv,
      usajobsError: "USAJobs 401 unauthorized",
      adzunaError: "Adzuna 429 too many requests",
      liveCount: 0,
      resultCount: 0,
    });

    expect(meta.errors[0]?.userMessage).toMatch(/credentials/i);
    expect(meta.errors[1]?.code).toBe("rate_limited");
    expect(meta.errors[1]?.userMessage).toMatch(/briefly limiting/i);
    expect(meta.errors[1]?.userMessage).toMatch(/about 5 minutes/i);
  });

  it("uses a cooling-down message when all sources are rate limited", () => {
    const meta = buildJobsMeta({
      env: configuredEnv,
      usajobsError: "USAJobs 429 too many requests",
      adzunaError: "Adzuna 429 rate limit",
      liveCount: 0,
      resultCount: 0,
    });

    expect(meta.status).toBe("failed");
    expect(meta.userMessage).toMatch(/cooling down/i);
    expect(meta.userMessage).toMatch(/temporary/i);
  });
});
