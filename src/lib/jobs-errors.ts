import type { JobsEnvStatus } from "@/lib/jobs-env";
import {
  isRateLimitError,
  jobSourceRateLimitCopy,
  jobsAllSourcesRateLimitedCopy,
  jobsPartialRateLimitCopy,
} from "@/lib/rate-limit-messages";

export type JobSource = "adzuna" | "usajobs";

export type JobSourceError = {
  source: JobSource;
  code: "not_configured" | "http_error" | "network_error" | "parse_error" | "rate_limited";
  message: string;
  userMessage: string;
  retryAfterMinutes?: number;
};

export type JobsFetchStatus = "ok" | "partial" | "empty" | "unconfigured" | "failed";

export type JobsMeta = {
  liveCount: number;
  keysRequired: boolean;
  env: JobsEnvStatus;
  errors: JobSourceError[];
  status: JobsFetchStatus;
  userMessage?: string;
  /** @deprecated use errors[] */
  usajobsError?: string | null;
  /** @deprecated use errors[] */
  adzunaError?: string | null;
};

function parseSourceError(source: JobSource, error: string | null): JobSourceError | null {
  if (!error) return null;

  const label = source === "adzuna" ? "Adzuna" : "USAJobs";

  if (error.includes("not configured")) {
    return {
      source,
      code: "not_configured",
      message: error,
      userMessage: `${label} is not configured on this server.`,
    };
  }

  if (error.includes("network") || error.includes("fetch failed") || error.includes("ECONNREFUSED")) {
    return {
      source,
      code: "network_error",
      message: error,
      userMessage: `We couldn't reach ${label}. Check your connection and try again.`,
    };
  }

  if (error.includes("401") || error.includes("403")) {
    return {
      source,
      code: "http_error",
      message: error,
      userMessage:
        source === "adzuna"
          ? "Adzuna rejected our credentials. Verify ADZUNA_APP_ID and ADZUNA_APP_KEY in .env."
          : "USAJobs rejected our credentials. Verify USAJOBS_AUTH_KEY and USAJOBS_USER_AGENT in .env.",
    };
  }

  if (error.includes("429") || isRateLimitError(error)) {
    const { userMessage, retryAfterMinutes } = jobSourceRateLimitCopy(label, error);
    return {
      source,
      code: "rate_limited",
      message: error,
      userMessage,
      retryAfterMinutes,
    };
  }

  if (error.includes("parse") || error.includes("JSON")) {
    return {
      source,
      code: "parse_error",
      message: error,
      userMessage: `${label} returned an unexpected response. Try again shortly.`,
    };
  }

  return {
    source,
    code: "http_error",
    message: error,
    userMessage: `${label} is temporarily unavailable. Try again in a few minutes.`,
  };
}

export function buildJobsMeta(input: {
  env: JobsEnvStatus;
  usajobsError: string | null;
  adzunaError: string | null;
  liveCount: number;
  resultCount: number;
  searchLocation?: string;
  poolCount?: number;
}): JobsMeta {
  const errors = [
    parseSourceError("usajobs", input.usajobsError),
    parseSourceError("adzuna", input.adzunaError),
  ].filter(Boolean) as JobSourceError[];

  const configuredSources = [
    input.env.usajobsReady ? "usajobs" : null,
    input.env.adzunaReady ? "adzuna" : null,
  ].filter(Boolean) as JobSource[];

  const failedConfigured = errors.filter(
    (e) => e.code !== "not_configured" && configuredSources.includes(e.source)
  );

  let status: JobsFetchStatus = "ok";
  let userMessage: string | undefined;

  const rateLimited = errors.filter((e) => e.code === "rate_limited");
  const maxRetryMinutes = rateLimited.reduce(
    (max, e) => Math.max(max, e.retryAfterMinutes ?? 0),
    0
  );

  if (!input.env.anyLiveSource) {
    status = "unconfigured";
    userMessage =
      "Live job sources are not configured. Add Adzuna or USAJobs API keys to .env and restart the server.";
  } else if (input.liveCount === 0 && failedConfigured.length === configuredSources.length) {
    status = "failed";
    if (rateLimited.length === failedConfigured.length && rateLimited.length > 0) {
      userMessage = jobsAllSourcesRateLimitedCopy(maxRetryMinutes || undefined);
    } else {
      userMessage = errors.map((e) => e.userMessage).join(" ");
    }
  } else if (input.liveCount === 0 && input.resultCount === 0) {
    status = "empty";
    userMessage =
      "No jobs matched your search. Try a broader keyword, relax commute filters, or check back later.";
  } else if (failedConfigured.length > 0 && input.liveCount > 0) {
    status = "partial";
    const rateLimitMessages = failedConfigured
      .filter((e) => e.code === "rate_limited")
      .map((e) => e.userMessage);
    if (rateLimitMessages.length === failedConfigured.length) {
      userMessage = jobsPartialRateLimitCopy(rateLimitMessages, maxRetryMinutes || undefined);
    } else {
      userMessage = `Showing results from available sources. ${failedConfigured.map((e) => e.userMessage).join(" ")}`;
    }
  } else if (input.resultCount === 0 && input.liveCount > 0) {
    status = "empty";
    if (input.searchLocation && input.poolCount === 0) {
      userMessage = `No job listings found near ${input.searchLocation}. Try a broader keyword or a nearby metro.`;
    } else {
      userMessage =
        "Jobs were found but none match your commute filters. Try expanding your commute window or clearing filters.";
    }
  }

  return {
    liveCount: input.liveCount,
    keysRequired: !input.env.anyLiveSource,
    env: input.env,
    errors,
    status,
    userMessage,
    usajobsError: input.usajobsError,
    adzunaError: input.adzunaError,
  };
}
