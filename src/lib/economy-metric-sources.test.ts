import { describe, expect, it } from "vitest";
import { formatDataAsOf, getMetricSources } from "@/lib/economy-metric-sources";

describe("getMetricSources", () => {
  it("returns sources for known metrics", () => {
    const sources = getMetricSources("unemployment");
    expect(sources.length).toBeGreaterThan(0);
    expect(sources.every((s) => s.label && s.href.startsWith("http"))).toBe(true);
  });

  it("returns an empty array for unknown metrics", () => {
    // @ts-expect-error testing invalid metric input
    expect(getMetricSources("unknown-metric")).toEqual([]);
  });
});

describe("formatDataAsOf", () => {
  it("formats valid ISO dates", () => {
    expect(formatDataAsOf("2026-01-15T12:00:00.000Z")).toBe("Jan 15, 2026");
  });

  it("returns null for missing or invalid values", () => {
    expect(formatDataAsOf(undefined)).toBeNull();
    expect(formatDataAsOf("not-a-date")).toBeNull();
  });
});
