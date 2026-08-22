import type { CountyEconomy } from "@/lib/types";
import {
  statewideStats,
  counties,
  metroRegions,
  unemploymentTrend,
  industryBreakdown,
} from "@/data/mock/economy";
import { budgetEntities, budgetTrend, insights } from "@/data/mock/budgets";
import { generateRoutes, serviceAlerts, defaultOrigin } from "@/data/mock/transit";

export type JobsFilterParams = {
  keyword?: string;
  industry?: string;
  transitOnly?: boolean;
  maxCommute?: number;
  maxTransfers?: number;
  minSalary?: number;
  rankByReach?: boolean;
};

export const economyAdapter = {
  provenance: statewideStats.provenance,
  getStatewide() {
    return statewideStats;
  },
  getCounties(): CountyEconomy[] {
    return counties;
  },
  getCounty(id: string) {
    return counties.find((c) => c.id === id);
  },
  getMetros() {
    return metroRegions;
  },
  getUnemploymentTrend() {
    return unemploymentTrend;
  },
  getIndustryBreakdown() {
    return industryBreakdown;
  },
};

export const transitAdapter = {
  provenance: {
    source: "GTFS static + mock realtime (MCTS, Madison Metro)",
    lastUpdated: "2026-08-20T06:00:00Z",
    coverage: "Milwaukee, Madison; partial statewide",
    confidence: "estimated" as const,
    methodology:
      "Commute times are estimates based on scheduled service. Not guaranteed for all shift times.",
  },
  getDefaultOrigin() {
    return defaultOrigin;
  },
  getRoutes(origin: string, destination: string) {
    return generateRoutes(origin, destination);
  },
  getAlerts() {
    return serviceAlerts;
  },
};

export const budgetsAdapter = {
  getEntities() {
    return budgetEntities;
  },
  getEntity(id: string) {
    return budgetEntities.find((e) => e.id === id);
  },
  getTrend() {
    return budgetTrend;
  },
};

export const insightsAdapter = {
  getAll() {
    return insights;
  },
  getById(id: string) {
    return insights.find((i) => i.id === id);
  },
};
