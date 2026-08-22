import { cached } from "@/lib/cache";

const BLS_V2 = "https://api.bls.gov/publicAPI/v2/timeseries/data/";

export const BLS_SERIES = {
  wiUnemployment: "LASST550000000000003",
  wiEmployment: "SMS55000000000000001",
  wiAvgWeeklyWage: "ENU5500040010",
  usUnemployment: "LASST000000000000003",
} as const;

type BlsPoint = { year: string; period: string; periodName: string; value: string };

type BlsSeriesResult = {
  seriesID: string;
  data: BlsPoint[];
};

async function postBls(seriesIds: string[], startYear: string, endYear: string) {
  const body: Record<string, unknown> = {
    seriesid: seriesIds,
    startyear: startYear,
    endyear: endYear,
  };
  if (process.env.BLS_REGISTRATION_KEY) {
    body.registrationkey = process.env.BLS_REGISTRATION_KEY;
  }

  const res = await fetch(BLS_V2, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    next: { revalidate: 86400 },
  });

  if (!res.ok) throw new Error(`BLS API error: ${res.status}`);
  const json = await res.json();
  if (json.status !== "REQUEST_SUCCEEDED") {
    throw new Error(`BLS request failed: ${JSON.stringify(json.message)}`);
  }
  return json.Results.series as BlsSeriesResult[];
}

export async function fetchBlsUnemploymentTrend() {
  return cached("bls:unemployment-trend", 6 * 60 * 60 * 1000, async () => {
    const year = new Date().getFullYear();
    const series = await postBls(
      [BLS_SERIES.wiUnemployment, BLS_SERIES.usUnemployment],
      String(year - 2),
      String(year)
    );

    const wi = series.find((s) => s.seriesID === BLS_SERIES.wiUnemployment)?.data ?? [];
    const us = series.find((s) => s.seriesID === BLS_SERIES.usUnemployment)?.data ?? [];

    const months = wi
      .filter((d) => d.period.startsWith("M"))
      .slice(0, 12)
      .reverse();

    return months.map((point) => {
      const usPoint = us.find((u) => u.year === point.year && u.period === point.period);
      return {
        month: point.periodName.slice(0, 3),
        wi: parseFloat(point.value),
        us: usPoint ? parseFloat(usPoint.value) : null,
        period: `${point.year}-${point.period}`,
      };
    });
  });
}

export async function fetchBlsStatewideSnapshot() {
  return cached("bls:statewide", 6 * 60 * 60 * 1000, async () => {
    const year = new Date().getFullYear();
    const series = await postBls(
      [BLS_SERIES.wiUnemployment, BLS_SERIES.wiEmployment, BLS_SERIES.wiAvgWeeklyWage],
      String(year - 1),
      String(year)
    );

    const latest = (id: string) =>
      series.find((s) => s.seriesID === id)?.data.find((d) => d.period.startsWith("M"));

    const unemp = latest(BLS_SERIES.wiUnemployment);
    const emp = latest(BLS_SERIES.wiEmployment);
    const wage = latest(BLS_SERIES.wiAvgWeeklyWage);

    const avgWeekly = wage ? parseFloat(wage.value) : null;
    const medianWageEstimate = avgWeekly ? Math.round(avgWeekly * 52 * 0.92) : null;

    return {
      unemploymentRate: unemp ? parseFloat(unemp.value) : null,
      totalEmploymentThousands: emp ? parseFloat(emp.value) : null,
      avgWeeklyWage: avgWeekly,
      medianWageEstimate,
      latestPeriod: unemp ? `${unemp.periodName} ${unemp.year}` : null,
      fetchedAt: new Date().toISOString(),
    };
  });
}
