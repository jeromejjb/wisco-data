import { describe, expect, it } from "vitest";
import { mapFlyDurationMs } from "./motion";

describe("mapFlyDurationMs", () => {
  it("is instant when the user prefers reduced motion", () => {
    expect(mapFlyDurationMs(true, true)).toBe(0);
    expect(mapFlyDurationMs(true, false)).toBe(0);
  });

  it("keeps camera moves within Material content-transition range", () => {
    expect(mapFlyDurationMs(false, true)).toBeLessThanOrEqual(600);
    expect(mapFlyDurationMs(false, false)).toBeLessThanOrEqual(800);
    expect(mapFlyDurationMs(false, false)).toBeGreaterThan(0);
  });
});
