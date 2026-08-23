import { describe, expect, it } from "vitest";
import { userAreaFromCountyId } from "@/lib/user-area";

/**
 * Regression: /api/news used to only resolve featured metros and silently
 * fall back to Milwaukee for counties like La Crosse.
 */
describe("news area resolution", () => {
  it("resolves La Crosse to a non-Milwaukee area", () => {
    const area = userAreaFromCountyId("la-crosse");
    expect(area.countyId).toBe("la-crosse");
    expect(area.displayName).toBe("La Crosse");
    expect(area.countyId).not.toBe("milwaukee");
  });

  it("resolves Door County for rural queries", () => {
    const area = userAreaFromCountyId("door");
    expect(area.countyId).toBe("door");
    expect(area.displayName).toBe("Door");
  });

  it("still resolves featured metros", () => {
    const area = userAreaFromCountyId("milwaukee");
    expect(area.countyId).toBe("milwaukee");
    expect(area.displayName).toBe("Milwaukee");
  });
});
