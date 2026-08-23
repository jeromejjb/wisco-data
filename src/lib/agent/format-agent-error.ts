import {
  agentDailyQuotaCopy,
  agentRateLimitCopy,
  decodeAgentFailure,
  isDailyQuotaError,
  isRateLimitError,
} from "@/lib/rate-limit-messages";

export function formatAgentError(error: Error | undefined): {
  title: string;
  detail: string;
  fallbackNote: string;
  canUseLiveData: boolean;
  isRateLimited?: boolean;
  retryAfterMinutes?: number;
} {
  const fallbackNote = "Live map data is shown below.";

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
      title: "AI assistant is resting",
      detail: "It couldn't answer this one. The live map and jobs data below are unaffected — try again shortly.",
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
      title: "AI assistant unavailable",
      detail: "We're still pulling live Wisconsin data for you on the map.",
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
      detail: "Check your network — we'll keep trying with live data sources.",
      fallbackNote,
      canUseLiveData: true,
    };
  }

  return {
    title: "AI assistant is resting",
    detail: "It couldn't answer this one. The live map and jobs data below are unaffected — try again shortly.",
    fallbackNote,
    canUseLiveData: true,
  };
}
