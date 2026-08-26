import {
  agentDailyQuotaCopy,
  agentRateLimitCopy,
  decodeAgentFailure,
  isDailyQuotaError,
  isRateLimitError,
} from "@/lib/rate-limit-messages";

const ON_MAP = "Live Wisconsin data is on the map.";
const ASK_MAP =
  "The map still answers — try a county, jobs, wages, or transit.";

export function formatAgentError(
  error: Error | undefined,
  opts?: { liveFallback?: boolean }
): {
  title: string;
  detail: string;
  fallbackNote: string;
  canUseLiveData: boolean;
  isRateLimited?: boolean;
  retryAfterMinutes?: number;
} {
  const fallbackNote = opts?.liveFallback ? ON_MAP : ASK_MAP;

  if (!error) {
    return {
      title: "Something went wrong",
      detail: "Try again in a moment.",
      fallbackNote,
      canUseLiveData: true,
    };
  }

  const coded = decodeAgentFailure(error.message);
  if (coded) {
    if (coded.code === "quota-daily") {
      const quota = agentDailyQuotaCopy();
      return { ...quota, fallbackNote, canUseLiveData: true, isRateLimited: true };
    }
    if (coded.code === "rate-limit") {
      const rateLimit = agentRateLimitCopy(
        coded.retryAfterMinutes ? `retry-after: ${coded.retryAfterMinutes * 60}` : undefined
      );
      return {
        title: rateLimit.title,
        detail: rateLimit.detail,
        fallbackNote,
        canUseLiveData: true,
        isRateLimited: true,
        retryAfterMinutes: rateLimit.retryAfterMinutes,
      };
    }
    return {
      title: opts?.liveFallback ? "Live data answered on the map" : "Chat AI stepped aside",
      detail: opts?.liveFallback
        ? "The chat model hit a limit. County numbers, jobs, and transit on the map are live — not a canned reply."
        : ASK_MAP,
      fallbackNote,
      canUseLiveData: true,
    };
  }

  const msg = error.message.toLowerCase();

  if (isDailyQuotaError(msg)) {
    const quota = agentDailyQuotaCopy();
    return { ...quota, fallbackNote, canUseLiveData: true, isRateLimited: true };
  }

  if (msg.includes("503") || msg.includes("api key") || msg.includes("credentials")) {
    return {
      title: "Chat AI unavailable",
      detail: opts?.liveFallback
        ? "Live Wisconsin feeds still painted this answer on the map."
        : ASK_MAP,
      fallbackNote,
      canUseLiveData: true,
    };
  }

  if (isRateLimitError(msg)) {
    const rateLimit = agentRateLimitCopy(error.message);
    return {
      title: rateLimit.title,
      detail: rateLimit.detail,
      fallbackNote,
      canUseLiveData: true,
      isRateLimited: true,
      retryAfterMinutes: rateLimit.retryAfterMinutes,
    };
  }

  if (msg.includes("network") || msg.includes("fetch")) {
    return {
      title: "Connection hiccup",
      detail: opts?.liveFallback
        ? "Chat dropped, but live map data is on the map."
        : "Check your network — the map still loads public Wisconsin feeds.",
      fallbackNote,
      canUseLiveData: true,
    };
  }

  return {
    title: opts?.liveFallback ? "Live data answered on the map" : "Chat AI stepped aside",
    detail: opts?.liveFallback
      ? "The chat model couldn't finish. What's on the map is live Wisconsin data."
      : ASK_MAP,
    fallbackNote,
    canUseLiveData: true,
  };
}
