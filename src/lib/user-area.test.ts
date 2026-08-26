import { describe, expect, it } from "vitest";
import {
  DEFAULT_USER_AREA,
  buildUserArea,
  haversineKm,
  isInWisconsin,
  matchCityInText,
  nearestCountyFromCoords,
  userAreaFromCountyId,
} from "@/lib/user-area";

describe("isInWisconsin", () => {
  it("accepts coordinates inside Wisconsin bounds", () => {
    expect(isInWisconsin(43.04, -87.91)).toBe(true);
    expect(isInWisconsin(43.8, -91.24)).toBe(true);
  });

  it("rejects coordinates outside Wisconsin", () => {
    expect(isInWisconsin(41.88, -87.63)).toBe(false); // Chicago
    expect(isInWisconsin(44.95, -93.09)).toBe(false); // Minneapolis
  });
});

describe("haversineKm", () => {
  it("returns zero for identical points", () => {
    const p = { lat: 43.04, lng: -87.91 };
    expect(haversineKm(p, p)).toBe(0);
  });

  it("computes plausible distance between Milwaukee and Madison", () => {
    const milwaukee = { lat: 43.0389, lng: -87.9065 };
    const madison = { lat: 43.0731, lng: -89.4012 };
    const km = haversineKm(milwaukee, madison);
    expect(km).toBeGreaterThan(110);
    expect(km).toBeLessThan(150);
  });
});

describe("nearestCountyFromCoords", () => {
  it("returns Milwaukee for downtown Milwaukee coords", () => {
    const nearest = nearestCountyFromCoords({ lat: 43.04, lng: -87.91 });
    expect(nearest.countyId).toBe("milwaukee");
  });

  it("returns the nearest county to western Wisconsin coords", () => {
    const nearest = nearestCountyFromCoords({ lat: 43.8014, lng: -91.2396 });
    expect(nearest.countyId).toBe("la-crosse");
  });
});

describe("buildUserArea", () => {
  it("marks out-of-state coords as not in Wisconsin", () => {
    const area = buildUserArea({ lat: 41.88, lng: -87.63 }, "ip");
    expect(area.inWisconsin).toBe(false);
  });
});

describe("matchCityInText", () => {
  it("matches city names case-insensitively", () => {
    expect(matchCityInText("find jobs in la crosse")).toEqual({
      countyId: "la-crosse",
      cityLabel: "La Crosse",
    });
    expect(matchCityInText("CNA jobs in Green Bay")).toEqual({
      countyId: "brown",
      cityLabel: "Green Bay",
    });
  });

  it("prefers longer city labels", () => {
    expect(matchCityInText("jobs in west allis")).toEqual({
      countyId: "milwaukee",
      cityLabel: "West Allis",
    });
  });

  it("returns null when no city matches", () => {
    expect(matchCityInText("hello world")).toBeNull();
  });
});

describe("userAreaFromCountyId", () => {
  it("resolves featured metros", () => {
    const area = userAreaFromCountyId("milwaukee");
    expect(area.countyId).toBe("milwaukee");
    expect(area.displayName).toBe("Milwaukee");
  });

  it("resolves non-featured counties like La Crosse", () => {
    const area = userAreaFromCountyId("la-crosse");
    expect(area.countyId).toBe("la-crosse");
    expect(area.displayName).toBe("La Crosse");
    expect(area.countyId).not.toBe(DEFAULT_USER_AREA.countyId);
  });

  it("falls back to default for unknown ids", () => {
    expect(userAreaFromCountyId("totally-unknown")).toEqual(DEFAULT_USER_AREA);
    expect(DEFAULT_USER_AREA.countyId).toBe("statewide");
  });
});
