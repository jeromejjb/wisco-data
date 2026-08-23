import { agentRateLimitCopy, isRateLimitError } from "@/lib/rate-limit-messages";

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

  const msg = error.message.toLowerCase();

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
    title: "Couldn't reach the assistant",
    detail: "Live map data may still answer your question — see the results card.",
    fallbackNote,
    canUseLiveData: true,
  };
}
