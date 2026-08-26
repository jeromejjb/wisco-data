#!/usr/bin/env node
/**
 * Creates the "Codebase audit" milestone, a parent catalog issue, and
 * individual GitHub issues for blocker/high findings only.
 *
 *   node scripts/file-audit-milestone.mjs --dry-run
 *   node scripts/file-audit-milestone.mjs
 */
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dryRun = process.argv.includes("--dry-run");

function gh(args) {
  return execFileSync("gh", args, { cwd: root, encoding: "utf8" }).trim();
}

/** Blocker / critical / high — filed as their own issues. */
export const PRIORITY_FINDINGS = [
  {
    slug: "transit-mock-routes-as-live",
    severity: "blocker",
    area: "transit",
    title: "Transit trip cards are mock routes labeled as live GTFS",
    file: "src/services/live/transit.ts",
    body: "`getLiveTransitData` injects `generateRoutes()` from mock data and still marks provenance `confidence: high`. Origin is always the mock Milwaukee Holton St address. Hide trip cards until OTP/Mapbox is wired, or label them as sample schedules and drop mock imports from the live path.",
  },
  {
    slug: "admin-secret-fail-open",
    severity: "blocker",
    area: "security",
    title: "Admin APIs are public when ADMIN_SECRET is unset",
    file: "src/app/api/prompt-experiments/route.ts",
    body: "`isAuthorized` returns true if `ADMIN_SECRET` is missing. `/admin` pages have no middleware. Fail closed in production (401) and protect `/admin/*`.",
  },
  {
    slug: "sources-post-unauthenticated",
    severity: "blocker",
    area: "security",
    title: "Anyone can POST /api/sources and refresh every upstream feed",
    file: "src/app/api/sources/route.ts",
    body: "Public POST plus client auto-refresh after 8s (`use-source-sync`) can DoS BLS, QCEW×72, GTFS, and job APIs. Require admin/cron auth and a global refresh mutex.",
  },
  {
    slug: "economy-ten-counties-not-72",
    severity: "blocker",
    area: "data",
    title: "Live economy still built from 10 featured counties, not 72",
    file: "src/lib/wi-counties.ts",
    body: "`WI_COUNTIES` and `getLiveEconomyData` only cover 10 metros. Explore cards, QCEW fetches, and county-panel extra tiles miss the rest of Wisconsin. Iterate all FIPS in `WI_COUNTY_NAME_TO_FIPS`.",
  },
  {
    slug: "budgets-insights-unlabeled-mock",
    severity: "blocker",
    area: "data",
    title: "Budgets and Insights pages serve unlabeled mock data",
    file: "src/app/budgets/page.tsx",
    body: "Both pages read adapters backed by `src/data/mock` with HTTP 200 APIs and no sample-data banner. Add a prominent mock banner or replace with live sources. Download/Share on Insights are dead buttons.",
  },
  {
    slug: "milwaukee-silent-defaults",
    severity: "high",
    area: "map",
    title: "Unknown location still silently becomes Milwaukee",
    file: "src/lib/user-area.ts",
    body: "`/api/location`, `/api/news`, job geocodes, saved-place coords, and invalid county ids fall back to Milwaukee. Return `resolved: false` / null coords instead of pretending the user is in Milwaukee.",
  },
  {
    slug: "transit-seven-agencies-runtime-two",
    severity: "high",
    area: "transit",
    title: "Registry lists 7 agencies; live fetch defaults to MCTS + Madison",
    file: "src/services/live/transit.ts",
    body: "`agency=all` and agent `getTransitSnapshot` still load Milwaukee/Madison only. Map transit panel maps `all` → `mcts`. Green Bay GTFS URL looks like an HTML DocumentCenter page, not a zip. Fetch all registry agencies (or bbox-filter) and validate zip responses.",
  },
  {
    slug: "commute-enrichment-two-metros",
    severity: "high",
    area: "jobs",
    title: "Job commute estimates only use MCTS and Madison stops",
    file: "src/services/live/commute-enrichment.ts",
    body: "Statewide jobs get bogus transit flags. `transitAccessible` is hardcoded true for Milwaukee/Madison city names. Select agency via `agencyByCounty` and default transitAccessible to false until enrichment runs.",
  },
  {
    slug: "jobs-error-responses-cached",
    severity: "high",
    area: "jobs",
    title: "USAJobs/Adzuna errors are cached for 30 minutes",
    file: "src/services/clients/jobs-api.ts",
    body: "401/429/network failures stick in the in-memory cache. Only cache successful payloads; use a short TTL for errors.",
  },
  {
    slug: "economy-fabricated-fields",
    severity: "high",
    area: "data",
    title: "County cost of living, population change, and transit coverage are hardcoded",
    file: "src/services/live/economy.ts",
    body: "`costOfLivingIndex: 95`, `populationChange: 0.5`, and transit coverage constants are presented as live. Missing WisConomy rows become 3.5% unemployment. Omit or mark estimated; never invent rates.",
  },
  {
    slug: "economy-single-source-fails-all",
    severity: "high",
    area: "data",
    title: "One BLS/WisConomy failure 502s the whole economy payload",
    file: "src/services/live/economy.ts",
    body: "Use `Promise.allSettled` and return partial counties with source error flags. WisConomy XLS layout changes currently take down unemployment statewide.",
  },
  {
    slug: "agent-no-rate-limit",
    severity: "high",
    area: "agent",
    title: "Agent POST is unauthenticated and unbounded",
    file: "src/app/api/agent/route.ts",
    body: "Anyone can stream LLM + tool calls. Malformed JSON 500s. Add IP rate limits, 400 on bad JSON, and debounce `refreshStaleSources`.",
  },
  {
    slug: "prisma-dead-persistence",
    severity: "high",
    area: "dx",
    title: "Prisma SavedJob/SavedPlace models are unused; saved places stay in localStorage",
    file: "src/lib/prisma.ts",
    body: "Schema and postinstall generate imply a database that is never queried. Wire saved places or remove Prisma until needed. Experiments are in-memory and reset on deploy.",
  },
  {
    slug: "cache-unbounded",
    severity: "high",
    area: "data",
    title: "In-memory cache has no LRU cap; GTFS bbox keys grow forever",
    file: "src/lib/cache.ts",
    body: "Add max entries and sweep expired keys. Normalize GTFS bbox to a grid so panning does not explode keys.",
  },
  {
    slug: "saved-places-hardcoded-milwaukee",
    severity: "high",
    area: "map",
    title: "Saved places always store Milwaukee downtown coordinates",
    file: "src/app/saved/page.tsx",
    body: "Address text is ignored. `/transit?job=` from saved jobs is unread on the transit page. Geocode addresses and handle the job query param (or link to /jobs).",
  },
  {
    slug: "map-home-ignores-dark-mode",
    severity: "high",
    area: "ux",
    title: "Map home forces a light basemap and light-only dock chrome",
    file: "src/components/map/agent-map.tsx",
    body: "`forceLightBasemap` plus hardcoded `bg-white` on MapChatWidget/logo/carousel. No theme toggle on `/` because Header is hidden. Respect darkMode or document always-light map as intentional.",
  },
  {
    slug: "dead-agent-panel-and-chrome",
    severity: "high",
    area: "dx",
    title: "WorkwaysAgentPanel and WorkspaceChrome are unused duplicates",
    file: "src/components/agent/workways-agent-panel.tsx",
    body: "490-line chat panel and workspace chrome never import. AgentShell `isOpen` is unused. Delete or wire a single agent surface.",
  },
  {
    slug: "explore-layer-toggles-cosmetic",
    severity: "high",
    area: "map",
    title: "Explore layer toggles only recolor 10 dots, not a choropleth",
    file: "src/app/explore/page.tsx",
    body: "Copy says live county markers. Wire `/api/economy/map` choropleth or drop the misleading toggles. Default compare is Milwaukee vs Dane.",
  },
  {
    slug: "draw-transit-straight-line",
    severity: "high",
    area: "agent",
    title: "Agent drawTransitRoute draws a straight line, not a GTFS path",
    file: "src/lib/agent/workways-agent.ts",
    body: "System prompt still says transit is MCTS/Madison only. Update tools + prompt for all registered agencies, or label the line as an approximate corridor.",
  },
];

