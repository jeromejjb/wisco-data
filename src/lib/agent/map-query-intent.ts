import type { ChoroplethMetric } from "./map-actions";
import { WI_COUNTIES } from "@/lib/wi-counties";
import { countyIdsFromText } from "@/lib/county-lookup";
import { matchCityInText } from "@/lib/user-area";
import { COMMUTE_POLICY } from "@/lib/commute-policy";

export type MapQueryIntent = {
  metric?: ChoroplethMetric;
  flyToCountyId?: string;
  highlightCountyIds?: string[];
  searchJobs?: {
    keyword?: string;
    location?: string;
    transitOnly?: boolean;
    maxCommute?: number;
  };
  /** Pull Wisconsin business journal feeds (moves, expansions, job growth). */
  bizJournalNews?: boolean;
  transitMetro?: "milwaukee" | "madison" | "both";
};

const JOB_ROLE_PATTERNS: { pattern: RegExp; keyword: string }[] = [
  { pattern: /\bcna\b/i, keyword: "CNA" },
  { pattern: /\b(registered nurse|rn\b|lpn\b|nurs(e|ing))\b/i, keyword: "nurse" },
  { pattern: /\b(medical assistant|healthcare|hospital)\b/i, keyword: "healthcare" },
  { pattern: /\b(manufactur|factory|assembly)\b/i, keyword: "manufacturing" },
  { pattern: /\b(warehouse|logistics|driver|cdl)\b/i, keyword: "warehouse" },
  { pattern: /\b(teacher|education|school)\b/i, keyword: "education" },
  { pattern: /\b(software|developer|tech|it )\b/i, keyword: "technology" },
  { pattern: /\b(cashier|retail|store)\b/i, keyword: "retail" },
];

function resolveCountyToken(token: string): string | undefined {
  const n = token.trim().toLowerCase().replace(/\s+county$/i, "");
  const featured = WI_COUNTIES.find(
    (c) =>
      c.id === n ||
      c.name.toLowerCase().includes(n) ||
      n.includes(c.name.split(" ")[0].toLowerCase())
  )?.id;
  if (featured) return featured;
  return countyIdsFromText(token)[0];
}

function extractJobKeyword(text: string): string | undefined {
  for (const { pattern, keyword } of JOB_ROLE_PATTERNS) {
    if (pattern.test(text)) return keyword;
  }

  const workIn = text.match(/\b(?:work|working)\s+in\s+([a-z][a-z\s-]{1,28})/i);
  if (workIn?.[1]) {
    const field = workIn[1].trim().replace(/\s+(jobs?|roles?|positions?)$/i, "");
    if (field.length >= 2 && field.length <= 28) {
      for (const { pattern, keyword } of JOB_ROLE_PATTERNS) {
        if (pattern.test(field)) return keyword;
      }
      return field;
    }
  }

  const workAs = text.match(/\b(?:work|working)\s+as\s+(?:a\s+)?([a-z][a-z\s-]{1,28})/i);
  if (workAs?.[1]) {
    const role = workAs[1].trim().replace(/\s+(jobs?|roles?|positions?)$/i, "");
    if (role.length >= 2 && role.length <= 28) return role;
  }

  const quoted = text.match(/(?:as a|for a|find)\s+([a-z0-9\s]{2,24}?)(?:\s+(?:in|near|around|that|on|with)|$)/i);
  if (quoted?.[1]) {
    const cleaned = quoted[1].trim().replace(/\s+(job|role|position)s?$/i, "");
    if (cleaned.length >= 2 && cleaned.length <= 24) return cleaned;
  }
  return undefined;
}

function wantsJobSearch(text: string, jobKeyword?: string): boolean {
  if (jobKeyword) return true;
  return (
    /\b(jobs?|careers?|employment|hiring|looking for work|need a job|work as|work in|working in|i work)\b/i.test(
      text
    ) ||
    /\b(nursing|nurse|cna|healthcare|lpn|rn)\b/i.test(text)
  );
}

