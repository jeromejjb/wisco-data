"use client";

import {
  createContext,
  useContext,
  useMemo,
  useRef,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";
import { inferAgentGatheringMessages } from "@/lib/loading-messages";
import { useRotatingMessage } from "@/hooks/use-rotating-message";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import type { WorkwaysAgentMessage } from "@/lib/agent/workways-agent";
import type { ChatStarter } from "@/lib/agent/chat-starters";
import type { AreaSentimentSnapshot, LocalNewsMapPin } from "@/lib/news-types";
import { formatAssistantChatText, getMessageText } from "@/lib/agent/chat-display";
import { useLocalPrompts } from "@/hooks/use-local-prompts";
import { useLocalMapAnswer } from "./use-local-map-answer";
import { AgentMapBridge } from "./agent-map-bridge";
import { useMapStore } from "@/lib/map-store";
import { WI_COUNTIES } from "@/lib/wi-counties";
import { countiesFromText } from "@/lib/agent/map-query-intent-utils";
import { formatAgentError } from "@/lib/agent/format-agent-error";
import type { LocalMapAnswer } from "@/lib/agent/local-map-answer";

export type MapSessionContextValue = {
  messages: WorkwaysAgentMessage[];
  sendMessage: (args: { text: string }) => void;
  isLoading: boolean;
  isStreamingAssistant: boolean;
  error: Error | undefined;
  answer: string;
  question: string;
  hasAnswer: boolean;
  showAnswerStack: boolean;
  starters: ChatStarter[];
  area: ReturnType<typeof useLocalPrompts>["area"];
  meta: ReturnType<typeof useLocalPrompts>["meta"];
  areaLoading: boolean;
  newsLoading: boolean;
  newsPromptsEnabled: boolean;
  newsSentiment: AreaSentimentSnapshot | null;
  newsMapPins: LocalNewsMapPin[];
  setNewsPromptsEnabled: (v: boolean) => void;
  browserLocationEnabled: boolean;
  setBrowserLocationEnabled: (v: boolean) => void;
  trackStarterClick: (s: ChatStarter) => void;
  gatheringMessages: string[];
  loadingMessage: string;
  localMapAnswer: LocalMapAnswer | null;
  displayAnswer: string;
  agentError: Error | undefined;
  agentErrorInfo: ReturnType<typeof formatAgentError>;
};

const MapSessionContext = createContext<MapSessionContextValue | null>(null);

export function useMapSession() {
  const ctx = useContext(MapSessionContext);
  if (!ctx) throw new Error("useMapSession must be used within MapSessionProvider");
  return ctx;
}

function latestAssistantAnswer(messages: WorkwaysAgentMessage[]): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (m.role !== "assistant") continue;
    const text = formatAssistantChatText(getMessageText(m));
    if (text.trim()) return text;
  }
  return "";
}

function latestUserQuestion(messages: WorkwaysAgentMessage[]): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === "user") return getMessageText(messages[i]).trim();
  }
  return "";
}

function syncAnswerPin(
  question: string,
  answer: string,
  isLoading: boolean,
  area: ReturnType<typeof useLocalPrompts>["area"],
  loadingHeadline: string
) {
  const setAnswerPin = useMapStore.getState().setAnswerPin;
  if (!answer && !isLoading) {
    setAnswerPin(null);
    return;
  }
  const countyId =
    useMapStore.getState().highlightedCounties[0] ??
    countiesFromText(question)[0] ??
    (area.source !== "default" ? area.countyId : null);

  if (!countyId) {
    setAnswerPin(null);
    return;
  }
  const county = WI_COUNTIES.find((c) => c.id === countyId);
  if (!county) return;

  setAnswerPin({
    countyId,
    countyName: county.name.replace(" County", ""),
    headline: answer || (isLoading ? loadingHeadline : ""),
  });
}

export function MapSessionProvider({ children }: { children: ReactNode }) {
  const prompts = useLocalPrompts();
  const {
    starters,
    area,
    meta,
    newsItems,
    areaLoading,
    newsLoading,
    newsSentiment,
    newsMapPins,
    newsPromptsEnabled,
    setNewsPromptsEnabled,
    browserLocationEnabled,
    setBrowserLocationEnabled,
    trackStarterClick,
  } = prompts;

  const areaRef = useRef(area);
  const newsRef = useRef(newsItems);
  const sentimentRef = useRef(newsSentiment);
  areaRef.current = area;
  newsRef.current = newsItems;
  sentimentRef.current = newsSentiment;

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/agent",
        prepareSendMessagesRequest: ({ messages, body }) => ({
          body: {
            messages,
            userArea: areaRef.current,
            localNews: newsRef.current,
            areaSentiment: sentimentRef.current,
            ...body,
          },
        }),
      }),
    []
  );

  const { messages, sendMessage, status, error } = useChat<WorkwaysAgentMessage>({ transport });
  const isLoading = status === "streaming" || status === "submitted";
  const lastMessage = messages[messages.length - 1];
  const isStreamingAssistant = isLoading && lastMessage?.role === "assistant";

  const answer = latestAssistantAnswer(messages);
  const localMapAnswer = useMapStore((s) => s.localMapAnswer);
  const displayAnswer = answer || localMapAnswer?.headline || "";
  const question = latestUserQuestion(messages);
  const hasAnswer = Boolean(displayAnswer) || isLoading;
  const showAnswerStack = hasAnswer && messages.length > 0;

  const gatheringMessages = useMemo(
    () => inferAgentGatheringMessages(question),
    [question]
  );
  const loadingMessage = useRotatingMessage(isLoading ? gatheringMessages : [], 2800);

  const agentErrorInfo = useMemo(() => formatAgentError(error), [error]);

  const onMapPainted = useCallback(() => {
    syncAnswerPin(question, displayAnswer, isLoading, area, loadingMessage);
  }, [question, displayAnswer, isLoading, area, loadingMessage]);

  useLocalMapAnswer(messages, status, error, onMapPainted);

  useEffect(() => {
    syncAnswerPin(question, displayAnswer, isLoading, area, loadingMessage);
  }, [question, displayAnswer, isLoading, area, loadingMessage]);

  const value: MapSessionContextValue = {
    messages,
    sendMessage,
    isLoading,
    isStreamingAssistant,
    error,
    answer,
    question,
    hasAnswer,
    showAnswerStack,
    starters,
    area,
    meta,
    areaLoading,
    newsLoading,
    newsSentiment,
    newsMapPins,
    newsPromptsEnabled,
    setNewsPromptsEnabled,
    browserLocationEnabled,
    setBrowserLocationEnabled,
    trackStarterClick,
    gatheringMessages,
    loadingMessage,
    localMapAnswer,
    displayAnswer,
    agentError: error,
    agentErrorInfo,
  };

  return (
    <MapSessionContext.Provider value={value}>
      <AgentMapBridge messages={messages} onMapActionsApplied={onMapPainted} />
      {children}
    </MapSessionContext.Provider>
  );
}