function catalogExtras() {
  /** Medium/low unique gaps for the parent catalog (not all filed as issues). */
  return [
    ["medium", "transit", "src/app/transit/page.tsx", "Trip planner UI says router coming soon but still shows mock RouteCards."],
    ["medium", "transit", "src/components/agent/map-transit-panel.tsx", "Desktop detail sheet gets empty alerts; mobile gets real alerts."],
    ["medium", "jobs", "src/components/jobs/job-card.tsx", "Commute copy always says by transit even when mode is drive."],
    ["medium", "jobs", "src/app/jobs/page.tsx", "No location filter field; mobile filter sheet missing safe-area padding."],
    ["medium", "news", "src/app/api/news/route.ts", "News defaults to Milwaukee when county/lat/lng omitted."],
    ["medium", "agent", "src/lib/agent/chat-starters.ts", "Default starters still mention Milwaukee jobs and fly to Madison."],
    ["medium", "map", "src/components/agent/area-picker.tsx", "Area picker lists 10 featured counties, not 72."],
    ["medium", "copy", "src/components/data/source-panel.tsx", "Source panel hardcodes two GTFS agencies."],
    ["medium", "copy", "src/lib/site-meta.ts", "Footer claims Prisma for experiments; storage is in-memory."],
    ["medium", "copy", "src/app/privacy/page.tsx", "Privacy says OpenFreeMap default; maps use CARTO/Esri rasters."],
    ["medium", "security", "src/hooks/use-user-area.ts", "Client may call ipapi.co with the user IP."],
    ["medium", "security", "src/components/admin/experiments-dashboard.tsx", "Admin secret passed as ?key= in the query string."],
    ["medium", "dx", "src/lib/data-sources/registry.ts", "Registry cache key gtfs:agencies vs actual gtfs:agencies:v2."],
    ["medium", "dx", ".env.example", "MCTS_BUSTIME_KEY and MADISON_METRO_API_KEY documented but unused."],
    ["medium", "testing", "src/lib/agent/local-map-answer.ts", "Live-fallback answer builder has no unit tests."],
    ["medium", "testing", "src/services/clients/gtfs.ts", "GTFS parse/RT has no fixture tests."],
    ["medium", "ux", "src/components/layout/header.tsx", "Two chrome systems: Header vs WorkspaceLogo; nav hidden until xl."],
    ["medium", "a11y", "src/components/ui/button.tsx", "Button does not default type=button."],
    ["medium", "a11y", "src/app/explore/page.tsx", "Compare county selects have no labels."],
    ["low", "copy", "src/lib/loading-messages.ts", "Loading copy always mentions Madison and Milwaukee transit feeds."],
  ];
}

