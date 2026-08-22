"use client";

import { useState, useRef, useEffect, FormEvent, memo } from "react";
import { ArrowUp, X, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { DataGatheringLoader, GatheringPulse } from "@/components/ui/data-gathering-loader";
import type { WorkwaysAgentMessage } from "@/lib/agent/workways-agent";
import { formatAssistantChatText, getMessageText } from "@/lib/agent/chat-display";
import { useAgentShell } from "./agent-shell";
import { useMapSession } from "./map-session-provider";
import { LocalPromptBar } from "./local-prompt-bar";
import type { ChatStarter } from "@/lib/agent/chat-starters";
import { usePromptHistory } from "@/hooks/use-prompt-history";

const HistoryLine = memo(function HistoryLine({ message }: { message: WorkwaysAgentMessage }) {
  const isUser = message.role === "user";
  const raw = getMessageText(message);
  const text = isUser ? raw : formatAssistantChatText(raw);
  if (!text.trim()) return null;
  return (
    <p className={cn("text-[12px] leading-relaxed", isUser ? "text-[#1e6b9c]" : "text-[#3d4659]")}>
      <span className="font-semibold">{isUser ? "You" : "AI"}:</span> {text}
    </p>
  );
});

/** Full-viewport map + bottom ask bar; answers float on map via MapAnswerStack. */
export function MapChatWidget() {
  const [input, setInput] = useState("");
  const [showHistory, setShowHistory] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { pendingPrompt, consumePendingPrompt } = useAgentShell();

  const {
    messages,
    sendMessage,
    isLoading,
    error,
    starters,
    area,
    meta,
    areaLoading,
    newsLoading,
    newsPromptsEnabled,
    setNewsPromptsEnabled,
    browserLocationEnabled,
    setBrowserLocationEnabled,
    trackStarterClick,
    hasAnswer,
    gatheringMessages,
    agentError,
    agentErrorInfo,
    localMapAnswer,
  } = useMapSession();

  const { onInputChange, handleHistoryKeyDown, resetHistory, recordPrompt } = usePromptHistory(
    messages,
    setInput
  );

  const showPrompts = !hasAnswer || !isLoading;

  useEffect(() => {
    const prompt = consumePendingPrompt();
    if (!prompt) return;
    recordPrompt(prompt);
    sendMessage({ text: prompt });
  }, [pendingPrompt, consumePendingPrompt, sendMessage, recordPrompt]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 88)}px`;
  }, [input]);

  function handleSubmit(e?: FormEvent) {
    e?.preventDefault();
    if (!input.trim() || isLoading) return;
    const text = input.trim();
    recordPrompt(text);
    sendMessage({ text });
    setInput("");
    resetHistory();
    setShowHistory(false);
    if (textareaRef.current) textareaRef.current.style.height = "auto";
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (handleHistoryKeyDown(e)) return;
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }

  function pickStarter(starter: ChatStarter) {
    if (isLoading) return;
    trackStarterClick(starter);
    recordPrompt(starter.text);
    sendMessage({ text: starter.text });
  }

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex flex-col items-center gap-2 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
      {showPrompts && (
        <LocalPromptBar
          starters={starters}
          area={area}
          meta={meta}
          areaLoading={areaLoading}
          newsLoading={newsLoading}
          newsPromptsEnabled={newsPromptsEnabled}
          onNewsToggle={setNewsPromptsEnabled}
          browserLocationEnabled={browserLocationEnabled}
          onBrowserLocationToggle={setBrowserLocationEnabled}
          onPick={pickStarter}
          disabled={isLoading}
        />
      )}

      {isLoading && (
        <div className="pointer-events-auto w-full max-w-[520px]">
          <DataGatheringLoader
            messages={gatheringMessages}
            variant="inline"
            subtitle="Hang tight — we're gathering live Wisconsin data for you"
            className="w-full"
          />
        </div>
      )}

      <div className="pointer-events-auto w-full max-w-[520px] overflow-hidden rounded-2xl border border-black/[0.06] bg-white/97 shadow-[0_8px_40px_rgba(12,18,34,0.12)] backdrop-blur-xl">
        {showHistory && messages.length > 0 && (
          <div className="max-h-[200px] space-y-2 overflow-y-auto border-b border-[#ece8e2] px-4 py-3">
            {messages.map((m) => (
              <HistoryLine key={m.id} message={m} />
            ))}
          </div>
        )}

        {agentError && !localMapAnswer && (
          <div className="border-b border-amber-100 bg-amber-50/90 px-4 py-3 dark:border-amber-900/30 dark:bg-amber-950/40">
            <p className="text-[13px] font-semibold text-amber-950 dark:text-amber-100">
              {agentErrorInfo.title}
            </p>
            <p className="mt-0.5 text-[11px] leading-snug text-amber-900/80 dark:text-amber-200/80">
              {agentErrorInfo.detail}
            </p>
          </div>
        )}

        {agentError && localMapAnswer && (
          <div className="border-b border-[#ece8e2] bg-[#f4f6f9] px-4 py-2">
            <p className="text-[11px] text-[#5a6278]">
              <span className="font-semibold text-[#3d4659]">{agentErrorInfo.title}.</span>{" "}
              Showing live listings on the map →
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="relative flex items-end px-3 py-3">
          {messages.length > 0 && (
            <button
              type="button"
              onClick={() => setShowHistory((v) => !v)}
              className="absolute bottom-3 left-3 flex h-8 w-8 items-center justify-center rounded-full text-[#8b95a8] hover:bg-[#f4f6f9]"
              aria-label="Toggle history"
            >
              {showHistory ? <X className="h-4 w-4" /> : <MessageSquare className="h-4 w-4" />}
            </button>
          )}
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => onInputChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              area.source !== "default"
                ? `Ask about ${area.displayName}, jobs, wages…`
                : "Ask about jobs, wages, or any county…"
            }
            readOnly={isLoading}
            rows={1}
            className={cn(
              "map-ask-input max-h-[88px] min-h-[24px] w-full resize-none border-0 bg-transparent py-1 pr-11 text-[15px] leading-snug text-[#0c1222] shadow-none outline-none ring-0 placeholder:text-[#8b95a8] focus:border-0 focus:outline-none focus:ring-0 focus-visible:border-0 focus-visible:!outline-none focus-visible:ring-0 read-only:cursor-default read-only:opacity-60",
              messages.length > 0 ? "pl-10" : "pl-1"
            )}
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className={cn(
              "absolute bottom-3 right-3 flex h-8 w-8 items-center justify-center rounded-full transition-all",
              input.trim() && !isLoading
                ? "bg-[#1e6b9c] text-white shadow-md hover:bg-[#185580]"
                : "bg-[#ece8e2] text-[#8b95a8]"
            )}
            aria-label="Send"
          >
            {isLoading ? (
              <GatheringPulse tone="lake" className="h-3 w-3" />
            ) : (
              <ArrowUp className="h-4 w-4" />
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
