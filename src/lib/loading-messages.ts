export type GatheringContext =
  | "agent"
  | "jobs"
  | "map-seed"
  | "location"
  | "news"
  | "economy";

const AGENT_GENERAL = [
  "Connecting to Wisconsin live data sources…",
  "Reading county maps and economic layers…",
  "Gathering the latest numbers for your question…",
  "Almost there — shaping your map answer…",
];

const AGENT_JOBS = [
  "Searching live job boards across Wisconsin…",
  "Pulling listings from Adzuna and USAJobs…",
  "Estimating commute reach from transit networks…",
  "Plotting openings on the map…",
];

const AGENT_ECONOMY = [
  "Fetching unemployment rates from WisConomy…",
  "Layering BLS and QCEW county data…",
  "Coloring counties by the metric you asked for…",
  "Cross-checking statewide economic trends…",
];

const AGENT_TRANSIT = [
  "Loading GTFS routes and stop data…",
  "Checking Madison and Milwaukee transit feeds…",
  "Mapping service coverage across the region…",
  "Building your commute picture…",
];

const AGENT_MAP = [
  "Flying the map to the right place…",
  "Highlighting counties on the Wisconsin map…",
  "Syncing map layers with live data…",
  "Almost ready — updating the view…",
];

const JOBS = [
  "Scanning live Wisconsin job listings…",
  "Pulling openings from Adzuna…",
  "Matching roles to your commute filters…",
  "Placing results on the map…",
];

const MAP_SEED = [
  "Loading Wisconsin county boundaries…",
  "Fetching live unemployment by county…",
  "Painting the map with WisConomy data…",
  "Almost ready — your map is coming together…",
];

const LOCATION = [
  "Detecting your area…",
  "Checking local context for smarter prompts…",
  "Finding nearby counties on the map…",
];

const NEWS = [
  "Scanning local headlines for prompt ideas…",
  "Pulling Wisconsin workforce news…",
];

const ECONOMY = [
  "Gathering statewide economic indicators…",
  "Loading BLS and QCEW datasets…",
  "Building county comparison charts…",
];

export function messagesForContext(context: GatheringContext): string[] {
  switch (context) {
    case "jobs":
      return JOBS;
    case "map-seed":
      return MAP_SEED;
    case "location":
      return LOCATION;
    case "news":
      return NEWS;
    case "economy":
      return ECONOMY;
    case "agent":
    default:
      return AGENT_GENERAL;
  }
}

/** Pick a message sequence from the user's question (map agent). */
export function inferAgentGatheringMessages(question?: string): string[] {
  const q = (question ?? "").toLowerCase();
  if (!q.trim()) return AGENT_GENERAL;

  if (/job|jobs|hire|hiring|career|opening|employ|salary|wage|nurse|manufactur/.test(q)) {
    return AGENT_JOBS;
  }
  if (/transit|bus|commute|route|mcts|metro|gtfs/.test(q)) {
    return AGENT_TRANSIT;
  }
  if (/unemploy|wage|econom|industry|gdp|labor|workforce|qcew|bls|opportunit/.test(q)) {
    return AGENT_ECONOMY;
  }
  if (/county|counties|map|fly|highlight|zoom|milwaukee|madison|dane|racine|kenosha/.test(q)) {
    return AGENT_MAP;
  }

  return AGENT_GENERAL;
}

/** Short headline for map pin popups while loading. */
export function gatheringHeadline(messages: string[], index = 0): string {
  const msg = messages[index % messages.length] ?? "Gathering live data…";
  return msg.replace(/…$/, "").slice(0, 48);
}
