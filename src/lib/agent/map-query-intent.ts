import type { ChoroplethMetric } from "./map-actions";
import { WI_COUNTIES } from "@/lib/wi-counties";
import { countiesFromText } from "./map-query-intent-utils";

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
  transitMetro?: "milwaukee" | "madison" | "both";
};

const JOB_ROLE_PATTERNS: { pattern: RegExp; keyword: string }[] = [
  { pattern: /\bcna\b/i, keyword: "CNA" },
  { pattern: /\b(registered nurse|rn\b|lpn\b|nurse)\b/i, keyword: "nurse" },
  { pattern: /\b(medical assistant|healthcare|hospital)\b/i, keyword: "healthcare" },
  { pattern: /\b(manufactur|factory|assembly)\b/i, keyword: "manufacturing" },
  { pattern: /\b(warehouse|logistics|driver|cdl)\b/i, keyword: "warehouse" },
  { pattern: /\b(teacher|education|school)\b/i, keyword: "education" },
  { pattern: /\b(software|developer|tech|it )\b/i, keyword: "technology" },
  { pattern: /\b(cashier|retail|store)\b/i, keyword: "retail" },
];

function resolveCountyToken(token: string): string | undefined {
  const n = token.trim().toLowerCase().replace(/\s+county$/i, "");
  return WI_COUNTIES.find(
    (c) =>
      c.id === n ||
      c.name.toLowerCase().includes(n) ||
      n.includes(c.name.split(" ")[0].toLowerCase())
  )?.id;
}

function extractJobKeyword(text: string): string | undefined {
  for (const { pattern, keyword } of JOB_ROLE_PATTERNS) {
    if (pattern.test(text)) return keyword;
  }
  const quoted = text.match(/(?:as a|for a|find)\s+([a-z0-9\s]{2,24}?)(?:\s+(?:in|near|around|that|on|with)|$)/i);
  if (quoted?.[1]) {
    const cleaned = quoted[1].trim().replace(/\s+(job|role|position)s?$/i, "");
    if (cleaned.length >= 2 && cleaned.length <= 24) return cleaned;
  }
  return undefined;
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
  const jobSeeking =
    /\b(jobs?|career|employment|hiring|looking for work|need a job|work as)\b/.test(lower) ||
    Boolean(jobKeyword);

  if (jobSeeking) {
    intent.searchJobs = {
      keyword: jobKeyword,
      location: countiesFromText(lower)[0],
      transitOnly: false,
      maxCommute: wantsTransit(lower) ? 60 : undefined,
    };
  }

  if (/\b(madison|dane)\b/.test(lower)) intent.flyToCountyId = "dane";
  else if (/\bmilwaukee\b/.test(lower)) intent.flyToCountyId = "milwaukee";
  else if (/\bgreen bay\b/.test(lower)) intent.flyToCountyId = "brown";
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
    const found = countiesFromText(lower)[0];
    if (found) intent.flyToCountyId = found;
  }

  if (wantsTransit(lower)) {
    if (/\b(milwaukee|mcts)\b/.test(lower)) intent.transitMetro = "milwaukee";
    else if (/\bmadison\b/.test(lower)) intent.transitMetro = "madison";
    else if (intent.searchJobs) intent.transitMetro = "milwaukee";
    else intent.transitMetro = "both";
  }

  const hasSignal =
    intent.metric ||
    intent.flyToCountyId ||
    intent.highlightCountyIds?.length ||
    intent.searchJobs ||
    intent.transitMetro;

  return hasSignal ? intent : null;
}
