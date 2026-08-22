import { cached } from "@/lib/cache";
import type { AreaNewsItem } from "@/lib/news-types";
import {
  briefHeadline,
  inferNewsTopic,
  inferNewsTone,
  jitterCoordinates,
  locateNewsInWisconsin,
  topicLabel,
} from "@/lib/news-geo";
import type { UserArea } from "@/lib/user-area";
import { analyzeAreaSentiment } from "@/services/live/news-sentiment";
import { fetchGNewsArticles } from "@/services/clients/gnews";
import { fetchGoogleNewsRss } from "@/services/clients/news-rss";
import type { AreaNewsBundle, LocalNewsMapPin } from "@/lib/news-types";

function enrichItem(raw: Omit<AreaNewsItem, "topic" | "tone" | "countyId" | "countyName" | "coordinates" | "mapLabel">, area: UserArea): AreaNewsItem {
  const blob = `${raw.title} ${raw.summary ?? ""}`;
  const loc = locateNewsInWisconsin(blob, area);
  const topic = inferNewsTopic(blob);
  const tone = inferNewsTone(blob);
  return {
    ...raw,
    topic,
    tone,
    countyId: loc.countyId,
    countyName: loc.countyName,
    coordinates: loc.coordinates,
    mapLabel: `${topicLabel(topic)} · ${loc.countyName}`,
  };
}

function toMapPins(items: AreaNewsItem[]): LocalNewsMapPin[] {
  return items
    .filter((i) => i.coordinates)
    .map((item, index, arr) => ({
      id: item.id,
      coordinates: jitterCoordinates(item.coordinates!, index, arr.length),
      headline: briefHeadline(item.title, 48),
      blurb: item.summary?.slice(0, 100) ?? briefHeadline(item.title, 80),
      topic: item.topic ?? "general",
      tone: item.tone ?? "mixed",
      url: item.url,
      countyName: item.countyName,
    }));
}

function dedupeNews(items: AreaNewsItem[]): AreaNewsItem[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = item.title.toLowerCase().slice(0, 64);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export async function fetchAreaNewsBundle(area: UserArea, limit = 6): Promise<AreaNewsBundle> {
  const cacheKey = `news-bundle:${area.countyId}:${limit}`;
  return cached(cacheKey, 30 * 60 * 1000, async () => {
    const sources: string[] = [];
    const gnewsKey = process.env.GNEWS_API_KEY?.trim();

    let rawItems: AreaNewsItem[] = [];

    if (gnewsKey) {
      const gnews = await fetchGNewsArticles(area, limit);
      if (gnews.items.length) {
        sources.push("GNews");
        rawItems.push(...gnews.items);
      }
      if (gnews.error) sources.push(`GNews (${gnews.error})`);
    }

    const rssItems = await fetchGoogleNewsRss(area, limit);
    if (rssItems.length) sources.push("Google News RSS");

    rawItems = dedupeNews([...rawItems, ...rssItems]).slice(0, limit);
    const items = rawItems.map((item) => enrichItem(item, area));
    const mapPins = toMapPins(items);

    const sentiment = items.length
      ? await analyzeAreaSentiment(area, items)
      : null;

    return {
      items,
      sentiment,
      mapPins,
      meta: {
        sources: sources.length ? sources : ["none"],
        gnewsConfigured: Boolean(gnewsKey),
        sentimentAvailable: Boolean(sentiment),
      },
    };
  });
}

/** @deprecated use fetchAreaNewsBundle */
export async function fetchAreaNews(area: UserArea, limit = 5): Promise<AreaNewsItem[]> {
  const bundle = await fetchAreaNewsBundle(area, limit);
  return bundle.items;
}
