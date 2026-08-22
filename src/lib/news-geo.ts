import { WI_COUNTIES } from "@/lib/wi-counties";
import type { UserArea } from "@/lib/user-area";
import type { Coordinates } from "@/lib/types";
import type { NewsTopic, NewsTone } from "@/lib/news-types";

const WI_CITIES: { name: string; countyId: string; lat: number; lng: number }[] = [
  { name: "milwaukee", countyId: "milwaukee", lat: 43.0389, lng: -87.9065 },
  { name: "madison", countyId: "dane", lat: 43.0731, lng: -89.4012 },
  { name: "green bay", countyId: "brown", lat: 44.5133, lng: -88.0133 },
  { name: "kenosha", countyId: "kenosha", lat: 42.5847, lng: -87.8212 },
  { name: "racine", countyId: "racine", lat: 42.7261, lng: -87.7829 },
  { name: "appleton", countyId: "outagamie", lat: 44.2619, lng: -88.4154 },
  { name: "eau claire", countyId: "eau-claire", lat: 44.8113, lng: -91.4985 },
  { name: "waukesha", countyId: "waukesha", lat: 43.0117, lng: -88.2315 },
  { name: "oshkosh", countyId: "winnebago", lat: 44.0247, lng: -88.5426 },
  { name: "wausau", countyId: "marathon", lat: 44.9591, lng: -89.6301 },
  { name: "janesville", countyId: "rock", lat: 42.6828, lng: -89.0187 },
  { name: "la crosse", countyId: "la-crosse", lat: 43.8014, lng: -91.2396 },
];

const TOPIC_KEYWORDS: Record<NewsTopic, RegExp> = {
  jobs: /\b(hir(e|ing)|job|layoff|workforce|employ|plant|factory|union|wage)\b/i,
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

const POSITIVE = /\b(hire|hiring|growth|expand|award|grant|boom|record|gain|opens|celebrat)\b/i;
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
  const lower = text.toLowerCase();

  for (const city of WI_CITIES) {
    if (lower.includes(city.name)) {
      const county = WI_COUNTIES.find((c) => c.id === city.countyId);
      return {
        countyId: city.countyId,
        countyName: county?.name.replace(" County", "") ?? city.name,
        coordinates: { lat: city.lat, lng: city.lng },
      };
    }
  }

  for (const county of WI_COUNTIES) {
    const short = county.name.replace(" County", "").toLowerCase();
    if (lower.includes(short)) {
      return {
        countyId: county.id,
        countyName: short.charAt(0).toUpperCase() + short.slice(1),
        coordinates: { lat: county.lat, lng: county.lng },
      };
    }
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
