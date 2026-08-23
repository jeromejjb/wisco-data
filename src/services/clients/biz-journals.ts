import { cached } from "@/lib/cache";
import {
  feedsForCounty,
  googleNewsRssUrl,
  isBizDevelopmentStory,
  isBizStoryRelevantToArea,
  regionalBizGoogleRssUrl,
  scoreBizStoryForArea,
} from "@/lib/biz-journals";
import type { AreaNewsItem } from "@/lib/news-types";
import type { UserArea } from "@/lib/user-area";
import { parseRssItems } from "@/services/clients/rss-parse";

const FETCH_HEADERS = { "User-Agent": "WisconsinWorkways/1.0 (+https://wiscoworkways.app)" };

async function fetchFeedXml(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: FETCH_HEADERS,
      next: { revalidate: 1800 },
    });
    if (!res.ok) return null;
    return await res.text();
  } catch (e) {
    console.warn("Biz journal RSS failed:", url, e);
    return null;
  }
}

async function fetchFromFeed(
  feed: ReturnType<typeof feedsForCounty>[number],
  limit: number
): Promise<AreaNewsItem[]> {
  const urls: string[] = [];
  if (feed.url) urls.push(feed.url);
  if (feed.googleQuery) urls.push(googleNewsRssUrl(feed.googleQuery));

  const items: AreaNewsItem[] = [];
  for (const url of urls) {
    const xml = await fetchFeedXml(url);
    if (!xml) continue;
    items.push(
      ...parseRssItems(xml, limit, "biz-journal", feed.id).map((item) => ({
        ...item,
        publisher: feed.name,
      }))
    );
    if (items.length >= limit) break;
  }
  return items;
}

export async function fetchBizJournalNews(
  area: UserArea,
  limit = 8,
  opts?: { developmentOnly?: boolean }
): Promise<{ items: AreaNewsItem[]; sources: string[] }> {
  const cacheKey = `biz-journals:${area.countyId}:${limit}:${opts?.developmentOnly ? "dev" : "all"}`;
  return cached(cacheKey, 30 * 60 * 1000, async () => {
    const sources: string[] = [];
    const raw: AreaNewsItem[] = [];

    const feeds = feedsForCounty(area.countyId);
    const feedResults = await Promise.all(feeds.map((feed) => fetchFromFeed(feed, limit)));
    for (let i = 0; i < feeds.length; i++) {
      const parsed = feedResults[i] ?? [];
      if (parsed.length) {
        sources.push(feeds[i]!.name);
        raw.push(...parsed);
      }
    }

    const googleUrl = regionalBizGoogleRssUrl(area.displayName);
    const googleXml = await fetchFeedXml(googleUrl);
    if (googleXml) {
      const parsed = parseRssItems(googleXml, limit, "biz-journal", "google-biz").map((item) => ({
        ...item,
        publisher: "Google News · Business",
      }));
      if (parsed.length) sources.push(`${area.displayName} business (Google News)`);
      raw.push(...parsed);
    }

    const seen = new Set<string>();
    const scored = raw
      .filter((item) => {
        const blob = `${item.title} ${item.summary ?? ""}`;
        if (opts?.developmentOnly && !isBizDevelopmentStory(blob)) return false;
        if (!isBizStoryRelevantToArea(blob, area)) return false;
        const key = item.title.toLowerCase().slice(0, 80);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .map((item) => ({
        item,
        score: scoreBizStoryForArea(`${item.title} ${item.summary ?? ""}`, area),
      }))
      .sort((a, b) => b.score - a.score);

    const items = scored.slice(0, limit).map((s) => s.item);

    return { items, sources: [...new Set(sources)] };
  });
}
