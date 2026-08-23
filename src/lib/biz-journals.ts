/** Wisconsin business journals & economic-development RSS sources. */

export type BizJournalFeed = {
  id: string;
  name: string;
  /** Direct RSS when available */
  url?: string;
  /** Google News RSS when direct feed is blocked or unavailable */
  googleQuery?: string;
  regions: string[];
  /** Empty = statewide; otherwise primary counties covered */
  countyIds: string[];
};

export const WI_BIZ_JOURNAL_FEEDS: BizJournalFeed[] = [
  {
    id: "wisbusiness",
    name: "WisBusiness",
    url: "https://www.wisbusiness.com/feed/",
    regions: ["Statewide"],
    countyIds: [],
  },
  {
    id: "biztimes",
    name: "BizTimes Milwaukee",
    url: "https://biztimes.com/feed/",
    regions: ["Milwaukee", "Southeast Wisconsin"],
    countyIds: ["milwaukee", "waukesha", "racine"],
  },
  {
    id: "bizj-milwaukee",
    name: "Milwaukee Business Journal",
    googleQuery:
      "site:bizjournals.com/milwaukee (expansion OR hiring OR relocation OR company OR jobs OR headquarters)",
    regions: ["Milwaukee", "Southeast Wisconsin"],
    countyIds: ["milwaukee", "waukesha", "racine", "kenosha"],
  },
  {
    id: "biz-madison",
    name: "Madison business news",
    googleQuery:
      "Madison Wisconsin (WisBusiness OR company expansion OR hiring OR relocation OR business journal)",
    regions: ["Madison"],
    countyIds: ["dane"],
  },
  {
    id: "biz-green-bay",
    name: "Green Bay business news",
    googleQuery:
      "Green Bay Wisconsin (company expansion OR hiring OR relocation OR business journal OR WisBusiness OR jobs)",
    regions: ["Green Bay", "Northeast Wisconsin"],
    countyIds: ["brown"],
  },
  {
    id: "biz-fox-valley",
    name: "Fox Valley business news",
    googleQuery:
      "(Appleton OR Oshkosh) Wisconsin (company expansion OR hiring OR business journal OR jobs)",
    regions: ["Fox Valley"],
    countyIds: ["outagamie", "winnebago"],
  },
  {
    id: "biz-eau-claire",
    name: "Eau Claire business news",
    googleQuery: "Eau Claire Wisconsin (company expansion OR hiring OR business journal OR jobs)",
    regions: ["Eau Claire"],
    countyIds: ["eau-claire"],
  },
  {
    id: "biz-la-crosse",
    name: "La Crosse business news",
    googleQuery:
      "La Crosse Wisconsin (company expansion OR hiring OR relocation OR business journal OR jobs OR WisBusiness)",
    regions: ["La Crosse", "Coulee Region"],
    countyIds: ["la-crosse"],
  },
];

export function feedsForCounty(countyId: string): BizJournalFeed[] {
  return WI_BIZ_JOURNAL_FEEDS.filter(
    (f) => f.countyIds.length === 0 || f.countyIds.includes(countyId)
  );
}

export function googleNewsRssUrl(query: string): string {
  return `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-US&gl=US&ceid=US:en`;
}

/** Google News RSS — regional business development (no API key). */
export function regionalBizGoogleRssUrl(displayName: string): string {
  const q = `${displayName} Wisconsin (company OR expansion OR hiring OR relocation OR jobs OR "business journal" OR WisBusiness OR BizTimes)`;
  return googleNewsRssUrl(q);
}

/** Headlines about moves, growth, and workforce changes. */
export const BIZ_DEVELOPMENT_PATTERN =
  /\b(relocat|moving to|move to|moves to|expand|expansion|new (facility|plant|office|headquarters|hq)|headquarter|groundbreak|invest(?:ment|s|ing)?|million|jobs? (?:created|added|growth)|hiring|workforce|layoff|opens in|coming to|bringing \d+|economic development|company (?:move|announc)|development deal|commercial real estate)\b/i;

export function isBizDevelopmentStory(text: string): boolean {
  return BIZ_DEVELOPMENT_PATTERN.test(text);
}

export function scoreBizStoryForArea(
  text: string,
  area: { displayName: string; countyId: string }
): number {
  const lower = text.toLowerCase();
  let score = isBizDevelopmentStory(text) ? 3 : 0;

  if (lower.includes(area.displayName.toLowerCase())) score += 4;
  if (lower.includes(area.countyId.replace("-", " "))) score += 2;

  const feed = WI_BIZ_JOURNAL_FEEDS.find((f) => f.countyIds.includes(area.countyId));
  if (feed && lower.includes(feed.regions[0]?.toLowerCase() ?? "")) score += 1;

  if (/\b(wisconsin|statewide)\b/i.test(lower)) score += 1;

  return score;
}

/** Drop headlines that name another metro but not the viewer's area (e.g. BizTimes on a La Crosse search). */
export function isBizStoryRelevantToArea(
  text: string,
  area: { displayName: string; countyId: string }
): boolean {
  const lower = text.toLowerCase();
  const areaTokens = [area.displayName.toLowerCase(), area.countyId.replace(/-/g, " ")].filter(
    (t) => t.length > 2
  );
  if (areaTokens.some((t) => lower.includes(t))) return true;

  const otherMetros: Array<{ countyIds: string[]; pattern: RegExp }> = [
    {
      countyIds: ["milwaukee", "waukesha", "racine", "kenosha"],
      pattern: /\b(milwaukee|biztimes|southeast wisconsin|milwaukee business journal)\b/i,
    },
    { countyIds: ["dane"], pattern: /\bmadison\b/i },
    { countyIds: ["brown"], pattern: /\bgreen bay\b/i },
    { countyIds: ["outagamie", "winnebago"], pattern: /\b(appleton|oshkosh|fox valley)\b/i },
    { countyIds: ["eau-claire"], pattern: /\beau claire\b/i },
    { countyIds: ["la-crosse"], pattern: /\bla crosse\b/i },
  ];

  for (const { countyIds, pattern } of otherMetros) {
    if (countyIds.includes(area.countyId)) continue;
    if (pattern.test(text)) return false;
  }

  return true;
}
