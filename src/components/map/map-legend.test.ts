import { describe, expect, it } from "vitest";
import { interpolateMetricColor } from "./map-legend";

describe("interpolateMetricColor", () => {
  it("returns endpoint colors and blends mid-range unemployment", () => {
    expect(interpolateMetricColor("unemployment", 1)).toBe("#06b6d4");
    expect(interpolateMetricColor("unemployment", 6)).toBe("#f43f5e");
    expect(interpolateMetricColor("unemployment", 3.25)).toMatch(/^#[0-9a-f]{6}$/);
  });
});
