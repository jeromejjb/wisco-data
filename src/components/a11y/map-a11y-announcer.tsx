"use client";

import { useEffect, useRef } from "react";
import { useMapSession } from "@/components/agent/map-session-provider";
import { useMapStore } from "@/lib/map-store";
import { useLiveAnnounce } from "./live-announcer";

/** Speaks map answers, errors, and county selection without moving keyboard focus. */
export function MapA11yAnnouncer() {
  const announce = useLiveAnnounce();
  const { displayAnswer, isLoading, agentError, agentErrorInfo } = useMapSession();
  const selectedCounty = useMapStore((s) => s.selectedCounty);
  const loadingAnnounced = useRef(false);
  const lastAnswer = useRef("");
  const lastError = useRef("");
  const lastCounty = useRef("");

  useEffect(() => {
    if (isLoading && !loadingAnnounced.current) {
      loadingAnnounced.current = true;
      announce("Gathering live Wisconsin data");
    }
    if (!isLoading) loadingAnnounced.current = false;
  }, [isLoading, announce]);

  useEffect(() => {
    if (!displayAnswer || isLoading) return;
    if (displayAnswer === lastAnswer.current) return;
    lastAnswer.current = displayAnswer;
    announce(displayAnswer);
  }, [displayAnswer, isLoading, announce]);

  useEffect(() => {
    if (!agentError) {
      lastError.current = "";
      return;
    }
    const key = agentErrorInfo.title + agentErrorInfo.detail;
    if (key === lastError.current) return;
    lastError.current = key;
    announce(`${agentErrorInfo.title}. ${agentErrorInfo.detail}`, "assertive");
  }, [agentError, agentErrorInfo, announce]);

  useEffect(() => {
    if (!selectedCounty) {
      lastCounty.current = "";
      return;
    }
    if (selectedCounty.fips === lastCounty.current) return;
    lastCounty.current = selectedCounty.fips;
    announce(`${selectedCounty.name} selected. Details are in the county card.`);
  }, [selectedCounty, announce]);

  return null;
}