function wantsBizJournalNews(text: string): boolean {
  return (
    /\b(biz\s?journals?|business journals?|wisbusiness|biztimes|company mov|companies mov|relocat|relocation|expansion|job growth|economic development|new headquarters|new hq|bringing \d+|groundbreak|opening (?:a|new)|business news)\b/i.test(
      text
    )
  );
}

function wantsTransit(text: string): boolean {
  return /\b(bus|buses|transit|mcts|metro|commute|train|public transport)\b/i.test(text);
}

export function inferMapQueryIntent(text: string): MapQueryIntent | null {
  const lower = text.toLowerCase().trim();
  if (!lower) return null;

  const intent: MapQueryIntent = {};

  if (/\b(opportunity|opportunity index|labor market strength)\b/.test(lower)) {
    intent.metric = "opportunity";
  } else if (/\b(unemployment|jobless|u\.?3)\b/.test(lower)) {
    intent.metric = "unemployment";
  } else if (/\b(wage|salary|pay|income)\b/.test(lower) && !/\b(job|hiring|cna|nurse)\b/.test(lower)) {
    intent.metric = "median-wage";
  } else if (/\b(openings?|open jobs)\b/.test(lower) && !extractJobKeyword(lower)) {
    intent.metric = "open-jobs";
  } else if (/\btransit\b/.test(lower) && /\b(county|coverage|reach)\b/.test(lower)) {
    intent.metric = "transit-coverage";
  }

  const jobKeyword = extractJobKeyword(lower);
  const jobSeeking = wantsJobSearch(lower, jobKeyword);

  const cityMatch = matchCityInText(lower);
  const countyIds = countyIdsFromText(lower);

  if (jobSeeking) {
    const countyLabel = countyIds[0]
      ? `${WI_COUNTIES.find((c) => c.id === countyIds[0])?.name.replace(" County", "") ?? countyIds[0]}, WI`
      : undefined;
    intent.searchJobs = {
      keyword: jobKeyword,
      location: cityMatch?.cityLabel ?? countyLabel,
      transitOnly: wantsTransit(lower),
      maxCommute: COMMUTE_POLICY.recommendedMaxMinutes,
    };
  }

  if (cityMatch) intent.flyToCountyId = cityMatch.countyId;
  else if (!intent.flyToCountyId && countyIds[0]) intent.flyToCountyId = countyIds[0];
  else if (/\b(kenosha|racine)\b/.test(lower)) {
    intent.highlightCountyIds = ["kenosha", "racine"].filter(
      (id) => lower.includes(id.replace("-", " ")) || lower.includes(id)
    );
  }

  const compareMatch = lower.match(/compare\s+(.+?)\s+(?:vs|versus|and|to)\s+(.+)/);
  if (compareMatch) {
    const a = resolveCountyToken(compareMatch[1]);
    const b = resolveCountyToken(compareMatch[2]);
    if (a && b) intent.highlightCountyIds = [a, b];
    if (!intent.metric) intent.metric = "unemployment";
  }

  if (/\b(fly to|zoom to|show me|go to)\b/.test(lower)) {
    const found = countyIdsFromText(lower)[0];
    if (found) intent.flyToCountyId = found;
  }

  if (wantsBizJournalNews(lower)) intent.bizJournalNews = true;

  if (wantsTransit(lower)) {
    const transitCountyId = cityMatch?.countyId ?? countyIds[0];
    if (/\b(milwaukee|mcts)\b/.test(lower)) intent.transitMetro = "milwaukee";
    else if (/\bmadison\b/.test(lower)) intent.transitMetro = "madison";
    else if (transitCountyId === "milwaukee" || transitCountyId === "waukesha") {
      intent.transitMetro = "milwaukee";
    } else if (transitCountyId === "dane") intent.transitMetro = "madison";
    else intent.transitMetro = "both";
  }

  const hasSignal =
    intent.metric ||
    intent.flyToCountyId ||
    intent.highlightCountyIds?.length ||
    intent.searchJobs ||
    intent.bizJournalNews ||
    intent.transitMetro;

  return hasSignal ? intent : null;
}
