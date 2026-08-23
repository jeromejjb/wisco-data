import type { UserArea } from "@/lib/user-area";
import { matchCityInText, userAreaFromCountyId } from "@/lib/user-area";
import { countyIdsFromText } from "@/lib/county-lookup";
import type { Coordinates } from "@/lib/types";
import type { NewsTopic, NewsTone } from "@/lib/news-types";

const TOPIC_KEYWORDS: Record<NewsTopic, RegExp> = {
  jobs: /\b(hir(e|ing)|job|layoff|workforce|employ|plant|factory|union|wage|relocat|expansion|headquarter)\b/i,
  economy: /\b(budget|tax|gdp|unemploy|inflation|econom|market|invest|grant)\b/i,
  civic: /\b(council|mayor|school|election|vote|legislat|capitol|state)\b/i,
  community: /\b(housing|transit|park|neighborhood|health|hospital|crime|fire)\b/i,
  general: /.*/,
};

export function inferNewsTopic(text: string): NewsTopic {
  const order: NewsTopic[] = ["jobs", "economy", "civic", "community"];
  for (const topic of order) {
    if (TOPIC_KEYWORDS[topic].test(text)) return topic;
  }
  return "general";
}

const POSITIVE = /\b(hire|hiring|growth|expand|expansion|award|grant|boom|record|gain|opens|celebrat|relocat|invest|jobs?\s+added|new (facility|plant|office))\b/i;
const NEGATIVE = /\b(layoff|cut|crisis|crime|shoot|death|strike|shortage|deficit|closure|fail)\b/i;

export function inferNewsTone(text: string): NewsTone {
  const pos = POSITIVE.test(text);
  const neg = NEGATIVE.test(text);
  if (pos && !neg) return "upbeat";
  if (neg && !pos) return "concerned";
  if (pos && neg) return "mixed";
  if (/\b(caution|concern|debate|mixed|uncertain)\b/i.test(text)) return "cautious";
  return "mixed";
}

export function briefHeadline(title: string, max = 52): string {
  const clean = title.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  const slice = clean.slice(0, max - 1);
  const lastSpace = slice.lastIndexOf(" ");
  return `${(lastSpace > 24 ? slice.slice(0, lastSpace) : slice).trim()}…`;
}

export function locateNewsInWisconsin(
  text: string,
  fallback: UserArea
): { countyId: string; countyName: string; coordinates: Coordinates } {
  const cityMatch = matchCityInText(text);
  if (cityMatch) {
    const area = userAreaFromCountyId(cityMatch.countyId);
    return {
      countyId: area.countyId,
      countyName: area.displayName,
      coordinates: { lat: area.lat, lng: area.lng },
    };
  }

  const [countyId] = countyIdsFromText(text);
  if (countyId) {
    const area = userAreaFromCountyId(countyId);
    return {
      countyId: area.countyId,
      countyName: area.displayName,
      coordinates: { lat: area.lat, lng: area.lng },
    };
  }

  return {
    countyId: fallback.countyId,
    countyName: fallback.displayName,
    coordinates: { lat: fallback.lat, lng: fallback.lng },
  };
}

export function jitterCoordinates(
  coords: Coordinates,
  index: number,
  total: number
): Coordinates {
  if (total <= 1) return coords;
  const angle = (index / total) * Math.PI * 2;
  const radius = 0.06 + (index % 3) * 0.02;
  return {
    lat: coords.lat + Math.sin(angle) * radius,
    lng: coords.lng + Math.cos(angle) * radius,
  };
}

export function topicLabel(topic: NewsTopic): string {
  return (
    {
      jobs: "Jobs",
      economy: "Economy",
      civic: "Civic",
      community: "Community",
      general: "Local",
    }[topic] ?? "Local"
  );
}

export function toneColor(tone: NewsTone): string {
  return (
    {
      upbeat: "#2a9d6a",
      mixed: "#c4923a",
      cautious: "#8b7d6b",
      concerned: "#c45c4a",
    }[tone] ?? "#c4923a"
  );
}
