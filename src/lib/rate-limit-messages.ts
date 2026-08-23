/** Default cooldown window when upstream does not send Retry-After. */
export const DEFAULT_RETRY_MINUTES = 5;

export function isRateLimitError(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes("429") ||
    lower.includes("rate limit") ||
    lower.includes("too many requests") ||
    lower.includes("quota")
  );
}

/** Parse Retry-After seconds from error text when present. */
export function parseRetryAfterMinutes(message: string): number | undefined {
  // Matches both `retry-after: 90` headers and Gemini's `Please retry in 48.72s`.
  const match = message.match(/retry[- ]after[:\s]+(\d+(?:\.\d+)?)/i) ?? message.match(/retry in\s+(\d+(?:\.\d+)?)\s*s/i);
  if (match) {
    const seconds = Number.parseFloat(match[1]!);
    if (Number.isFinite(seconds) && seconds > 0) {
      return Math.max(1, Math.ceil(seconds / 60));
    }
  }
  return undefined;
}

/**
 * Wire format for agent failures. The AI SDK masks stream errors as
 * "An error occurred." by default, so the route classifies server-side and
 * sends one of these codes instead of leaking raw upstream error text.
 */
export type AgentFailureCode = "quota-daily" | "rate-limit" | "unavailable";

export const AGENT_ERROR_PREFIX = "agent-error:";

export function isDailyQuotaError(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes("per day") ||
    lower.includes("perday") ||
    lower.includes("free_tier_requests") ||
    lower.includes("requests per day")
  );
}

export function encodeAgentFailure(message: string): string {
  if (isDailyQuotaError(message)) return `${AGENT_ERROR_PREFIX}quota-daily`;
  if (isRateLimitError(message)) {
    const minutes = parseRetryAfterMinutes(message);
    return `${AGENT_ERROR_PREFIX}rate-limit${minutes ? `:${minutes}` : ""}`;
  }
  return `${AGENT_ERROR_PREFIX}unavailable`;
}

export function decodeAgentFailure(
  message: string
): { code: AgentFailureCode; retryAfterMinutes?: number } | undefined {
  if (!message.startsWith(AGENT_ERROR_PREFIX)) return undefined;
  const [code, minutes] = message.slice(AGENT_ERROR_PREFIX.length).split(":");
  if (code !== "quota-daily" && code !== "rate-limit" && code !== "unavailable") return undefined;
  const retryAfterMinutes = minutes ? Number.parseInt(minutes, 10) : undefined;
  return {
    code,
    retryAfterMinutes: Number.isFinite(retryAfterMinutes) ? retryAfterMinutes : undefined,
  };
}

export function agentDailyQuotaCopy(): { title: string; detail: string } {
  return {
    title: "Assistant is out of AI credits for today",
    detail:
      "The free daily AI allowance is used up — it resets tomorrow. Everything below is live map and jobs data, which still works normally.",
  };
}

export function formatRetryWindow(minutes = DEFAULT_RETRY_MINUTES): string {
  if (minutes <= 1) return "about a minute";
  if (minutes < 60) return `about ${minutes} minutes`;
  const hours = Math.round(minutes / 60);
  return hours === 1 ? "about an hour" : `about ${hours} hours`;
}

export function agentRateLimitCopy(errorMessage?: string): {
  title: string;
  detail: string;
  retryAfterMinutes: number;
} {
  const retryAfterMinutes = (errorMessage && parseRetryAfterMinutes(errorMessage)) || DEFAULT_RETRY_MINUTES;
  const window = formatRetryWindow(retryAfterMinutes);

  return {
    title: "AI assistant paused briefly",
    detail: `We've hit a temporary usage limit — nothing is broken. It usually clears on its own; try again in ${window}. Live map data is still available below.`,
    retryAfterMinutes,
  };
}

export function jobSourceRateLimitCopy(
  sourceLabel: string,
  errorMessage?: string
): { userMessage: string; retryAfterMinutes: number } {
  const retryAfterMinutes = (errorMessage && parseRetryAfterMinutes(errorMessage)) || DEFAULT_RETRY_MINUTES;
  const window = formatRetryWindow(retryAfterMinutes);

  return {
    userMessage: `${sourceLabel} is briefly limiting requests. Wait ${window} and refresh — listings typically return on their own.`,
    retryAfterMinutes,
  };
}

export function jobsAllSourcesRateLimitedCopy(retryAfterMinutes = DEFAULT_RETRY_MINUTES): string {
  const window = formatRetryWindow(retryAfterMinutes);
  return `Live job sources are cooling down after heavy use. Give it ${window}, then search again — this is temporary, not a configuration issue.`;
}

export function jobsPartialRateLimitCopy(
  sourceMessages: string[],
  retryAfterMinutes = DEFAULT_RETRY_MINUTES
): string {
  const window = formatRetryWindow(retryAfterMinutes);
  const details = sourceMessages.join(" ");
  return `Showing results from available sources. ${details} Other feeds should catch up within ${window}.`;
}
