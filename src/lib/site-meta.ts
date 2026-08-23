/** Shared copy for footer and legal pages — keep in sync. */
export const SITE = {
  name: "Wisconsin Workways",
  tagline: "Jobs, economics, and transit — on one Wisconsin map.",
  contactEmail: "hello@wiscoworkways.app",
  lastUpdated: "August 22, 2026",
} as const;

export const TECH_STACK = [
  { name: "Next.js", detail: "App router & API routes" },
  { name: "React", detail: "UI" },
  { name: "TypeScript", detail: "End-to-end types" },
  { name: "MapLibre GL", detail: "Interactive map" },
  { name: "Tailwind CSS", detail: "Design system" },
  { name: "Vercel AI SDK", detail: "Map agent" },
  { name: "Gemini", detail: "Optional AI answers" },
  { name: "Prisma", detail: "Experiments & prompts" },
  { name: "Zustand", detail: "Map session state" },
  { name: "SWR", detail: "Live data fetching" },
  { name: "Framer Motion", detail: "Motion & transitions" },
  { name: "GTFS", detail: "MCTS & Madison Metro" },
] as const;

export type SiteDataSource = {
  links: readonly { label: string; href: string }[];
};

/** Public data providers — keep labels aligned with footer and About. */
export const DATA_SOURCES: readonly SiteDataSource[] = [
  {
    links: [
      {
        label: "Bureau of Labor Statistics (LAUS, QCEW)",
        href: "https://www.bls.gov/",
      },
    ],
  },
  {
    links: [
      {
        label: "Wisconsin DWD WisConomy",
        href: "https://jobcenterofwisconsin.com/wisconomy/",
      },
    ],
  },
  {
    links: [
      {
        label: "U.S. Census ACS",
        href: "https://www.census.gov/programs-surveys/acs",
      },
    ],
  },
  {
    links: [
      {
        label: "FRED (Federal Reserve)",
        href: "https://fred.stlouisfed.org/",
      },
    ],
  },
  {
    links: [
      { label: "USAJobs", href: "https://www.usajobs.gov/" },
      { label: "Adzuna", href: "https://www.adzuna.com/" },
    ],
  },
  {
    links: [
      { label: "GNews", href: "https://gnews.io/" },
      { label: "Google News RSS", href: "https://news.google.com/" },
    ],
  },
  {
    links: [
      { label: "Milwaukee Business Journal", href: "https://www.bizjournals.com/milwaukee" },
      { label: "WisBusiness", href: "https://www.wisbusiness.com/" },
      { label: "BizTimes", href: "https://biztimes.com/" },
    ],
  },
  {
    links: [
      { label: "OpenFreeMap", href: "https://openfreemap.org/" },
      { label: "Mapbox", href: "https://www.mapbox.com/" },
    ],
  },
] as const;
