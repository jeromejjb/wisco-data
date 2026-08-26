import * as XLSX from "xlsx";
import { cached } from "@/lib/cache";
import { countyIdFromFips } from "@/lib/wi-counties";
import { WI_COUNTY_NAME_TO_FIPS } from "@/lib/wi-county-fips";

const COUNTY_RATES_URL =
  "https://jobcenterofwisconsin.com/wisconomy/wits_info/downloads/LAUS/uRatesCo.xls";

export type WisConomyCountyRate = {
  name: string;
  countyId?: string;
  employed: number;
  laborForce: number;
  unemployed: number;
  unemploymentRate: number;
};

export async function fetchWisConomyCountyRates() {
  return cached("wisconomy:county-rates", 12 * 60 * 60 * 1000, async () => {
    const res = await fetch(COUNTY_RATES_URL, { cache: "no-store" });
    if (!res.ok) throw new Error(`WisConomy fetch failed: ${res.status}`);

    const buffer = Buffer.from(await res.arrayBuffer());
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<(string | number)[]>(sheet, { header: 1 });

    const headerIdx = rows.findIndex(
      (r) => Array.isArray(r) && r[0] === "Area" && r[4] === "Unemployment Rate"
    );
    if (headerIdx === -1) throw new Error("WisConomy sheet format unexpected");

    const counties: WisConomyCountyRate[] = [];
    for (let i = headerIdx + 1; i < rows.length; i++) {
      const row = rows[i];
      if (!Array.isArray(row) || typeof row[0] !== "string") continue;
      if (!row[0].includes("County")) continue;

      const name = row[0] as string;
      const fips = WI_COUNTY_NAME_TO_FIPS[name];

      counties.push({
        name,
        countyId: fips ? countyIdFromFips(fips) : undefined,
        employed: Number(row[1]) || 0,
        laborForce: Number(row[2]) || 0,
        unemployed: Number(row[3]) || 0,
        unemploymentRate: (Number(row[4]) || 0) * 100,
      });
    }

    return {
      counties,
      fetchedAt: new Date().toISOString(),
      sourceUrl: COUNTY_RATES_URL,
    };
  });
}

export async function fetchWisConomyFeaturedCounties() {
  const data = await fetchWisConomyCountyRates();
  return data.counties.filter((c) => c.countyId);
}
