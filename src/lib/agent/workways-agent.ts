import { ToolLoopAgent, tool, stepCountIs } from "ai";
import { z } from "zod";
import { WORKWAYS_SYSTEM_PROMPT } from "./system-prompt";
import { resolveAgentModel } from "./model";
import type { ToolResultWithMap, ChoroplethMetric } from "./map-actions";
import { getLiveEconomyData } from "@/services/live/economy";
import { getLiveJobs } from "@/services/live/jobs";
import { getLiveTransitData } from "@/services/live/transit";
import {
  getDataSourceStatuses,
  refreshAllLiveSources,
  refreshLiveSources,
} from "@/services/live/refresh";
import { WI_COUNTIES } from "@/lib/wi-counties";

function countyFipsMap() {
  return Object.fromEntries(WI_COUNTIES.map((c) => [c.id, c.fips]));
}

function choroplethFromCounties(
  metric: ChoroplethMetric,
  counties: Awaited<ReturnType<typeof getLiveEconomyData>>["counties"]
): Record<string, number> {
  const values: Record<string, number> = {};
  for (const c of counties) {
    switch (metric) {
      case "unemployment":
        values[c.id] = c.unemploymentRate;
        break;
      case "opportunity":
        values[c.id] = c.opportunityIndex;
        break;
      case "median-wage":
        values[c.id] = c.medianWage;
        break;
      case "open-jobs":
        values[c.id] = c.openJobs;
        break;
      case "transit-coverage":
        values[c.id] = c.transitCoverage;
        break;
    }
  }
  return values;
}

function resolveCountyId(input: string): string | undefined {
  const normalized = input.trim().toLowerCase();
  return WI_COUNTIES.find(
    (c) =>
      c.id === normalized ||
      c.name.toLowerCase().includes(normalized) ||
      normalized.includes(c.name.split(" ")[0].toLowerCase())
  )?.id;
}

function getModel() {
  return resolveAgentModel().model;
}

