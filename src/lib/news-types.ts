import type { Coordinates } from "@/lib/types";

export type NewsTopic = "jobs" | "economy" | "civic" | "community" | "general";

export type NewsTone = "upbeat" | "mixed" | "cautious" | "concerned";

export type AreaNewsItem = {
  id: string;
  title: string;
  summary?: string;
  url?: string;
  publishedAt?: string;
  source: "gnews" | "google-rss" | "biz-journal";
  publisher?: string;
  topic?: NewsTopic;
  tone?: NewsTone;
  countyId?: string;
  countyName?: string;
  coordinates?: Coordinates;
  mapLabel?: string;
};

export type AreaSentimentSnapshot = {
  vibe: string;
  score: number;
  tone: NewsTone;
  oneLiner: string;
  topics: string[];
  areaName: string;
  source: "gemini" | "heuristic";
};

export type LocalNewsMapPin = {
  id: string;
  coordinates: Coordinates;
  headline: string;
  blurb: string;
  topic: NewsTopic;
  tone: NewsTone;
  url?: string;
  countyName?: string;
};

export type AreaNewsBundle = {
  items: AreaNewsItem[];
  sentiment: AreaSentimentSnapshot | null;
  mapPins: LocalNewsMapPin[];
  bizJournalItems?: AreaNewsItem[];
  meta: {
    sources: string[];
    gnewsConfigured: boolean;
    sentimentAvailable: boolean;
    bizJournalSources?: string[];
  };
};
