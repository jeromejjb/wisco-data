import { describe, expect, it } from "vitest";
import {
  choroplethTileForExplorer,
  type CountyExplorerSnapshot,
} from "./county-explorer";

function snapshot(
  overrides: Partial<CountyExplorerSnapshot> = {}
): CountyExplorerSnapshot {
  return {
    fips: "55079",
    countyId: "milwaukee",
    name: "Milwaukee County",
    shortName: "Milwaukee",
    population: 731000,
    populationIsEstimate: true,
    laborForce: 459359,
    medianHouseholdIncome: 66000,
    unemploymentRate: 4.3,
    choroplethMetric: null,
    choroplethValue: null,
    choroplethFormatted: null,
    featuredEconomy: null,
    ...overrides,
  };
}

describe("choroplethTileForExplorer", () => {
  it("skips unemployment because the hero already shows it", () => {
    expect(
      choroplethTileForExplorer(
        snapshot({
          choroplethMetric: "unemployment",
          choroplethValue: 4.3,
          choroplethFormatted: "4.3%",
        })
      )
    ).toBeNull();
  });

  it("skips open-jobs when featured economy already lists openings", () => {
    expect(
      choroplethTileForExplorer(
        snapshot({
          choroplethMetric: "open-jobs",
          choroplethValue: 4.3,
          choroplethFormatted: "4",
          featuredEconomy: { openJobs: 13181 } as CountyExplorerSnapshot["featuredEconomy"],
        })
      )
    ).toBeNull();
  });

  it("shows opportunity as a map-layer tile", () => {
    expect(
      choroplethTileForExplorer(
        snapshot({
          choroplethMetric: "opportunity",
          choroplethValue: 62,
          choroplethFormatted: "62",
        })
      )
    ).toEqual({
      label: "Opportunity index",
      value: "62",
      hint: "Map layer",
    });
  });
});
