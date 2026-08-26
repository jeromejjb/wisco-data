import type { ChoroplethMetric } from "@/lib/agent/map-actions";
import type { CountyEconomy } from "@/lib/types";
import { formatCountyMetric, metricShortLabel } from "@/lib/map-county-metrics";
import { formatIncome, formatPopulation } from "@/lib/format-population";

export type CountyExplorerSnapshot = {
  fips: string;
  countyId: string;
  name: string;
  shortName: string;
  population: number | null;
  populationIsEstimate: boolean;
  laborForce: number | null;
  medianHouseholdIncome: number | null;
  unemploymentRate: number | null;
  choroplethMetric: ChoroplethMetric | null;
  choroplethValue: number | null;
  choroplethFormatted: string | null;
  featuredEconomy: CountyEconomy | null;
};

export function buildCountyExplorerSnapshot(input: {
  fips: string;
  countyId: string;
  name: string;
  populationByFips?: Record<string, number>;
  populationEstimateByFips?: Record<string, boolean>;
  laborForceByFips?: Record<string, number>;
  medianIncomeByFips?: Record<string, number>;
  unemploymentByFips?: Record<string, number>;
  choroplethMetric?: ChoroplethMetric | null;
  choroplethValues?: Record<string, number>;
  featuredEconomy?: CountyEconomy | null;
}): CountyExplorerSnapshot {
  const shortName = input.name.replace(/ County$/i, "").trim();
  const censusPop = input.populationByFips?.[input.fips];
  const isEstimate = Boolean(input.populationEstimateByFips?.[input.fips]);
  const population = censusPop && censusPop > 0 ? censusPop : null;

  let choroplethValue: number | null = null;
  let choroplethFormatted: string | null = null;
  const metric = input.choroplethMetric ?? null;

  if (metric && input.choroplethValues?.[input.fips] != null) {
    choroplethValue = input.choroplethValues[input.fips];
    choroplethFormatted = formatCountyMetric(metric, choroplethValue);
  } else if (input.unemploymentByFips?.[input.fips] != null) {
    choroplethValue = input.unemploymentByFips[input.fips];
    choroplethFormatted = formatCountyMetric("unemployment", choroplethValue);
  }

  const economy = input.featuredEconomy ?? null;

  return {
    fips: input.fips,
    countyId: input.countyId,
    name: input.name.endsWith(" County") ? input.name : `${input.name} County`,
    shortName,
    population,
    populationIsEstimate: isEstimate,
    laborForce: input.laborForceByFips?.[input.fips] ?? null,
    medianHouseholdIncome:
      input.medianIncomeByFips?.[input.fips] ?? economy?.medianHouseholdIncome ?? null,
    unemploymentRate:
      input.unemploymentByFips?.[input.fips] ?? economy?.unemploymentRate ?? choroplethValue,
    choroplethMetric: metric,
    choroplethValue,
    choroplethFormatted,
    featuredEconomy: economy,
  };
}

export function countyExplorerHeadline(snapshot: CountyExplorerSnapshot): string {
  return snapshot.shortName;
}

export function countyExplorerSubline(snapshot: CountyExplorerSnapshot): string {
  const parts: string[] = [];
  if (snapshot.population) {
    parts.push(
      `${formatPopulation(snapshot.population, { estimate: snapshot.populationIsEstimate })} residents`
    );
  }
  if (snapshot.unemploymentRate != null) {
    parts.push(`${snapshot.unemploymentRate.toFixed(1)}% unemployment`);
  }
  return parts.join(" · ") || "Wisconsin county";
}

export function metricLabelForExplorer(metric: ChoroplethMetric | null): string {
  if (!metric) return "Map layer";
  return metricShortLabel(metric);
}

/** Extra map-layer tile — skipped when it would duplicate unemployment or featured stats. */
export function choroplethTileForExplorer(
  snapshot: CountyExplorerSnapshot
): { label: string; value: string; hint: string } | null {
  const metric = snapshot.choroplethMetric;
  if (!metric || !snapshot.choroplethFormatted) return null;
  if (metric === "unemployment") return null;
  if (metric === "open-jobs" && snapshot.featuredEconomy?.openJobs != null) return null;
  if (metric === "median-wage" && snapshot.featuredEconomy?.medianWage != null) return null;
  return {
    label: metricLabelForExplorer(metric),
    value: snapshot.choroplethFormatted,
    hint: "Map layer",
  };
}
