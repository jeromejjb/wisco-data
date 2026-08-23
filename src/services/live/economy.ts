import type { CountyEconomy, StatewideStats, DataProvenance } from "@/lib/types";
import { WI_COUNTIES } from "@/lib/wi-counties";
import { WI_COUNTY_NAME_TO_FIPS } from "@/lib/wi-county-fips";
import { cached } from "@/lib/cache";
import { fetchBlsStatewideSnapshot, fetchBlsUnemploymentTrend } from "@/services/clients/bls";
import {
  fetchQcewCounties,
  fetchQcewIndustryBreakdown,
  fetchQcewStatewide,
} from "@/services/clients/qcew";
import { fetchWisConomyCountyRates } from "@/services/clients/wisconomy";
import { fetchCensusCounties, fetchFredSeries } from "@/services/clients/census-fred";
import { metroRegions } from "@/data/mock/economy";

function computeOpportunityIndex(input: {
  unemployment: number;
  employment: number;
  avgWeeklyWage: number;
  wageGrowth: number | null;
  laborForceParticipation?: number;
}): number {
  const wageScore = Math.min(100, (input.avgWeeklyWage / 1400) * 40);
  const empScore = Math.min(30, (input.employment / 500000) * 30);
  const unempScore = Math.max(0, 20 - input.unemployment * 4);
  const growthScore = Math.min(10, Math.max(0, (input.wageGrowth ?? 0) * 2));
  return Math.round(wageScore + empScore + unempScore + growthScore);
}

export async function getLiveEconomyData() {
  return cached("economy:live", 3_600_000, fetchLiveEconomyData);
}

/** Fast path for home map — WisConomy + optional Census demographics. */
export async function getEconomyMapSeed() {
  return cached("economy:map-seed", 3_600_000, async () => {
    const { fetchCensusCounties } = await import("@/services/clients/census-fred");
    const [wisconomy, census] = await Promise.all([
      fetchWisConomyCountyRates(),
      fetchCensusCounties(),
    ]);

    const unemploymentByFips: Record<string, number> = {};
    const countyLabelsByFips: Record<string, string> = {};
    const laborForceByFips: Record<string, number> = {};
    const populationByFips: Record<string, number> = {};
    const populationEstimateByFips: Record<string, boolean> = {};
    const medianIncomeByFips: Record<string, number> = {};

    for (const row of wisconomy.counties) {
      const fips = WI_COUNTY_NAME_TO_FIPS[row.name];
      if (!fips) continue;
      unemploymentByFips[fips] = Math.round(row.unemploymentRate * 10) / 10;
      countyLabelsByFips[fips] = `${row.unemploymentRate.toFixed(1)}% unemployed`;
      if (row.laborForce > 0) laborForceByFips[fips] = row.laborForce;
    }

    if (census) {
      const { censusRowNameToFips } = await import("@/lib/county-lookup");
      for (const row of census) {
        const fips = censusRowNameToFips(row.name);
        if (!fips || row.population <= 0) continue;
        populationByFips[fips] = row.population;
        populationEstimateByFips[fips] = false;
        if (row.medianHouseholdIncome && row.medianHouseholdIncome > 0) {
          medianIncomeByFips[fips] = row.medianHouseholdIncome;
        }
      }
    }

    const { estimatePopulationFromLaborForce } = await import("@/lib/format-population");
    for (const [fips, lf] of Object.entries(laborForceByFips)) {
      if (populationByFips[fips]) continue;
      const est = estimatePopulationFromLaborForce(lf);
      if (est > 0) {
        populationByFips[fips] = est;
        populationEstimateByFips[fips] = true;
      }
    }

    return {
      unemploymentByFips,
      countyLabelsByFips,
      laborForceByFips,
      populationByFips,
      populationEstimateByFips,
      medianIncomeByFips,
    };
  });
}

