"use client";

import { useEffect, useState } from "react";

export function useRotatingMessage(messages: string[], intervalMs = 2800): string {
  const [index, setIndex] = useState(0);
  const safe = messages.length ? messages : ["Gathering live data…"];

  useEffect(() => {
    setIndex(0);
  }, [messages.join("|")]);

  useEffect(() => {
    if (safe.length <= 1) return;
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % safe.length);
    }, intervalMs);
    return () => window.clearInterval(id);
  }, [safe.length, intervalMs, messages.join("|")]);

  return safe[index % safe.length];
}
