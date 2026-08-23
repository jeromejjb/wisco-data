import { describe, expect, it } from "vitest";
import {
  buildCountyFocus,
  formatCountyMetric,
  formatRankContext,
  formatStateAvgLabel,
  peerAxisPct,
  peerChartDomain,
} from "@/lib/map-county-metrics";
import { SAMPLE_COUNTIES } from "@/lib/test-fixtures";

describe("formatCountyMetric", () => {
  it("formats unemployment as a percentage", () => {
    expect(formatCountyMetric("unemployment", 3.24)).toBe("3.2%");
  });

  it("formats wages in thousands", () => {
    expect(formatCountyMetric("median-wage", 52000)).toBe("$52k");
  });
});

describe("formatRankContext", () => {
  it("does not produce 'lower than 0%' copy for statewide unemployment", () => {
    const focus = buildCountyFocus(SAMPLE_COUNTIES, "dane", "unemployment", {
      unemploymentByFips: {
        "55079": 4.2,
        "55025": 2.8,
        "55009": 3.1,
        "55063": 3.2,
      },
    })!;

    const copy = formatRankContext(focus);
    expect(copy).not.toMatch(/lower than 0%/i);
    expect(copy).toMatch(/#1 of 4 WI counties · lowest rate statewide/);
  });

  it("describes middle ranks with lower and higher counts", () => {
    const focus = buildCountyFocus(SAMPLE_COUNTIES, "brown", "unemployment", {
      unemploymentByFips: {
        "55079": 4.2,
        "55025": 2.8,
        "55009": 3.1,
        "55063": 3.2,
      },
    })!;

    expect(formatRankContext(focus)).toBe("#2 of 4 WI counties · 1 lower · 2 higher");
  });

  it("uses featured metro wording when statewide FIPS data is absent", () => {
    const focus = buildCountyFocus(SAMPLE_COUNTIES, "milwaukee", "unemployment")!;
    const copy = formatRankContext(focus);
    expect(copy).toMatch(/featured metros we track/);
    expect(copy).not.toMatch(/lower than 0%/i);
  });
});

describe("buildCountyFocus", () => {
  it("returns null for unknown counties", () => {
    expect(buildCountyFocus(SAMPLE_COUNTIES, "fake", "unemployment")).toBeNull();
  });

  it("uses 72-county FIPS data when provided for unemployment", () => {
    const focus = buildCountyFocus(SAMPLE_COUNTIES, "dane", "unemployment", {
      unemploymentByFips: { "55025": 2.8, "55079": 4.2 },
    })!;

    expect(focus.rankScope).toBe("statewide");
    expect(focus.rank).toBe(1);
    expect(focus.totalCounties).toBe(2);
  });

  it("excludes the active metric from vitals", () => {
    const focus = buildCountyFocus(SAMPLE_COUNTIES, "dane", "unemployment")!;
    expect(focus.vitals.some((v) => v.label === "Unemployment")).toBe(false);
    expect(focus.vitals.some((v) => v.label === "Median wage")).toBe(true);
  });
});

describe("formatStateAvgLabel", () => {
  it("labels statewide unemployment averages with county count", () => {
    const focus = buildCountyFocus(SAMPLE_COUNTIES, "dane", "unemployment", {
      unemploymentByFips: { "55025": 2.8, "55079": 4.2 },
    })!;
    expect(formatStateAvgLabel(focus)).toMatch(/2 counties/);
  });
});

describe("peerChartDomain", () => {
  it("spreads clustered unemployment rates across a readable axis", () => {
    const domain = peerChartDomain("unemployment", [2.5, 2.7, 2.8, 2.8, 2.8]);
    expect(domain.max - domain.min).toBeGreaterThan(0.5);

    const positions = [2.5, 2.7, 2.8].map((v) => peerAxisPct(v, domain));
    expect(positions[0]).toBeLessThan(positions[1]!);
    expect(positions[1]).toBeLessThan(positions[2]!);
    expect(positions[2]! - positions[0]!).toBeGreaterThan(8);
  });

  it("includes peerChart on county focus snapshots", () => {
    const focus = buildCountyFocus(SAMPLE_COUNTIES, "dane", "unemployment", {
      unemploymentByFips: {
        "55079": 4.2,
        "55025": 2.5,
        "55009": 2.7,
        "55063": 2.8,
      },
    })!;
    expect(focus.peerChart.minLabel).toMatch(/%/);
    expect(focus.peers.every((p) => p.axisPct >= 4 && p.axisPct <= 96)).toBe(true);
  });
});
