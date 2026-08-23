import { cached } from "@/lib/cache";
import type { AreaNewsItem } from "@/lib/news-types";
import type { UserArea } from "@/lib/user-area";
import { regionalBizGoogleRssUrl } from "@/lib/biz-journals";
import { parseRssItems } from "@/services/clients/rss-parse";

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
      return parseRssItems(xml, limit, "google-rss", "google");
    } catch (e) {
      console.warn("News RSS fetch failed:", e);
      return [];
    }
  });
}

export { regionalBizGoogleRssUrl };
