import { cached } from "@/lib/cache";
import type { AreaNewsItem } from "@/lib/news-types";
import type { UserArea } from "@/lib/user-area";

function parseRssItems(xml: string, limit: number): AreaNewsItem[] {
  const items: AreaNewsItem[] = [];
  const blocks = xml.match(/<item[\s\S]*?<\/item>/gi) ?? [];

  for (const block of blocks.slice(0, limit)) {
    const title = block.match(/<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>|<title>([\s\S]*?)<\/title>/i);
    const link = block.match(/<link>([\s\S]*?)<\/link>/i);
    const pubDate = block.match(/<pubDate>([\s\S]*?)<\/pubDate>/i);
    const description = block.match(
      /<description><!\[CDATA\[([\s\S]*?)\]\]><\/description>|<description>([\s\S]*?)<\/description>/i
    );

    const rawTitle = (title?.[1] ?? title?.[2] ?? "").trim();
    if (!rawTitle) continue;

    const summary = (description?.[1] ?? description?.[2] ?? "")
      .replace(/<[^>]+>/g, "")
      .slice(0, 240)
      .trim();

    items.push({
      id: `rss-${Buffer.from(rawTitle).toString("base64url").slice(0, 16)}`,
      title: rawTitle.replace(/&amp;/g, "&").replace(/&#39;/g, "'"),
      summary: summary || undefined,
      url: link?.[1]?.trim(),
      publishedAt: pubDate?.[1]?.trim(),
      source: "google-rss",
    });
  }

  return items;
}

export async function fetchGoogleNewsRss(area: UserArea, limit = 6): Promise<AreaNewsItem[]> {
  const cacheKey = `news-rss:${area.countyId}:${limit}`;
  return cached(cacheKey, 30 * 60 * 1000, async () => {
    const query = `${area.displayName} Wisconsin jobs economy labor workforce`;
    const rssUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-US&gl=US&ceid=US:en`;

    try {
      const res = await fetch(rssUrl, {
        headers: { "User-Agent": "WisconsinWorkways/1.0" },
        next: { revalidate: 1800 },
      });
      if (!res.ok) return [];
      const xml = await res.text();
      return parseRssItems(xml, limit);
    } catch (e) {
      console.warn("News RSS fetch failed:", e);
      return [];
    }
  });
}
