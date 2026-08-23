import type { CountyEconomy } from "@/lib/types";

/** Minimal county rows for map metric tests. */
export function makeCounty(overrides: Partial<CountyEconomy> & Pick<CountyEconomy, "id" | "name">): CountyEconomy {
  return {
    fips: overrides.fips ?? "55000",
    coordinates: overrides.coordinates ?? { lat: 44.5, lng: -89.5 },
    population: 100_000,
    unemploymentRate: 3.5,
    laborForceParticipation: 65,
    openJobs: 1200,
    medianWage: 52000,
    medianHouseholdIncome: 62000,
    costOfLivingIndex: 98,
    populationChange: 0.5,
    transitCoverage: 40,
    transitAccessibleJobShare: 25,
    opportunityIndex: 72,
    industryGrowth: [],
    ...overrides,
  };
}

export const SAMPLE_COUNTIES: CountyEconomy[] = [
  makeCounty({
    id: "milwaukee",
    name: "Milwaukee County",
    fips: "55079",
    unemploymentRate: 4.2,
    medianWage: 48000,
    openJobs: 8500,
    opportunityIndex: 68,
    transitCoverage: 72,
  }),
  makeCounty({
    id: "dane",
    name: "Dane County",
    fips: "55025",
    unemploymentRate: 2.8,
    medianWage: 58000,
    openJobs: 4200,
    opportunityIndex: 82,
    transitCoverage: 55,
  }),
  makeCounty({
    id: "brown",
    name: "Brown County",
    fips: "55009",
    unemploymentRate: 3.1,
    medianWage: 51000,
    openJobs: 3100,
    opportunityIndex: 75,
    transitCoverage: 38,
  }),
];
