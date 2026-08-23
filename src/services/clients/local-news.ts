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
import { fetchBizJournalNews } from "@/services/clients/biz-journals";
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

export async function fetchAreaNewsBundle(
  area: UserArea,
  limit = 6,
  opts?: { includeBizJournals?: boolean; bizDevelopmentOnly?: boolean }
): Promise<AreaNewsBundle> {
  const includeBiz = opts?.includeBizJournals !== false;
  const cacheKey = `news-bundle:${area.countyId}:${limit}:${includeBiz ? "biz" : "no-biz"}:${opts?.bizDevelopmentOnly ? "dev" : "all"}`;
  return cached(cacheKey, 30 * 60 * 1000, async () => {
    const sources: string[] = [];
    const gnewsKey = process.env.GNEWS_API_KEY?.trim();

    let rawItems: AreaNewsItem[] = [];
    let bizJournalItems: AreaNewsItem[] = [];
    let bizJournalSources: string[] = [];

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

    if (includeBiz) {
      const biz = await fetchBizJournalNews(area, limit, {
        developmentOnly: opts?.bizDevelopmentOnly,
      });
      bizJournalItems = biz.items;
      bizJournalSources = biz.sources;
      if (biz.sources.length) sources.push(...biz.sources);
      rawItems.push(...biz.items);
    }

    rawItems = dedupeNews([...rawItems, ...rssItems]).slice(0, limit + (includeBiz ? 4 : 0));
    const items = rawItems.map((item) => enrichItem(item, area));
    const mapPins = toMapPins(items);

    const sentiment = items.length
      ? await analyzeAreaSentiment(area, items)
      : null;

    return {
      items,
      sentiment,
      mapPins,
      bizJournalItems: bizJournalItems.map((item) => enrichItem(item, area)),
      meta: {
        sources: sources.length ? [...new Set(sources)] : ["none"],
        gnewsConfigured: Boolean(gnewsKey),
        sentimentAvailable: Boolean(sentiment),
        bizJournalSources,
      },
    };
  });
}

/** @deprecated use fetchAreaNewsBundle */
export async function fetchAreaNews(area: UserArea, limit = 5): Promise<AreaNewsItem[]> {
  const bundle = await fetchAreaNewsBundle(area, limit);
  return bundle.items;
}
