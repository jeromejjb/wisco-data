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
  const headerMatch = message.match(/retry[- ]after[:\s]+(\d+)/i);
  if (headerMatch) {
    const seconds = Number.parseInt(headerMatch[1]!, 10);
    if (Number.isFinite(seconds) && seconds > 0) {
      return Math.max(1, Math.ceil(seconds / 60));
    }
  }
  return undefined;
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
