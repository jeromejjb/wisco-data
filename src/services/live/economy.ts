import type { CountyEconomy, StatewideStats, DataProvenance } from "@/lib/types";
import { allCountyRecords } from "@/lib/county-lookup";
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
}): number {
  const wageScore = Math.min(100, (input.avgWeeklyWage / 1400) * 40);
  const empScore = Math.min(30, (input.employment / 500000) * 30);
  const unempScore = Math.max(0, 20 - input.unemployment * 4);
  const growthScore = Math.min(10, Math.max(0, (input.wageGrowth ?? 0) * 2));
  return Math.round(wageScore + empScore + unempScore + growthScore);
}

function settledValue<T>(result: PromiseSettledResult<T>, fallback: T, label: string): T {
  if (result.status === "fulfilled") return result.value;
  console.warn(`Economy source failed (${label}):`, result.reason);
  return fallback;
}

export async function getLiveEconomyData() {
  return cached("economy:live:v2", 3_600_000, fetchLiveEconomyData);
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
  const [
    blsResult,
    qcewCountiesResult,
    qcewStateResult,
    wisconomyResult,
    industryResult,
    censusResult,
    fredLfprResult,
    trendResult,
  ] = await Promise.allSettled([
    fetchBlsStatewideSnapshot(),
    fetchQcewCounties(),
    fetchQcewStatewide(),
    fetchWisConomyCountyRates(),
    fetchQcewIndustryBreakdown(),
    fetchCensusCounties(),
    fetchFredSeries("LBSSA55", 12),
    fetchBlsUnemploymentTrend(),
  ]);

  const bls = settledValue(blsResult, {
    unemploymentRate: null,
    totalEmploymentThousands: null,
    avgWeeklyWage: null,
    medianWageEstimate: null,
    latestPeriod: null,
    fetchedAt: new Date().toISOString(),
  }, "bls");
  const qcewCounties = settledValue(qcewCountiesResult, [], "qcew-counties");
  const qcewState = settledValue(qcewStateResult, null, "qcew-state");
  const wisconomy = settledValue(
    wisconomyResult,
    { counties: [], fetchedAt: new Date().toISOString(), sourceUrl: "" },
    "wisconomy"
  );
  const industry = settledValue(industryResult, [], "qcew-industry");
  const census = settledValue(censusResult, null, "census");
  const fredLfpr = settledValue(fredLfprResult, null, "fred");
  const trend = settledValue(trendResult, [], "bls-trend");

  const wisconomyById = new Map(
    wisconomy.counties.filter((c) => c.countyId).map((c) => [c.countyId!, c])
  );
  const qcewById = new Map(qcewCounties.map((c) => [c.countyId, c]));
  const censusByName = new Map(
    (census ?? []).map((c) => [c.name.toLowerCase(), c])
  );

  const counties: CountyEconomy[] = [];
  for (const county of allCountyRecords()) {
    const w = wisconomyById.get(county.id);
    if (w == null || !Number.isFinite(w.unemploymentRate)) continue;

    const q = qcewById.get(county.id);
    const censusRow = censusByName.get(county.name.toLowerCase());
    const unemployment = w.unemploymentRate;
    const employment = q?.employment;
    const avgWeekly = q?.avgWeeklyWage;
    const laborForce = w.laborForce || censusRow?.laborForce || 0;
    const lfpr =
      laborForce > 0 && censusRow?.population
        ? (laborForce / censusRow.population) * 100
        : undefined;

    counties.push({
      id: county.id,
      name: county.name,
      fips: county.fips,
      coordinates: { lat: county.lat, lng: county.lng },
      population: censusRow?.population ?? undefined,
      unemploymentRate: Math.round(unemployment * 10) / 10,
      laborForceParticipation:
        lfpr != null ? Math.round(Math.min(85, Math.max(45, lfpr)) * 10) / 10 : undefined,
      openJobs: employment != null ? Math.round(employment * 0.028) : undefined,
      medianWage: avgWeekly != null ? Math.round(avgWeekly * 52 * 0.92) : undefined,
      medianHouseholdIncome: censusRow?.medianHouseholdIncome ?? undefined,
      opportunityIndex: computeOpportunityIndex({
        unemployment,
        employment: employment ?? 0,
        avgWeeklyWage: avgWeekly ?? 0,
        wageGrowth: q?.wageChangeYoY ?? null,
      }),
      industryGrowth: industry.slice(0, 3).map((i) => ({
        industry: i.name,
        growth: i.growth,
      })),
    });
  }

  const countyUnempAvg =
    counties.length > 0
      ? counties.reduce((s, c) => s + c.unemploymentRate, 0) / counties.length
      : undefined;
  const statewideEmployment = qcewState?.employment;
  const laborForceParticipation = fredLfpr?.length
    ? fredLfpr[fredLfpr.length - 1]!.value
    : undefined;

  const statewide: StatewideStats = {
    unemploymentRate: bls.unemploymentRate ?? countyUnempAvg,
    laborForceParticipation,
    openJobs: statewideEmployment != null ? Math.round(statewideEmployment * 0.03) : undefined,
    medianWage: bls.medianWageEstimate ?? (qcewState?.avgWeeklyWage != null
      ? Math.round(qcewState.avgWeeklyWage * 52 * 0.92)
      : undefined),
    fastestGrowingIndustries: industry
      .sort((a, b) => b.growth - a.growth)
      .slice(0, 5)
      .map((i) => ({ name: i.name, growth: Math.round(i.growth * 10) / 10 })),
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
      openJobs: county.openJobs ?? metro.openJobs,
      medianWage: county.medianWage ?? metro.medianWage,
      transitAccessibleShare: county.transitAccessibleJobShare ?? metro.transitAccessibleShare,
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
    coverage: "Wisconsin statewide — all 72 counties from WisConomy; QCEW where the feed responds",
    confidence: "high",
    methodology:
      "State unemployment from BLS LAUS when available, otherwise the WisConomy county average. County rates from WisConomy (DWD). Employment and wages from BLS QCEW Q4 2024 when the county file loads. Open jobs estimated at ~3% of QCEW employment (JOLTS-style proxy) only when QCEW employment exists. Cost of living and transit coverage are omitted until a live source is wired.",
  };
}

export type LiveEconomyData = Awaited<ReturnType<typeof fetchLiveEconomyData>>;