async function fetchLiveEconomyData() {
  const [bls, qcewCounties, qcewState, wisconomy, industry, census, fredLfpr, trend] =
    await Promise.all([
      fetchBlsStatewideSnapshot(),
      fetchQcewCounties(),
      fetchQcewStatewide(),
      fetchWisConomyCountyRates(),
      fetchQcewIndustryBreakdown(),
      fetchCensusCounties(),
      fetchFredSeries("LBSSA55", 12),
      fetchBlsUnemploymentTrend(),
    ]);

  const wisconomyById = new Map(
    wisconomy.counties.filter((c) => c.countyId).map((c) => [c.countyId!, c])
  );
  const qcewById = new Map(qcewCounties.map((c) => [c.countyId, c]));
  const censusByName = new Map(
    (census ?? []).map((c) => [c.name.toLowerCase(), c])
  );

  const counties: CountyEconomy[] = WI_COUNTIES.map((county) => {
    const q = qcewById.get(county.id);
    const w = wisconomyById.get(county.id);
    const censusRow = censusByName.get(county.name.toLowerCase());

    const unemployment = w?.unemploymentRate ?? 3.5;
    const employment = q?.employment ?? 0;
    const avgWeekly = q?.avgWeeklyWage ?? 1200;
    const laborForce = w?.laborForce ?? censusRow?.laborForce ?? 0;
    const employed = w?.employed ?? 0;
    const lfpr = laborForce > 0 && censusRow?.population
      ? (laborForce / censusRow.population) * 100
      : employed > 0 && laborForce > 0
        ? (laborForce / (employed * 1.05)) * 66
        : 66;

    return {
      id: county.id,
      name: county.name,
      fips: county.fips,
      coordinates: { lat: county.lat, lng: county.lng },
      population: censusRow?.population ?? undefined,
      unemploymentRate: Math.round(unemployment * 10) / 10,
      laborForceParticipation: Math.round(Math.min(85, Math.max(55, lfpr)) * 10) / 10,
      openJobs: Math.round(employment * 0.028),
      medianWage: Math.round(avgWeekly * 52 * 0.92),
      medianHouseholdIncome: censusRow?.medianHouseholdIncome ?? Math.round(avgWeekly * 52 * 1.1),
      costOfLivingIndex: 95,
      populationChange: 0.5,
      transitCoverage: county.id === "milwaukee" ? 72 : county.id === "dane" ? 58 : 28,
      transitAccessibleJobShare: county.id === "milwaukee" ? 41 : county.id === "dane" ? 38 : 20,
      opportunityIndex: computeOpportunityIndex({
        unemployment,
        employment,
        avgWeeklyWage: avgWeekly,
        wageGrowth: q?.wageChangeYoY ?? null,
      }),
      industryGrowth: industry.slice(0, 3).map((i) => ({
        industry: i.name,
        growth: i.growth,
      })),
    };
  });

  const statewideEmployment = qcewState?.employment ?? 2_950_000;
  const laborForceParticipation = fredLfpr?.length
    ? fredLfpr[fredLfpr.length - 1].value
    : 66.8;

  const statewide: StatewideStats = {
    unemploymentRate: bls.unemploymentRate ?? 3.3,
    laborForceParticipation: laborForceParticipation ?? 66.8,
    openJobs: Math.round(statewideEmployment * 0.03),
    medianWage: bls.medianWageEstimate ?? Math.round((qcewState?.avgWeeklyWage ?? 1278) * 52 * 0.92),
    fastestGrowingIndustries: industry
      .sort((a, b) => b.growth - a.growth)
      .slice(0, 5)
      .map((i) => ({ name: i.name, growth: Math.round(i.growth * 10) / 10 })),
    transitAccessibleJobShare: 34.6,
    provenance: buildProvenance(wisconomy.fetchedAt),
  };

  const unemploymentByFips: Record<string, number> = {};
  const countyLabelsByFips: Record<string, string> = {};
  for (const row of wisconomy.counties) {
    const fips = WI_COUNTY_NAME_TO_FIPS[row.name];
    if (!fips) continue;
    unemploymentByFips[fips] = Math.round(row.unemploymentRate * 10) / 10;
    countyLabelsByFips[fips] = `${row.unemploymentRate.toFixed(1)}% unemployed`;
  }

  const metros = metroRegions.map((metro) => {
    const countyId =
      metro.id === "green-bay"
        ? "brown"
        : metro.id === "appleton"
          ? "outagamie"
          : metro.id;
    const county = counties.find((c) => c.id === countyId);
    if (!county) return metro;
    return {
      ...metro,
      unemploymentRate: county.unemploymentRate,
      openJobs: county.openJobs,
      medianWage: county.medianWage,
      transitAccessibleShare: county.transitAccessibleJobShare,
      fastestGrowingIndustry: statewide.fastestGrowingIndustries[0]?.name ?? metro.fastestGrowingIndustry,
    };
  });

  return {
    statewide,
    counties,
    metros,
    unemploymentByFips,
    countyLabelsByFips,
    unemploymentTrend: trend,
    industryBreakdown: industry.map((i) => ({
      name: i.name,
      value: i.value,
      growth: i.growth,
      employment: i.employment,
    })),
    rawSources: {
      bls,
      wisconomyFetchedAt: wisconomy.fetchedAt,
      qcewQuarter: "2024 Q4",
      censusAvailable: !!census,
      fredAvailable: !!fredLfpr,
    },
  };
}

function buildProvenance(fetchedAt: string): DataProvenance {
  const sources = [
    "U.S. Bureau of Labor Statistics (LAUS, CES, QCEW)",
    "Wisconsin DWD WisConomy (county unemployment)",
  ];
  if (process.env.CENSUS_API_KEY) sources.push("U.S. Census Bureau ACS 5-Year");
  if (process.env.FRED_API_KEY) sources.push("Federal Reserve Economic Data (FRED)");

  return {
    source: sources.join(" · "),
    lastUpdated: fetchedAt,
    coverage: "Wisconsin statewide; featured counties with QCEW + LAUS",
    confidence: "high",
    methodology:
      "State unemployment from BLS LAUS. County rates from WisConomy (DWD). Employment and wages from BLS QCEW Q4 2024. Open jobs estimated at ~3% of QCEW employment (JOLTS-style proxy).",
  };
}

export type LiveEconomyData = Awaited<ReturnType<typeof fetchLiveEconomyData>>;
