import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { stateOutlineTheme } from "./wi-state-outline";

describe("stateOutlineTheme", () => {
  it("uses ice highlights on satellite and lake blue on the light map", () => {
    expect(stateOutlineTheme({ satellite: true }).line).toBe("#f8feff");
    expect(stateOutlineTheme({ dark: true }).glowMid).toContain("103, 232, 249");
    expect(stateOutlineTheme({}).line).toBe("#185580");
  });
});

describe("Wisconsin outline GeoJSON", () => {
  it("traces the full state including Door County and Superior", () => {
    const geo = JSON.parse(readFileSync("public/data/wi-state.geojson", "utf8")) as {
      features: { geometry: { type: string; coordinates: number[][][] } }[];
    };
    const ring = geo.features[0]?.geometry.coordinates[0];
    expect(ring?.length).toBeGreaterThan(50);

    const lngs = ring!.map((c) => c[0]);
    const lats = ring!.map((c) => c[1]);
    expect(Math.min(...lngs)).toBeLessThan(-92.5);
    expect(Math.max(...lngs)).toBeGreaterThan(-87);
    expect(Math.min(...lats)).toBeLessThan(42.6);
    expect(Math.max(...lats)).toBeGreaterThan(46.9);
  });
});
