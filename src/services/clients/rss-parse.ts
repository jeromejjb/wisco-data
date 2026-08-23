import type { AreaNewsItem } from "@/lib/news-types";

export function parseRssItems(
  xml: string,
  limit: number,
  source: AreaNewsItem["source"],
  idPrefix: string
): AreaNewsItem[] {
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

    const summary = decodeXmlEntities(description?.[1] ?? description?.[2] ?? "")
      .replace(/<[^>]+>/g, "")
      .slice(0, 320)
      .trim();

    items.push({
      id: `${idPrefix}-${Buffer.from(rawTitle).toString("base64url").slice(0, 16)}`,
      title: decodeXmlEntities(rawTitle),
      summary: summary || undefined,
      url: link?.[1]?.trim(),
      publishedAt: pubDate?.[1]?.trim(),
      source,
      publisher: idPrefix,
    });
  }

  return items;
}

function decodeXmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}