export const workwaysTools = {
  getDataSourceStatus: tool({
    description:
      "Check status of all live data sources: last fetch time, stale flags, and whether API keys are configured.",
    inputSchema: z.object({}),
    execute: async () => {
      const statuses = getDataSourceStatuses();
      const { provider, modelId } = resolveAgentModel();
      const stale = statuses.filter((s) => s.configured && (s.stale || !s.lastFetchedAt));
      return {
        summary: `${statuses.filter((s) => s.configured).length} sources configured, ${stale.length} stale`,
        data: { sources: statuses, agent: { provider, modelId }, staleIds: stale.map((s) => s.id) },
      };
    },
  }),

  refreshLiveData: tool({
    description:
      "Refresh live data from external APIs (BLS, WisConomy, QCEW, GTFS, jobs). Call before answering questions that need the latest numbers.",
    inputSchema: z.object({
      sources: z
        .array(z.string())
        .optional()
        .describe(
          "Optional source ids: bls, qcew, wisconomy, census, fred, usajobs, adzuna, gtfs, gtfs-realtime. Omit to refresh all."
        ),
    }),
    execute: async ({ sources }) => {
      const result = sources?.length
        ? await refreshLiveSources(sources)
        : await refreshAllLiveSources();
      return {
        summary: `Refreshed ${result.sources.length} sources at ${result.refreshedAt}`,
        data: result,
      };
    },
  }),

  getTransitSnapshot: tool({
    description:
      "Fetch live GTFS transit data: MCTS Milwaukee & Madison Metro stops, routes, and service alerts. Shows sample stops on the map.",
    inputSchema: z.object({
      metro: z.enum(["milwaukee", "madison", "both"]).optional(),
    }),
    execute: async ({ metro = "both" }): Promise<ToolResultWithMap> => {
      const transit = await getLiveTransitData();
      const stops =
        metro === "milwaukee"
          ? transit.stops.filter((s) => s.agency.includes("Milwaukee")).slice(0, 20)
          : metro === "madison"
            ? transit.stops.filter((s) => s.agency.includes("Madison")).slice(0, 20)
            : transit.stops.slice(0, 25);

      const center =
        metro === "madison"
          ? { lat: 43.0731, lng: -89.4012 }
          : metro === "milwaukee"
            ? { lat: 43.0389, lng: -87.9065 }
            : { lat: 43.5, lng: -88.5 };

      return {
        summary: `${transit.stats.totalStops} stops, ${transit.stats.totalRoutes} routes, ${transit.alerts.length} alerts`,
        data: {
          agencies: transit.agencies,
          alerts: transit.alerts.slice(0, 5),
          stats: transit.stats,
          provenance: transit.provenance,
        },
        mapActions: [
          {
            type: "setMarkers",
            markers: stops.map((s) => ({
              id: s.id,
              coordinates: { lat: s.lat, lng: s.lng },
              label: s.name,
              color: s.agency.includes("Madison") ? "#267a55" : "#1e6b9c",
            })),
          },
          { type: "flyTo", center, zoom: metro === "both" ? 7.5 : 11, pitch: 35 },
        ],
      };
    },
  }),

  flyToMap: tool({
    description:
      "Fly the map to a Wisconsin location. Use for metros, counties, cities, or coordinates.",
    inputSchema: z.object({
      location: z
        .string()
        .describe("County name, metro name, or city (e.g. Milwaukee, Dane County, Madison)"),
      zoom: z.number().min(5).max(14).optional().describe("Map zoom level, default 8"),
    }),
    execute: async ({ location, zoom }): Promise<ToolResultWithMap> => {
      const county = WI_COUNTIES.find(
        (c) =>
          c.name.toLowerCase().includes(location.toLowerCase()) ||
          location.toLowerCase().includes(c.id)
      );
      const center = county
        ? { lat: county.lat, lng: county.lng }
        : { lat: 44.5, lng: -89.5 };

      return {
        summary: `Flying to ${county?.name ?? location}`,
        mapActions: [
          {
            type: "flyTo",
            center,
            zoom: zoom ?? (county ? 8.5 : 6.5),
            pitch: county ? 35 : 0,
          },
        ],
      };
    },
  }),

  setMapChoropleth: tool({
    description:
      "Show a county choropleth layer on the map. Metrics: unemployment, opportunity, median-wage, open-jobs, transit-coverage.",
    inputSchema: z.object({
      metric: z.enum([
        "unemployment",
        "opportunity",
        "median-wage",
        "open-jobs",
        "transit-coverage",
      ]),
    }),
    execute: async ({ metric }): Promise<ToolResultWithMap> => {
      const economy = await getLiveEconomyData();
      const values = choroplethFromCounties(metric, economy.counties);

      return {
        summary: `Showing ${metric} choropleth for Wisconsin counties`,
        data: { metric, counties: economy.counties },
        mapActions: [
          { type: "setChoropleth", metric, values },
          {
            type: "flyTo",
            center: { lat: 44.5, lng: -89.5 },
            zoom: 6.3,
            pitch: 25,
          },
        ],
      };
    },
  }),

  highlightCounties: tool({
    description: "Highlight one or more Wisconsin counties on the map with a glowing border.",
    inputSchema: z.object({
      counties: z.array(z.string()).describe("County names or ids, e.g. ['Milwaukee', 'Dane']"),
    }),
    execute: async ({ counties }): Promise<ToolResultWithMap> => {
      const ids = counties
        .map((c) => resolveCountyId(c))
        .filter((id): id is string => Boolean(id));

      const first = WI_COUNTIES.find((c) => c.id === ids[0]);

      return {
        summary: `Highlighted ${ids.length} counties`,
        mapActions: [
          { type: "highlightCounties", countyIds: ids },
          ...(first
            ? [
                {
                  type: "flyTo" as const,
                  center: { lat: first.lat, lng: first.lng },
                  zoom: ids.length > 1 ? 7 : 8.5,
                },
              ]
            : []),
        ],
      };
    },
  }),

  searchJobsMap: tool({
    description:
      "Search Wisconsin jobs and display them as markers on the map. Returns job data and places markers.",
    inputSchema: z.object({
      keyword: z.string().optional(),
      transitOnly: z.boolean().optional(),
      maxCommute: z.number().optional(),
      industry: z.string().optional(),
      limit: z.number().min(1).max(25).optional(),
    }),
    execute: async (params): Promise<ToolResultWithMap> => {
      const result = await getLiveJobs({
        keyword: params.keyword,
        transitOnly: params.transitOnly,
        maxCommute: params.maxCommute,
        industry: params.industry,
        rankByReach: true,
      });

      const jobs = result.jobs.slice(0, params.limit ?? 15);
      const markers = jobs.map((j) => ({
        id: j.id,
        coordinates: j.location.coordinates,
        label: `${j.title} · ${j.employer}`,
        color: j.transitAccessible ? "#1e6b9c" : "#d4824a",
      }));

      const avgLat =
        markers.reduce((s, m) => s + m.coordinates.lat, 0) / (markers.length || 1);
      const avgLng =
        markers.reduce((s, m) => s + m.coordinates.lng, 0) / (markers.length || 1);

      const summary =
        jobs.length > 0
          ? `Found ${result.count} jobs, showing ${jobs.length} on map`
          : result.meta.userMessage ?? "No live job listings matched that search.";

      return {
        summary,
        data: {
          jobs: jobs.map((j) => ({
            id: j.id,
            title: j.title,
            employer: j.employer,
            city: j.location.city,
            pay: j.payMin ? `$${j.payMin.toLocaleString()}` : undefined,
            transitAccessible: j.transitAccessible,
            commuteFitScore: j.commuteFitScore,
          })),
          provenance: result.provenance,
          meta: result.meta,
        },
        mapActions: jobs.length
          ? [
              { type: "setMarkers", markers },
              {
                type: "flyTo",
                center: { lat: avgLat, lng: avgLng },
                zoom: 7.5,
              },
            ]
          : [],
      };
    },
  }),

  getEconomySnapshot: tool({
    description:
      "Get statewide Wisconsin economic snapshot: unemployment, openings, wages, industry growth.",
    inputSchema: z.object({}),
    execute: async (): Promise<ToolResultWithMap> => {
      const economy = await getLiveEconomyData();
      const values = choroplethFromCounties("unemployment", economy.counties);

      return {
        summary: "Statewide Wisconsin economic snapshot",
        data: {
          statewide: economy.statewide,
          metros: economy.metros,
          industryBreakdown: economy.industryBreakdown.slice(0, 8),
        },
        mapActions: [
          {
            type: "setChoropleth",
            metric: "unemployment",
            values,
          },
          {
            type: "flyTo",
            center: { lat: 44.5, lng: -89.5 },
            zoom: 6.3,
            pitch: 30,
          },
        ],
      };
    },
  }),

  getCountyEconomy: tool({
    description: "Get detailed economic data for a specific Wisconsin county.",
    inputSchema: z.object({
      county: z.string().describe("County name, e.g. Milwaukee or Dane County"),
    }),
    execute: async ({ county }): Promise<ToolResultWithMap> => {
      const economy = await getLiveEconomyData();
      const id = resolveCountyId(county);
      const data = economy.counties.find((c) => c.id === id);

      if (!data) {
        return {
          summary: `County not found: ${county}. Available: ${WI_COUNTIES.map((c) => c.name).join(", ")}`,
        };
      }

      const wi = WI_COUNTIES.find((c) => c.id === id)!;

      return {
        summary: `Economy data for ${data.name}`,
        data,
        mapActions: [
          { type: "highlightCounties", countyIds: [id!] },
          {
            type: "setChoropleth",
            metric: "opportunity",
            values: choroplethFromCounties("opportunity", economy.counties),
          },
          {
            type: "flyTo",
            center: { lat: wi.lat, lng: wi.lng },
            zoom: 9,
            pitch: 40,
          },
        ],
      };
    },
  }),

  compareCounties: tool({
    description: "Compare two Wisconsin counties side by side on economy metrics.",
    inputSchema: z.object({
      countyA: z.string(),
      countyB: z.string(),
    }),
    execute: async ({ countyA, countyB }): Promise<ToolResultWithMap> => {
      const economy = await getLiveEconomyData();
      const idA = resolveCountyId(countyA);
      const idB = resolveCountyId(countyB);
      const a = economy.counties.find((c) => c.id === idA);
      const b = economy.counties.find((c) => c.id === idB);

      if (!a || !b) {
        return { summary: "One or both counties not found in live data." };
      }

      return {
        summary: `Comparing ${a.name} vs ${b.name}`,
        data: { countyA: a, countyB: b },
        mapActions: [
          { type: "highlightCounties", countyIds: [idA!, idB!] },
          {
            type: "setChoropleth",
            metric: "unemployment",
            values: choroplethFromCounties("unemployment", economy.counties),
          },
          {
            type: "flyTo",
            center: {
              lat: (a.coordinates.lat + b.coordinates.lat) / 2,
              lng: (a.coordinates.lng + b.coordinates.lng) / 2,
            },
            zoom: 7.5,
          },
        ],
      };
    },
  }),

  drawTransitRoute: tool({
    description:
      "Draw a simplified route line on the map between origin and destination coordinates.",
    inputSchema: z.object({
      originLat: z.number(),
      originLng: z.number(),
      destinationLat: z.number(),
      destinationLng: z.number(),
      label: z.string().optional(),
    }),
    execute: async (params): Promise<ToolResultWithMap> => {
      const origin = { lat: params.originLat, lng: params.originLng };
      const dest = { lat: params.destinationLat, lng: params.destinationLng };

      return {
        summary: params.label ?? "Transit route displayed on map",
        mapActions: [
          {
            type: "drawRoute",
            coordinates: [origin, dest],
            color: "#267a55",
          },
          {
            type: "setMarkers",
            markers: [
              { id: "origin", coordinates: origin, label: "Origin", color: "#267a55" },
              { id: "dest", coordinates: dest, label: "Destination", color: "#d4824a" },
            ],
          },
          {
            type: "flyTo",
            center: {
              lat: (origin.lat + dest.lat) / 2,
              lng: (origin.lng + dest.lng) / 2,
            },
            zoom: 10,
          },
        ],
      };
    },
  }),
};

export function createWorkwaysAgent(extraInstructions?: string) {
  return new ToolLoopAgent({
    model: getModel(),
    instructions: extraInstructions
      ? `${WORKWAYS_SYSTEM_PROMPT}\n\n${extraInstructions}`
      : WORKWAYS_SYSTEM_PROMPT,
    tools: workwaysTools,
    stopWhen: stepCountIs(8),
  });
}

export const workwaysAgent = createWorkwaysAgent();

export type WorkwaysAgentMessage = import("ai").InferAgentUIMessage<
  typeof workwaysAgent
>;

/** FIPS lookup for map choropleth join */
export { countyFipsMap };
