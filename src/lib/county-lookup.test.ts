import { describe, expect, it } from "vitest";
import {
  censusRowNameToFips,
  countyDisplayName,
  countyIdFromFips,
  countyIdsFromText,
  fipsFromCountyId,
  getCountyCoordinates,
  primaryCountyIdFromText,
} from "@/lib/county-lookup";

describe("countyIdFromFips", () => {
  it("maps featured metro FIPS to short ids", () => {
    expect(countyIdFromFips("55079")).toBe("milwaukee");
    expect(countyIdFromFips("55025")).toBe("dane");
  });

  it("maps non-featured counties to kebab slugs", () => {
    expect(countyIdFromFips("55063")).toBe("la-crosse");
    expect(countyIdFromFips("55029")).toBe("door");
  });
});

describe("countyDisplayName", () => {
  it("appends County when missing", () => {
    expect(countyDisplayName("La Crosse")).toBe("La Crosse County");
  });

  it("preserves names that already include County", () => {
    expect(countyDisplayName("Dane County")).toBe("Dane County");
  });
});

describe("censusRowNameToFips", () => {
  it("parses Census-style county names", () => {
    expect(censusRowNameToFips("Dane County, Wisconsin")).toBe("55025");
    expect(censusRowNameToFips("La Crosse County, Wisconsin")).toBe("55063");
  });

  it("returns undefined for unknown names", () => {
    expect(censusRowNameToFips("Fake, Wisconsin")).toBeUndefined();
  });
});

describe("fipsFromCountyId", () => {
  it("resolves featured and non-featured county ids", () => {
    expect(fipsFromCountyId("milwaukee")).toBe("55079");
    expect(fipsFromCountyId("la-crosse")).toBe("55063");
  });

  it("passes through raw FIPS strings", () => {
    expect(fipsFromCountyId("55063")).toBe("55063");
  });

  it("returns undefined for unknown ids", () => {
    expect(fipsFromCountyId("not-a-county")).toBeUndefined();
  });
});

describe("getCountyCoordinates", () => {
  it("returns coords for featured metros", () => {
    const coords = getCountyCoordinates("milwaukee");
    expect(coords).toBeTruthy();
    expect(coords!.lat).toBeCloseTo(43.04, 1);
  });

  it("returns centroid coords for non-featured counties", () => {
    const coords = getCountyCoordinates("la-crosse");
    expect(coords).toBeTruthy();
    expect(coords!.lat).toBeGreaterThan(43);
    expect(coords!.lng).toBeLessThan(-90);
  });

  it("returns null for unknown counties", () => {
    expect(getCountyCoordinates("fake-county")).toBeNull();
  });
});

describe("countyIdsFromText", () => {
  it("finds county names with word boundaries", () => {
    expect(countyIdsFromText("unemployment in Door County")).toContain("door");
    expect(countyIdsFromText("jobs in La Crosse")).toContain("la-crosse");
  });

  it("prefers longest matching county name", () => {
    const ids = countyIdsFromText("St. Croix County jobs");
    expect(ids[0]).toBe("st-croix");
  });

  it("dedupes multiple mentions", () => {
    expect(countyIdsFromText("Dane and Dane County")).toEqual(["dane"]);
  });

  it("does not match substrings inside other words", () => {
    expect(countyIdsFromText("rocket science festival")).not.toContain("rock");
  });
});

describe("primaryCountyIdFromText", () => {
  it("returns the first county match", () => {
    expect(primaryCountyIdFromText("unemployment in Door County")).toBe("door");
  });
});
