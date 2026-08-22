import { cached } from "@/lib/cache";
import type { AreaNewsItem } from "@/lib/news-types";
import type { UserArea } from "@/lib/user-area";

type GNewsResponse = {
  totalArticles?: number;
  articles?: Array<{
    title: string;
    description?: string;
    content?: string;
    url: string;
    image?: string;
    publishedAt: string;
    source?: { name?: string; url?: string };
  }>;
  errors?: string[];
};

export async function fetchGNewsArticles(area: UserArea, limit = 8) {
  const apiKey = process.env.GNEWS_API_KEY?.trim();
  if (!apiKey) {
    return { items: [] as AreaNewsItem[], error: "GNEWS_API_KEY not configured" };
  }

  const place = area.displayName || area.countyName;
  const query = `"${place}" Wisconsin (jobs OR economy OR workforce OR hiring OR budget)`;
  const cacheKey = `gnews:${area.countyId}:${limit}`;

  return cached(cacheKey, 30 * 60 * 1000, async () => {
    try {
      const url = new URL("https://gnews.io/api/v4/search");
      url.searchParams.set("q", query);
      url.searchParams.set("lang", "en");
      url.searchParams.set("country", "us");
      url.searchParams.set("max", String(Math.min(limit, 10)));
      url.searchParams.set("sortby", "publishedAt");
      url.searchParams.set("apikey", apiKey);

      const res = await fetch(url.toString(), { next: { revalidate: 1800 } });
      if (!res.ok) {
        return { items: [] as AreaNewsItem[], error: `GNews ${res.status}` };
      }

      const data = (await res.json()) as GNewsResponse;
      if (data.errors?.length) {
        return { items: [] as AreaNewsItem[], error: data.errors.join(", ") };
      }

      const items: AreaNewsItem[] = (data.articles ?? []).map((a) => ({
        id: `gnews-${Buffer.from(a.url).toString("base64url").slice(0, 18)}`,
        title: a.title,
        summary: a.description?.slice(0, 280),
        url: a.url,
        publishedAt: a.publishedAt,
        source: "gnews" as const,
      }));

      return { items, error: null };
    } catch (err) {
      return { items: [] as AreaNewsItem[], error: `GNews network: ${String(err)}` };
    }
  });
}
