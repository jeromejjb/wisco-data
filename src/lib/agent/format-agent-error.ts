export function formatAgentError(error: Error | undefined): {
  title: string;
  detail: string;
  canUseLiveData: boolean;
} {
  if (!error) {
    return {
      title: "Something went wrong",
      detail: "Try again in a moment.",
      canUseLiveData: true,
    };
  }

  const msg = error.message.toLowerCase();

  if (msg.includes("503") || msg.includes("api key") || msg.includes("credentials")) {
    return {
      title: "AI assistant unavailable",
      detail: "We're still pulling live Wisconsin data for you on the map.",
      canUseLiveData: true,
    };
  }

  if (
    msg.includes("quota") ||
    msg.includes("rate limit") ||
    msg.includes("an error occurred") ||
    msg.includes("429")
  ) {
    return {
      title: "AI is catching its breath",
      detail: "Rate limit hit — your live job and map results are still loading below.",
      canUseLiveData: true,
    };
  }

  if (msg.includes("network") || msg.includes("fetch")) {
    return {
      title: "Connection hiccup",
      detail: "Check your network — we'll keep trying with live data sources.",
      canUseLiveData: true,
    };
  }

  return {
    title: "Couldn't reach the assistant",
    detail: "Live map data may still answer your question — see the results card.",
    canUseLiveData: true,
  };
}
