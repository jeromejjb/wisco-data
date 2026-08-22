import { cached } from "@/lib/cache";

export async function fetchCensusCounties() {
  const key = process.env.CENSUS_API_KEY;
  if (!key) return null;

  return cached("census:counties", 7 * 24 * 60 * 60 * 1000, async () => {
    const url = new URL("https://api.census.gov/data/2023/acs/acs5");
    url.searchParams.set("get", "NAME,B01001_001E,B19013_001E,B23025_002E,B23025_005E");
    url.searchParams.set("for", "county:*");
    url.searchParams.set("in", "state:55");
    url.searchParams.set("key", key);

    const res = await fetch(url.toString(), { next: { revalidate: 604800 } });
    if (!res.ok) throw new Error(`Census API ${res.status}`);

    const rows = (await res.json()) as string[][];
    const headers = rows[0];
    return rows.slice(1).map((row) => {
      const record = Object.fromEntries(headers.map((h, i) => [h, row[i]]));
      const income = parseInt(record.B19013_001E, 10);
      return {
        name: record.NAME as string,
        population: parseInt(record.B01001_001E, 10),
        medianHouseholdIncome: income > 0 ? income : null,
        laborForce: parseInt(record.B23025_002E, 10) || null,
        unemployed: parseInt(record.B23025_005E, 10) || null,
        state: record.state,
        county: record.county,
      };
    });
  });
}

export async function fetchFredSeries(seriesId: string, limit = 24) {
  const key = process.env.FRED_API_KEY;
  if (!key) return null;

  return cached(`fred:${seriesId}:${limit}`, 6 * 60 * 60 * 1000, async () => {
    const url = new URL("https://api.stlouisfed.org/fred/series/observations");
    url.searchParams.set("series_id", seriesId);
    url.searchParams.set("api_key", key);
    url.searchParams.set("file_type", "json");
    url.searchParams.set("sort_order", "desc");
    url.searchParams.set("limit", String(limit));

    const res = await fetch(url.toString(), { next: { revalidate: 86400 } });
    if (!res.ok) throw new Error(`FRED API ${res.status}`);

    const data = await res.json();
    return (data.observations ?? [])
      .filter((o: { value: string }) => o.value !== ".")
      .map((o: { date: string; value: string }) => ({
        date: o.date,
        value: parseFloat(o.value),
      }))
      .reverse();
  });
}
