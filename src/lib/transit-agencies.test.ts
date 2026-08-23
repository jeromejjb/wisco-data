import { describe, expect, it } from "vitest";
import {
  TRANSIT_AGENCY_LIST,
  agencyByCounty,
  agencyIdFromMetro,
  isTransitAgencyId,
} from "@/lib/transit-agencies";
import { bboxFromCenter, inBbox } from "@/lib/transit-types";

describe("transit agencies", () => {
  it("lists Wisconsin metro transit systems", () => {
    expect(TRANSIT_AGENCY_LIST.length).toBeGreaterThanOrEqual(7);
    expect(TRANSIT_AGENCY_LIST.some((a) => a.id === "mcts")).toBe(true);
    expect(TRANSIT_AGENCY_LIST.some((a) => a.id === "lacrosse")).toBe(true);
  });

  it("maps metros to agency ids", () => {
    expect(agencyIdFromMetro("milwaukee")).toBe("mcts");
    expect(agencyIdFromMetro("madison")).toBe("madison");
    expect(agencyIdFromMetro("both")).toBe("all");
  });

  it("finds agency by county", () => {
    expect(agencyByCounty("la-crosse")?.id).toBe("lacrosse");
    expect(agencyByCounty("brown")?.id).toBe("greenbay");
  });

  it("validates agency ids", () => {
    expect(isTransitAgencyId("mcts")).toBe(true);
    expect(isTransitAgencyId("fake")).toBe(false);
  });
});

describe("transit bbox", () => {
  it("filters coordinates inside a bounding box", () => {
    const bbox = bboxFromCenter({ lat: 43.04, lng: -87.91 }, 0.05);
    expect(inBbox(43.04, -87.91, bbox)).toBe(true);
    expect(inBbox(44.5, -89.4, bbox)).toBe(false);
  });
});
