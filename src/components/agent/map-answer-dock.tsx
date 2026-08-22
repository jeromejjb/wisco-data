"use client";

import {
  useState,
  useRef,
  useEffect,
  FormEvent,
  useMemo,
  memo,
  useCallback,
} from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowUp,
  Loader2,
  ChevronDown,
  ChevronUp,
  Map,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { WorkwaysAgentMessage } from "@/lib/agent/workways-agent";
import type { UserArea } from "@/lib/user-area";
import type { AreaNewsItem, ChatStarter } from "@/lib/agent/chat-starters";
import { formatAssistantChatText, getMessageText } from "@/lib/agent/chat-display";
import { AgentMapBridge } from "./agent-map-bridge";
import { useAgentShell } from "./agent-shell";
import { useLocalMapAnswer } from "./use-local-map-answer";
import { useLocalPrompts } from "@/hooks/use-local-prompts";
import { LocalPromptBar } from "./local-prompt-bar";
import { MapInsightPanel } from "./map-insight-panel";

const DOCK_WIDTH = 380;

type MapAnswerDockProps = {
  onLayoutChange?: (inset: { right: number; bottom: number }) => void;
};

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
    const m = messages[i];
    if (m.role === "user") return getMessageText(m).trim();
  }
  return "";
}

export function MapAnswerDock({ onLayoutChange }: MapAnswerDockProps) {
  const [input, setInput] = useState("");
  const [mobileExpanded, setMobileExpanded] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { pendingPrompt, consumePendingPrompt } = useAgentShell();

  const prompts = useLocalPrompts();
  const {
    starters,
    area,
    meta,
    newsItems,
    areaLoading,
    newsLoading,
    newsPromptsEnabled,
    setNewsPromptsEnabled,
    browserLocationEnabled,
    setBrowserLocationEnabled,
    trackStarterClick,
  } = prompts;

  const areaRef = useRef<UserArea>(area);
  const newsRef = useRef<AreaNewsItem[]>(newsItems);
  areaRef.current = area;
  newsRef.current = newsItems;

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/agent",
        prepareSendMessagesRequest: ({ messages, body }) => ({
          body: {
            messages,
            userArea: areaRef.current,
            localNews: newsRef.current,
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
  const question = latestUserQuestion(messages);
  const hasAnswer = Boolean(answer) || isLoading;
  const showAnswerHero = hasAnswer && (answer || isLoading);

  const handleMapPainted = useCallback(() => {
    setMobileExpanded(true);
  }, []);

  useLocalMapAnswer(messages, status, undefined, handleMapPainted);

  useEffect(() => {
    onLayoutChange?.({
      right: typeof window !== "undefined" && window.matchMedia("(min-width: 1024px)").matches
        ? DOCK_WIDTH
        : 0,
      bottom:
        typeof window !== "undefined" && !window.matchMedia("(min-width: 1024px)").matches
          ? mobileExpanded && hasAnswer
            ? 220
            : 120
          : 0,
    });
  }, [onLayoutChange, mobileExpanded, hasAnswer]);

  useEffect(() => {
    const prompt = consumePendingPrompt();
    if (prompt) {
      setMobileExpanded(true);
      sendMessage({ text: prompt });
    }
  }, [pendingPrompt, consumePendingPrompt, sendMessage]);

  useEffect(() => {
    if (isLoading) setMobileExpanded(true);
  }, [isLoading]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, showHistory, isLoading]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 96)}px`;
  }, [input]);

  function handleSubmit(e?: FormEvent) {
    e?.preventDefault();
    if (!input.trim() || isLoading) return;
    setMobileExpanded(true);
    sendMessage({ text: input.trim() });
    setInput("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }

  function pickStarter(starter: ChatStarter) {
    if (isLoading) return;
    trackStarterClick(starter);
    setMobileExpanded(true);
    sendMessage({ text: starter.text });
  }

  const inputForm = (
    <form onSubmit={handleSubmit} className="relative flex items-end gap-2">
      <textarea
        ref={textareaRef}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={
          area.source !== "default"
            ? `Ask about ${area.displayName}…`
            : "Ask about jobs, wages, counties…"
        }
        disabled={isLoading}
        rows={1}
        className="max-h-[96px] min-h-[40px] flex-1 resize-none rounded-xl border border-black/[0.06] bg-white px-3.5 py-2.5 text-[15px] leading-snug text-[#0c1222] outline-none ring-lake-500/30 placeholder:text-[#8b95a8] focus:ring-2 disabled:opacity-50 dark:border-white/10 dark:bg-navy-950/50 dark:text-white"
      />
      <button
        type="submit"
        disabled={!input.trim() || isLoading}
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-all",
          input.trim() && !isLoading
            ? "bg-[#1e6b9c] text-white shadow-md hover:bg-[#185580]"
            : "bg-[#ece8e2] text-[#8b95a8]"
        )}
        aria-label="Send"
      >
        {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUp className="h-4 w-4" />}
      </button>
    </form>
  );

  return (
    <>
      <AgentMapBridge messages={messages} onMapActionsApplied={handleMapPainted} />

      {/* Desktop: fixed right companion rail — map insets, never covers center */}
      <aside
        className="pointer-events-none fixed inset-y-0 right-0 z-40 hidden w-[380px] lg:block"
        aria-label="Map answers"
      >
        <div className="pointer-events-auto flex h-full flex-col border-l border-black/[0.06] bg-white/92 shadow-[-8px_0_40px_rgba(12,18,34,0.06)] backdrop-blur-xl dark:border-white/10 dark:bg-navy-950/92">
          <header className="shrink-0 border-b border-black/[0.05] px-4 py-3 dark:border-white/10">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#1e6b9c] to-[#267a55] text-white">
                <Sparkles className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-semibold text-[#0c1222] dark:text-white">Workways</p>
                <p className="text-[11px] text-[#5a6278]">Answer · map companion</p>
              </div>
            </div>
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
            <MapInsightPanel className="mb-4" />

            <AnimatePresence mode="wait">
              {showAnswerHero && (
                <motion.section
                  key={answer || "loading"}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ type: "spring", stiffness: 380, damping: 32 }}
                  className="mb-4"
                >
                  {question && (
                    <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-[#8b95a8]">
                      You asked
                    </p>
                  )}
                  {question && (
                    <p className="mb-3 text-[13px] font-medium leading-snug text-[#3d4659] dark:text-white/80">
                      &ldquo;{question}&rdquo;
                    </p>
                  )}
                  <div className="rounded-2xl border border-lake-500/20 bg-gradient-to-br from-[#f0f9ff] to-white p-4 shadow-sm dark:from-lake-950/40 dark:to-navy-950/60">
                    <div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.14em] text-lake-600">
                      <Map className="h-3.5 w-3.5" />
                      Answer on map
                    </div>
                    {isLoading && !answer ? (
                      <div className="flex items-center gap-2 text-sm text-[#5a6278]">
                        <Loader2 className="h-4 w-4 animate-spin text-[#1e6b9c]" />
                        Painting your answer…
                      </div>
                    ) : (
                      <p className="font-display text-[17px] font-semibold leading-relaxed text-[#0c1222] dark:text-white">
                        {answer}
                        {isStreamingAssistant && (
                          <span className="ml-0.5 inline-block h-4 w-0.5 animate-pulse bg-[#1e6b9c] align-middle" />
                        )}
                      </p>
                    )}
                  </div>
                </motion.section>
              )}
            </AnimatePresence>

            {messages.length > 1 && (
              <button
                type="button"
                onClick={() => setShowHistory((v) => !v)}
                className="mb-3 flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-xs font-medium text-[#5a6278] hover:bg-black/[0.03]"
              >
                {showHistory ? "Hide" : "Show"} conversation
                {showHistory ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
            )}

            {showHistory && (
              <div ref={scrollRef} className="mb-4 max-h-48 space-y-2 overflow-y-auto text-[13px]">
                {messages.map((m) => (
                  <HistoryLine key={m.id} message={m} />
                ))}
              </div>
            )}

            {error && (
              <p className="mb-3 rounded-xl bg-red-50 px-3 py-2 text-xs text-red-700">{error.message}</p>
            )}

            {!hasAnswer && (
              <div className="mb-4">
                <LocalPromptBar
                  variant="dock"
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
              </div>
            )}
          </div>

          <footer className="shrink-0 space-y-3 border-t border-black/[0.05] p-4 dark:border-white/10">
            {hasAnswer && (
              <div className="flex flex-wrap gap-1.5">
                {starters.slice(0, 3).map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    disabled={isLoading}
                    onClick={() => pickStarter(s)}
                    className="rounded-full border border-black/[0.06] bg-[#f4f6f9] px-2.5 py-1 text-[11px] font-medium text-[#3d4659] hover:bg-white"
                  >
                    {s.text.length > 36 ? `${s.text.slice(0, 33)}…` : s.text}
                  </button>
                ))}
              </div>
            )}
            {inputForm}
          </footer>
        </div>
      </aside>

      {/* Mobile: bottom companion sheet — peek height, map stays visible above */}
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-50 lg:hidden">
        <motion.div
          layout
          className={cn(
            "pointer-events-auto mx-auto w-full max-w-lg overflow-hidden rounded-t-3xl border border-black/[0.06] bg-white/95 shadow-[0_-12px_48px_rgba(12,18,34,0.14)] backdrop-blur-xl dark:bg-navy-950/95",
            mobileExpanded && hasAnswer ? "max-h-[min(46dvh,420px)]" : "max-h-[140px]"
          )}
        >
          <button
            type="button"
            className="flex w-full justify-center py-2"
            onClick={() => hasAnswer && setMobileExpanded((v) => !v)}
            aria-label={mobileExpanded ? "Collapse answer" : "Expand answer"}
          >
            <span className="h-1 w-10 rounded-full bg-black/10" />
          </button>

          <div className="overflow-y-auto px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <AnimatePresence>
              {showAnswerHero && mobileExpanded && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mb-3 overflow-hidden"
                >
                  <MapInsightPanel compact className="mb-3" />
                  <div className="rounded-2xl bg-gradient-to-br from-[#f0f9ff] to-white p-3.5 dark:from-lake-950/40">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-lake-600">
                      Answer
                    </p>
                    <p className="mt-1 text-[16px] font-semibold leading-snug text-[#0c1222] dark:text-white">
                      {answer || "Updating map…"}
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {!hasAnswer && (
              <div className="mb-2">
                <LocalPromptBar
                  starters={starters.slice(0, 3)}
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
              </div>
            )}

            {inputForm}
          </div>
        </motion.div>
      </div>
    </>
  );
}

const HistoryLine = memo(function HistoryLine({ message }: { message: WorkwaysAgentMessage }) {
  const isUser = message.role === "user";
  const raw = getMessageText(message);
  const text = isUser ? raw : formatAssistantChatText(raw);
  if (!text.trim()) return null;
  return (
    <p className={cn("rounded-lg px-2 py-1", isUser ? "text-[#1e6b9c]" : "text-[#3d4659]")}>
      <span className="font-medium">{isUser ? "You" : "AI"}:</span> {text}
    </p>
  );
});

export { DOCK_WIDTH };