function buildCatalog() {
  const items = PRIORITY_FINDINGS.map((f) => ({
    slug: f.slug,
    severity: f.severity,
    area: f.area,
    file: f.file,
    title: f.title,
    problem: f.body.split(".")[0] + ".",
  }));
  for (const [severity, area, file, problem] of catalogExtras()) {
    items.push({
      slug: file.replaceAll("/", "-").replaceAll(".", "-") + "-" + severity,
      severity,
      area,
      file,
      title: problem.slice(0, 80),
      problem,
    });
  }
  return items;
}

function ensureLabel(name, color, description) {
  try {
    gh(["label", "create", name, "--color", color, "--description", description]);
  } catch {
    /* exists */
  }
}

function main() {
  const catalog = JSON.parse(readFileSync(join(root, ".github/audit-catalog.json"), "utf8"));
  console.log(`Catalog entries: ${catalog.length}`);
  console.log(`Priority issues to file: ${PRIORITY_FINDINGS.length}`);

  if (dryRun) {
    for (const f of PRIORITY_FINDINGS) console.log(`- [${f.severity}] ${f.title}`);
    return;
  }

  ensureLabel("audit", "0E8A16", "Codebase audit finding");
  ensureLabel("blocker", "B60205", "Blocks shipping as a live statewide product");

  const milestoneTitle = "Codebase audit — Aug 2026";
  let milestoneNumber = 1;
  try {
    const existing = JSON.parse(gh(["api", "repos/{owner}/{repo}/milestones"]));
    const found = existing.find((m) => m.title === milestoneTitle);
    if (found) {
      milestoneNumber = found.number;
      console.log(`Using existing milestone #${milestoneNumber}`);
    } else {
      throw new Error("create");
    }
  } catch {
    const msRaw = gh([
      "api",
      "repos/{owner}/{repo}/milestones",
      "-f",
      `title=${milestoneTitle}`,
      "-f",
      "description=Functional and convention gaps vs statewide live Workways (mock-as-live, Milwaukee defaults, auth, 72-county coverage). Parent issue holds the full catalog; high/blocker items are filed separately.",
      "-f",
      "state=open",
    ]);
    milestoneNumber = JSON.parse(msRaw).number;
    console.log(`Milestone #${milestoneNumber}`);
  }

  const parentBody = [
    `Full catalog: \`${catalog.length}\` findings in [\`.github/audit-catalog.json\`](https://github.com/jeromejjb/wisco-data/blob/main/.github/audit-catalog.json).`,
    "",
    "Individual issues in this milestone are **blocker/high only**. Medium/low stay in the catalog until we pull them into feature PRs.",
    "",
    "## Highest severity",
    ...PRIORITY_FINDINGS.map((f) => `- **${f.severity}** · \`${f.area}\` · ${f.title} (\`${f.file}\`)`),
    "",
    "## Counts in catalog",
    `- blocker/high: ${catalog.filter((c) => c.severity === "blocker" || c.severity === "high" || c.severity === "critical").length}`,
    `- medium: ${catalog.filter((c) => c.severity === "medium").length}`,
    `- low: ${catalog.filter((c) => c.severity === "low").length}`,
  ].join("\n");

  const parentUrl = gh([
    "issue",
    "create",
    "--title",
    "Codebase audit catalog (250+ functional / convention gaps)",
    "--label",
    "audit",
    "--milestone",
    milestoneTitle,
    "--body",
    parentBody,
  ]);
  console.log(`Parent ${parentUrl}`);

  for (const f of PRIORITY_FINDINGS) {
    const url = gh([
      "issue",
      "create",
      "--title",
      f.title,
      "--label",
      "audit",
      "--label",
      f.severity === "blocker" ? "blocker" : "bug",
      "--milestone",
      milestoneTitle,
      "--body",
      [`**Severity:** ${f.severity}`, `**Area:** ${f.area}`, `**File:** \`${f.file}\``, "", f.body, "", `_Catalog slug: \`${f.slug}\`_`].join("\n"),
    ]);
    console.log(url);
  }
}

const isDirect =
  process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isDirect) main();
