import { describe, expect, it } from "vitest";
import { resolveCountyId } from "@/lib/agent/workways-agent";

/**
 * Regression: the chat agent's county resolver only checked the 10-county
 * "featured" list, so flyToMap/highlightCounties/getCountyEconomy could
 * not resolve most of Wisconsin's 72 counties (e.g. Walworth).
 */
describe("resolveCountyId", () => {
  it("resolves counties outside the featured shortlist", () => {
    expect(resolveCountyId("Walworth")).toBe("walworth");
    expect(resolveCountyId("Door County")).toBe("door");
  });

  it("resolves a city name to its county", () => {
    expect(resolveCountyId("Lake Geneva")).toBe("walworth");
  });

  it("still resolves featured counties", () => {
    expect(resolveCountyId("Milwaukee")).toBe("milwaukee");
    expect(resolveCountyId("dane")).toBe("dane");
  });

  it("returns undefined for unrecognized input", () => {
    expect(resolveCountyId("Narnia")).toBeUndefined();
  });
});
