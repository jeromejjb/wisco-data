import { describe, expect, it, beforeEach } from "vitest";
import { cached, listCacheKeys, resetCacheStore, CACHE_MAX_ENTRIES } from "@/lib/cache";
import { isAdminAuthorized } from "@/lib/admin-auth";
import { consumeIpRateLimit, resetIpRateLimit } from "@/lib/ip-rate-limit";
import { allCountyRecords } from "@/lib/county-lookup";
import { FIPS_BY_COUNTY_ID } from "@/lib/wi-counties";
import { DEFAULT_USER_AREA } from "@/lib/user-area";

describe("allCountyRecords", () => {
  it("covers all 72 Wisconsin counties", () => {
    const rows = allCountyRecords();
    expect(rows).toHaveLength(72);
    expect(rows.some((c) => c.id === "la-crosse")).toBe(true);
    expect(rows.some((c) => c.id === "milwaukee")).toBe(true);
  });

  it("maps every county id to a FIPS code", () => {
    expect(Object.keys(FIPS_BY_COUNTY_ID).length).toBeGreaterThanOrEqual(72);
    expect(FIPS_BY_COUNTY_ID["la-crosse"]).toBe("55063");
  });
});

describe("DEFAULT_USER_AREA", () => {
  it("is statewide, not Milwaukee", () => {
    expect(DEFAULT_USER_AREA.countyId).toBe("statewide");
    expect(DEFAULT_USER_AREA.displayName).toBe("Wisconsin");
  });
});

describe("admin auth", () => {
  it("fails closed when ADMIN_SECRET is unset", () => {
    const prev = process.env.ADMIN_SECRET;
    delete process.env.ADMIN_SECRET;
    const req = new Request("http://localhost/admin");
    expect(isAdminAuthorized(req)).toBe(false);
    if (prev !== undefined) process.env.ADMIN_SECRET = prev;
  });

  it("accepts a matching bearer token", () => {
    const prev = process.env.ADMIN_SECRET;
    process.env.ADMIN_SECRET = "test-secret";
    const req = new Request("http://localhost/admin", {
      headers: { authorization: "Bearer test-secret" },
    });
    expect(isAdminAuthorized(req)).toBe(true);
    if (prev !== undefined) process.env.ADMIN_SECRET = prev;
    else delete process.env.ADMIN_SECRET;
  });
});

describe("ip rate limit", () => {
  beforeEach(() => resetIpRateLimit());

  it("blocks after the limit", () => {
    expect(consumeIpRateLimit("1.1.1.1", 2, 60_000).ok).toBe(true);
    expect(consumeIpRateLimit("1.1.1.1", 2, 60_000).ok).toBe(true);
    expect(consumeIpRateLimit("1.1.1.1", 2, 60_000).ok).toBe(false);
  });
});

describe("cache LRU + shouldCache", () => {
  beforeEach(() => resetCacheStore());

  it("does not store values when shouldCache returns false", async () => {
    await cached("err", 60_000, async () => ({ error: "nope" }), {
      shouldCache: (v) => !v.error,
    });
    expect(listCacheKeys()).toHaveLength(0);
  });

  it("evicts oldest entries past the cap", async () => {
    for (let i = 0; i < CACHE_MAX_ENTRIES + 5; i++) {
      await cached(`k${i}`, 60_000, async () => i);
    }
    expect(listCacheKeys().length).toBeLessThanOrEqual(CACHE_MAX_ENTRIES);
    expect(listCacheKeys()).not.toContain("k0");
  });
});
