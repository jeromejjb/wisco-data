import { describe, expect, it } from "vitest";
import { locateNewsInWisconsin } from "@/lib/news-geo";
import { DEFAULT_USER_AREA, userAreaFromCountyId } from "@/lib/user-area";

/**
 * Regression: news geolocation used to only know a dozen hardcoded cities
 * and silently fell back to whatever `fallback` area was passed in (often
 * Milwaukee) for anywhere else in Wisconsin, e.g. Lake Geneva.
 */
describe("locateNewsInWisconsin", () => {
  it("resolves Lake Geneva to Walworth instead of the Milwaukee fallback", () => {
    const result = locateNewsInWisconsin(
      "Company announces expansion in Lake Geneva",
      DEFAULT_USER_AREA
    );
    expect(result.countyId).toBe("walworth");
    expect(result.countyId).not.toBe("milwaukee");
  });

  it("resolves counties outside the featured metro list", () => {
    const result = locateNewsInWisconsin("Door County tourism grows", DEFAULT_USER_AREA);
    expect(result.countyId).toBe("door");
  });

  it("still resolves featured metros", () => {
    const result = locateNewsInWisconsin("Milwaukee hiring surge", DEFAULT_USER_AREA);
    expect(result.countyId).toBe("milwaukee");
  });

  it("uses the provided fallback when no location is mentioned", () => {
    const fallback = userAreaFromCountyId("la-crosse");
    const result = locateNewsInWisconsin("Statewide economic report released", fallback);
    expect(result.countyId).toBe("la-crosse");
  });
});
