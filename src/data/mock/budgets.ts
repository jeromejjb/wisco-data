import type { BudgetEntity, Insight } from "@/lib/types";
import { DATA_PROVENANCE } from "./economy";

export const budgetEntities: BudgetEntity[] = [
  {
    id: "mcts",
    name: "Milwaukee County Transit System",
    type: "transit-agency",
    geography: "Milwaukee County",
    coordinates: { lat: 43.0556, lng: -87.9345 },
    fiscalYear: "FY2026",
    totalBudget: 198400000,
    categories: [
      { id: "ops", name: "Operations", amount: 142000000, changeYoY: 2.1, perCapita: 148 },
      { id: "capital", name: "Capital & Fleet", amount: 38400000, changeYoY: 8.4, perCapita: 40 },
      { id: "admin", name: "Administration", amount: 18000000, changeYoY: 0.5, perCapita: 19 },
    ],
    capitalProjects: [
      {
        id: "brt-connect",
        name: "East-West BRT Extension Study",
        amount: 4200000,
        type: "transit",
        coordinates: { lat: 43.0389, lng: -87.92 },
        status: "in-progress",
      },
      {
        id: "fleet-electric",
        name: "Electric Bus Procurement",
        amount: 18500000,
        type: "transit",
        coordinates: { lat: 43.0556, lng: -87.9345 },
        status: "planned",
      },
    ],
    insight:
      "Milwaukee County transit investment increased in this area, but late-night service remains limited for nearby healthcare and manufacturing shifts.",
    provenance: {
      ...DATA_PROVENANCE,
      source: "Milwaukee County budget documents (mock)",
      confidence: "medium",
    },
  },
  {
    id: "wisconsin-dwd",
    name: "Wisconsin DWD – Workforce Development",
    type: "workforce",
    geography: "Statewide",
    coordinates: { lat: 43.0747, lng: -89.3842 },
    fiscalYear: "FY2026",
    totalBudget: 312000000,
    categories: [
      { id: "training", name: "Job Training Grants", amount: 128000000, changeYoY: 5.2, perCapita: 22 },
      { id: "apprentice", name: "Apprenticeship Programs", amount: 48000000, changeYoY: 12.1, perCapita: 8 },
      { id: "youth", name: "Youth Employment", amount: 36000000, changeYoY: 3.4, perCapita: 6 },
    ],
    capitalProjects: [
      {
        id: "skills-center-mke",
        name: "Milwaukee Skills Center",
        amount: 12000000,
        type: "workforce",
        coordinates: { lat: 43.0456, lng: -87.9123 },
        status: "in-progress",
      },
    ],
    provenance: {
      ...DATA_PROVENANCE,
      source: "Wisconsin state budget (mock)",
    },
  },
  {
    id: "city-madison",
    name: "City of Madison",
    type: "city",
    geography: "Dane County",
    coordinates: { lat: 43.0731, lng: -89.4012 },
    fiscalYear: "FY2026",
    totalBudget: 412000000,
    categories: [
      { id: "transit", name: "Metro Transit Support", amount: 42000000, changeYoY: 4.8, perCapita: 78 },
      { id: "infra", name: "Infrastructure", amount: 89000000, changeYoY: 6.2, perCapita: 165 },
      { id: "economic", name: "Economic Development", amount: 18000000, changeYoY: 9.1, perCapita: 33 },
    ],
    capitalProjects: [
      {
        id: "bus-rapid",
        name: "East Side Transit Improvements",
        amount: 8400000,
        type: "transit",
        coordinates: { lat: 43.0891, lng: -89.3567 },
        status: "planned",
      },
    ],
    provenance: {
      ...DATA_PROVENANCE,
      source: "City of Madison adopted budget (mock)",
    },
  },
];

export const budgetTrend = [
  { year: "2021", transit: 168, workforce: 245, infrastructure: 890 },
  { year: "2022", transit: 172, workforce: 258, infrastructure: 920 },
  { year: "2023", transit: 178, workforce: 271, infrastructure: 945 },
  { year: "2024", transit: 185, workforce: 289, infrastructure: 980 },
  { year: "2025", transit: 192, workforce: 302, infrastructure: 1010 },
  { year: "2026", transit: 198, workforce: 312, infrastructure: 1045 },
];

export const insights: Insight[] = [
  {
    id: "insight-1",
    title: "Jobs growing fastest in Southeast Wisconsin",
    summary:
      "Healthcare and advanced manufacturing openings rose 8.2% year-over-year in Kenosha, Racine, and Milwaukee counties, outpacing the statewide average of 4.1%.",
    category: "regional",
    region: "Southeast Wisconsin",
    publishedAt: "2026-08-18",
    tags: ["jobs", "manufacturing", "healthcare"],
    highlight: "+8.2% job growth",
    provenance: DATA_PROVENANCE,
  },
  {
    id: "insight-2",
    title: "Top-paying roles reachable from downtown Milwaukee within 45 minutes",
    summary:
      "Registered nurses, data analysts, and skilled trades lead the list when filtering for transit-accessible jobs with median pay above $55,000.",
    category: "transit",
    region: "Milwaukee",
    publishedAt: "2026-08-15",
    tags: ["transit", "wages", "commute"],
    highlight: "12 high-pay transit-accessible roles",
    provenance: DATA_PROVENANCE,
  },
  {
    id: "insight-3",
    title: "Areas with high job density but limited public-transit access",
    summary:
      "Franklin, Verona, and portions of Green Bay's industrial corridor show strong employer clustering with under 20% of jobs reachable within 45 minutes by transit.",
    category: "transit",
    publishedAt: "2026-08-12",
    tags: ["opportunity gap", "transit", "manufacturing"],
    highlight: "Transit-accessible opportunity gaps identified",
    provenance: DATA_PROVENANCE,
  },
  {
    id: "insight-4",
    title: "Where public investment and workforce demand overlap",
    summary:
      "Workforce training grants and transit capital projects concentrate in Milwaukee and Madison, aligning with healthcare and tech job growth—but third-shift workers remain underserved.",
    category: "investment",
    publishedAt: "2026-08-10",
    tags: ["budget", "workforce", "transit"],
    provenance: DATA_PROVENANCE,
  },
  {
    id: "insight-5",
    title: "What changed this month?",
    summary:
      "Unemployment ticked up 0.1 points statewide. Open healthcare roles increased 6%. MCTS added weekend frequency on Route 30. Real-time data for Madison Metro is temporarily delayed.",
    category: "economy",
    publishedAt: "2026-08-20",
    tags: ["monthly", "labor market", "alerts"],
    highlight: "August 2026 brief",
    provenance: DATA_PROVENANCE,
  },
];
