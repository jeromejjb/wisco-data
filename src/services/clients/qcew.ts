import { cached } from "@/lib/cache";
import { WI_COUNTIES } from "@/lib/wi-counties";

export type QcewCountySnapshot = {
  fips: string;
  countyId: string;
  countyName: string;
  employment: number;
  avgWeeklyWage: number;
  establishments: number;
  wageChangeYoY: number | null;
  employmentChangeYoY: number | null;
};

function parseQcewCsv(csv: string): QcewCountySnapshot | null {
  const lines = csv.trim().split("\n");
  if (lines.length < 2) return null;

  // Total all industries, all ownerships: industry_code 10, agglvl_code 70 (county) or 50 (state)
  const row = lines
    .slice(1)
    .find((line) => {
      const cols = parseCsvLine(line);
      return cols[2] === "10" && (cols[3] === "70" || cols[3] === "50");
    });

  if (!row) return null;
  const cols = parseCsvLine(row);
  const fips = cols[0];

  return {
    fips,
    countyId: WI_COUNTIES.find((c) => c.fips === fips)?.id ?? fips,
    countyName: WI_COUNTIES.find((c) => c.fips === fips)?.name ?? `County ${fips}`,
    employment: parseInt(cols[9], 10) || parseInt(cols[10], 10) || 0,
    avgWeeklyWage: parseInt(cols[15], 10) || 0,
    establishments: parseInt(cols[8], 10) || 0,
    wageChangeYoY: cols[41] ? parseFloat(cols[41]) : null,
    employmentChangeYoY: cols[29] ? parseFloat(cols[29]) : null,
  };
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (const char of line) {
    if (char === '"') inQuotes = !inQuotes;
    else if (char === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else current += char;
  }
  result.push(current);
  return result;
}

async function fetchCountyQcew(fips: string, year = 2024, quarter = 4) {
  const url = `https://data.bls.gov/cew/data/api/${year}/${quarter}/area/${fips.slice(-5)}.csv`;
  const res = await fetch(url, { next: { revalidate: 86400 } });
  if (!res.ok) return null;
  const csv = await res.text();
  return parseQcewCsv(csv);
}

export async function fetchQcewCounties() {
  return cached("qcew:counties", 24 * 60 * 60 * 1000, async () => {
    const results = await Promise.all(
      WI_COUNTIES.map(async (county) => {
        const data = await fetchCountyQcew(county.fips);
        if (!data) return null;
        return { ...data, countyId: county.id, countyName: county.name };
      })
    );
    return results.filter(Boolean) as QcewCountySnapshot[];
  });
}

export async function fetchQcewStatewide() {
  return cached("qcew:state", 24 * 60 * 60 * 1000, async () => {
    return fetchCountyQcew("55000");
  });
}

export async function fetchQcewIndustryBreakdown() {
  return cached("qcew:industries", 24 * 60 * 60 * 1000, async () => {
    const url = "https://data.bls.gov/cew/data/api/2024/4/area/55000.csv";
    const res = await fetch(url, { next: { revalidate: 86400 } });
    if (!res.ok) throw new Error("QCEW industry fetch failed");
    const csv = await res.text();

    const industryNames: Record<string, string> = {
      "1021": "Trade & Transportation",
      "1022": "Information",
      "1023": "Financial Activities",
      "1024": "Professional & Business",
      "1025": "Education & Health",
      "1026": "Leisure & Hospitality",
      "1027": "Other Services",
      "1028": "Government",
      "1029": "Natural Resources & Mining",
      "10210": "Construction",
      "10211": "Manufacturing",
    };

    const rows = csv.trim().split("\n").slice(1);
    const industries = rows
      .filter((line) => {
        const cols = parseCsvLine(line);
        return cols[0] === "55000" && cols[3] === "54" && cols[2].startsWith("10");
      })
      .map((line) => {
        const cols = parseCsvLine(line);
        const code = cols[2];
        const employment = parseInt(cols[9], 10) || 0;
        const growth = cols[29] ? parseFloat(cols[29]) : 0;
        return {
          code,
          name: industryNames[code] ?? `Industry ${code}`,
          employment,
          growth,
        };
      })
      .filter((i) => i.employment > 10000)
      .sort((a, b) => b.employment - a.employment)
      .slice(0, 8);

    const total = industries.reduce((s, i) => s + i.employment, 0);
    return industries.map((i) => ({
      name: i.name,
      value: Math.round((i.employment / total) * 1000) / 10,
      growth: i.growth,
      employment: i.employment,
    }));
  });
}
