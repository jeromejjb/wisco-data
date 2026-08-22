"use client";

import { useState, useRef, useEffect, FormEvent, useMemo, memo } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { motion } from "framer-motion";
import {
  Sparkles,
  ArrowUp,
  Loader2,
  MapPin,
  Briefcase,
  TrendingUp,
  Bus,
  Map,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { WorkwaysAgentMessage } from "@/lib/agent/workways-agent";
import { AgentMapBridge } from "./agent-map-bridge";
import { useAgentShell } from "./agent-shell";
import { useSourceSync } from "@/hooks/use-source-sync";

type Category = "all" | "jobs" | "economy" | "map" | "transit";

const SUGGESTIONS: { icon: typeof Briefcase; text: string; category: Category }[] = [
  { icon: Briefcase, text: "Healthcare jobs reachable by transit in Milwaukee", category: "jobs" },
  { icon: TrendingUp, text: "Compare unemployment in Milwaukee vs Dane County", category: "economy" },
  { icon: MapPin, text: "Fly to Madison and show the opportunity index", category: "map" },
  { icon: Bus, text: "What's Wisconsin's economic snapshot right now?", category: "transit" },
  { icon: Briefcase, text: "Manufacturing jobs under a 45-minute commute", category: "jobs" },
  { icon: MapPin, text: "Highlight Kenosha and Racine counties", category: "map" },
];

const TOOL_LABELS: Record<string, string> = {
  flyToMap: "Flying to location",
  setMapChoropleth: "Painting data layer",
  highlightCounties: "Highlighting counties",
  searchJobsMap: "Plotting job markers",
  getEconomySnapshot: "Loading economy data",
  getCountyEconomy: "Fetching county stats",
  compareCounties: "Comparing counties",
  drawTransitRoute: "Drawing route",
  getTransitSnapshot: "Loading GTFS transit",
  refreshLiveData: "Refreshing live sources",
  getDataSourceStatus: "Checking source status",
};

const CATEGORIES: { id: Category; label: string }[] = [
  { id: "all", label: "All" },
  { id: "jobs", label: "Jobs" },
  { id: "economy", label: "Economy" },
  { id: "map", label: "Map" },
  { id: "transit", label: "Transit" },
];

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 px-1 py-2">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="h-2 w-2 rounded-full bg-lake-600/70"
          animate={{ opacity: [0.35, 1, 0.35], y: [0, -3, 0] }}
          transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.15 }}
        />
      ))}
    </div>
  );
}

function ToolActivity({ message }: { message: WorkwaysAgentMessage }) {
  const tools = message.parts.filter(
    (p) => p.type.startsWith("tool-") && (p as { state?: string }).state
  ) as { type: string; state: string; toolCallId: string }[];

  if (tools.length === 0) return null;

  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {tools.map((t) => {
        const name = t.type.replace("tool-", "");
        const done = t.state === "output-available";
        return (
          <span
            key={t.toolCallId}
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-medium",
              done
                ? "bg-forest-600/10 text-forest-700 dark:text-forest-400"
                : "bg-lake-600/10 text-lake-700 dark:text-lake-400"
            )}
          >
            {done ? <Map className="h-2.5 w-2.5" /> : <Loader2 className="h-2.5 w-2.5 animate-spin" />}
            {TOOL_LABELS[name] ?? name}
          </span>
        );
      })}
    </div>
  );
}

const MessageBubble = memo(function MessageBubble({
  message,
  isStreaming,
}: {
  message: WorkwaysAgentMessage;
  isStreaming?: boolean;
}) {
  const isUser = message.role === "user";
  const textParts = message.parts.filter((p) => p.type === "text");
  const hasText = textParts.some((p) => p.type === "text" && p.text.trim());

  if (isUser) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex justify-end gap-2.5"
      >
        <div className="max-w-[88%] rounded-2xl rounded-br-md bg-lake-600 px-4 py-3 text-sm leading-relaxed text-white shadow-md shadow-lake-600/20">
          {textParts.map((p, i) =>
            p.type === "text" ? <p key={i}>{p.text}</p> : null
          )}
        </div>
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <User className="h-4 w-4" />
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex gap-2.5"
    >
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-lake-600 to-forest-600 text-white shadow-md">
        <Sparkles className="h-3.5 w-3.5" />
      </div>
      <div className="min-w-0 max-w-[92%]">
        <div className="rounded-2xl rounded-tl-md border border-border/60 bg-card/80 px-4 py-3 text-sm leading-relaxed shadow-sm backdrop-blur-sm">
          {hasText ? (
            textParts.map((p, i) =>
              p.type === "text" ? (
                <p key={i} className="whitespace-pre-wrap text-foreground/90">
                  {p.text}
                  {isStreaming && i === textParts.length - 1 && (
                    <span className="ml-0.5 inline-block h-4 w-0.5 animate-pulse bg-lake-600 align-middle" />
                  )}
                </p>
              ) : null
            )
          ) : isStreaming ? (
            <TypingIndicator />
          ) : null}
          <ToolActivity message={message} />
        </div>
      </div>
    </motion.div>
  );
});

function WelcomeScreen({
  category,
  onCategory,
  onSelect,
  compact,
}: {
  category: Category;
  onCategory: (c: Category) => void;
  onSelect: (text: string) => void;
  compact?: boolean;
}) {
  const filtered = useMemo(
    () =>
      category === "all"
        ? SUGGESTIONS.slice(0, 4)
        : SUGGESTIONS.filter((s) => s.category === category),
    [category]
  );

  return (
    <div
      className={cn(
        "flex flex-col items-center px-2 text-center",
        compact ? "py-3" : "py-6"
      )}
    >
      {!compact && (
        <div className="agent-orb mb-5 flex h-16 w-16 items-center justify-center rounded-3xl">
          <Sparkles className="h-7 w-7 text-white" />
        </div>
      )}
      <h3
        className={cn(
          "font-display font-bold tracking-tight",
          compact ? "text-sm" : "text-xl"
        )}
      >
        {compact ? "Ask Wisconsin anything" : "What do you want to explore?"}
      </h3>
      {!compact && (
        <p className="mt-2 max-w-[280px] text-sm leading-relaxed text-muted-foreground">
          Ask in plain language. I&apos;ll search live data and paint the answer on the map.
        </p>
      )}

      <div className={cn("flex flex-wrap justify-center gap-1.5", compact ? "mt-3" : "mt-6")}>
        {CATEGORIES.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => onCategory(id)}
            className={cn(
              "rounded-full px-3 py-1.5 text-xs font-semibold transition-all",
              category === id
                ? "bg-lake-600 text-white shadow-md shadow-lake-600/25"
                : "bg-muted/80 text-muted-foreground hover:bg-muted"
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <div className={cn("grid w-full gap-2", compact ? "mt-3 max-w-none" : "mt-5 max-w-sm")}>
        {filtered.map(({ icon: Icon, text }) => (
          <button
            key={text}
            type="button"
            onClick={() => onSelect(text)}
            className={cn(
              "group flex items-start gap-3 rounded-2xl border border-border/50 bg-background/60 text-left text-sm transition-all hover:border-lake-600/30 hover:bg-lake-600/5",
              compact
                ? "px-3 py-2.5 hover:shadow-md"
                : "px-4 py-3.5 hover:-translate-y-0.5 hover:shadow-lg"
            )}
          >
            <span
              className={cn(
                "flex shrink-0 items-center justify-center rounded-xl bg-lake-600/10 text-lake-600 transition-colors group-hover:bg-lake-600 group-hover:text-white",
                compact ? "mt-0 h-7 w-7" : "mt-0.5 h-8 w-8"
              )}
            >
              <Icon className={compact ? "h-3.5 w-3.5" : "h-4 w-4"} />
            </span>
            <span className="leading-snug text-foreground/85">{text}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

type WorkwaysAgentPanelProps = {
  className?: string;
  onMapFocus?: () => void;
  variant?: "default" | "overlay";
};

export function WorkwaysAgentPanel({
  className,
  onMapFocus,
  variant = "default",
}: WorkwaysAgentPanelProps) {
  const isOverlay = variant === "overlay";
  const [input, setInput] = useState("");
  const [category, setCategory] = useState<Category>("all");
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { pendingPrompt, consumePendingPrompt } = useAgentShell();
  const { sources, agent, staleCount, lastRefresh, refresh, isLoading: sourcesLoading } =
    useSourceSync({ autoRefresh: true, pollMs: 120_000, autoRefreshDelayMs: 10_000 });

  const transport = useMemo(() => new DefaultChatTransport({ api: "/api/agent" }), []);

  const { messages, sendMessage, status, error } = useChat<WorkwaysAgentMessage>({
    transport,
  });

  const isLoading = status === "streaming" || status === "submitted";
  const lastMessage = messages[messages.length - 1];
  const isStreamingAssistant =
    isLoading && lastMessage?.role === "assistant";

  useEffect(() => {
    const prompt = consumePendingPrompt();
    if (prompt) sendMessage({ text: prompt });
  }, [pendingPrompt, consumePendingPrompt, sendMessage]);

  const scrollRafRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (scrollRafRef.current) cancelAnimationFrame(scrollRafRef.current);
    scrollRafRef.current = requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: isLoading ? "instant" : "smooth",
      });
    });
    return () => {
      if (scrollRafRef.current) cancelAnimationFrame(scrollRafRef.current);
    };
  }, [messages, isLoading]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }, [input]);

  function handleSubmit(e?: FormEvent) {
    e?.preventDefault();
    if (!input.trim() || isLoading) return;
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

  function handleSuggestion(text: string) {
    if (isLoading) return;
    sendMessage({ text });
  }

  return (
    <div className={cn("flex h-full min-h-0 flex-col", className)}>
      <AgentMapBridge messages={messages} onMapActionsApplied={onMapFocus} />

      {/* Panel header — compact when floating on the map */}
      <div
        className={cn(
          "shrink-0 border-b border-border/40",
          isOverlay ? "hidden px-3 py-2 lg:block" : "px-4 py-3.5"
        )}
      >
        <div className="flex items-center gap-2.5">
          <div
            className={cn(
              "agent-orb flex shrink-0 items-center justify-center rounded-xl",
              isOverlay ? "h-7 w-7" : "h-9 w-9"
            )}
          >
            <Sparkles className={cn("text-white", isOverlay ? "h-3.5 w-3.5" : "h-4 w-4")} />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className={cn("font-display font-bold", isOverlay ? "text-sm" : "text-base")}>
              Workways Agent
            </h2>
            <p className="truncate text-[11px] text-muted-foreground">
              {isLoading
                ? "Updating map…"
                : isOverlay
                  ? "Answers paint the map behind you"
                  : agent
                    ? `${agent.provider} · ${agent.modelId}`
                    : "Live Wisconsin intelligence"}
              {!isOverlay && lastRefresh && !isLoading && (
                <span className="text-muted-foreground/70">
                  {" "}
                  · synced {new Date(lastRefresh).toLocaleTimeString()}
                </span>
              )}
            </p>
          </div>
          {!isOverlay && (
            <div className="flex items-center gap-2">
              {staleCount > 0 && !sourcesLoading && (
                <button
                  type="button"
                  onClick={() => refresh("stale")}
                  className="rounded-full bg-accent-500/15 px-2 py-1 text-[10px] font-semibold text-accent-600 hover:bg-accent-500/25"
                >
                  Refresh {staleCount}
                </button>
              )}
              <div className="flex items-center gap-1.5 rounded-full bg-forest-600/10 px-2.5 py-1">
                <span className="live-dot h-1.5 w-1.5 rounded-full bg-forest-600" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-forest-700 dark:text-forest-400">
                  {sources.filter((s) => s.configured).length} sources
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        className={cn(
          "min-h-0 flex-1 space-y-4 overflow-y-auto scroll-smooth",
          isOverlay ? "px-3 py-3" : "space-y-5 px-4 py-5"
        )}
      >
        {messages.length === 0 ? (
          <WelcomeScreen
            category={category}
            onCategory={setCategory}
            onSelect={handleSuggestion}
            compact={isOverlay}
          />
        ) : (
          <>
            {messages.map((message, idx) => (
              <MessageBubble
                key={message.id}
                message={message}
                isStreaming={isStreamingAssistant && idx === messages.length - 1}
              />
            ))}
            {isLoading && lastMessage?.role === "user" && (
              <div className="flex gap-2.5">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-lake-600 to-forest-600 text-white">
                  <Sparkles className="h-3.5 w-3.5" />
                </div>
                <div className="rounded-2xl rounded-tl-md border border-border/60 bg-card/80 px-4 py-3">
                  <TypingIndicator />
                </div>
              </div>
            )}
          </>
        )}

        {error && (
          <div className="rounded-2xl border border-danger/25 bg-danger/5 px-4 py-3 text-sm text-danger">
            {error.message.includes("503") ||
            error.message.includes("GOOGLE") ||
            error.message.includes("OPENAI")
              ? "Add GOOGLE_GENERATIVE_AI_API_KEY (free at aistudio.google.com/apikey) to .env and restart."
              : error.message}
          </div>
        )}
      </div>

      {/* Composer */}
      <div
        className={cn(
          "shrink-0 border-t border-border/40 p-3",
          isOverlay ? "bg-transparent" : "border-border/60 bg-muted/20"
        )}
      >
        <form onSubmit={handleSubmit} className="relative">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about jobs, counties, wages, transit…"
            disabled={isLoading}
            rows={1}
            className="max-h-[120px] min-h-[48px] w-full resize-none rounded-2xl border border-border/80 bg-card py-3 pl-4 pr-12 text-sm leading-relaxed shadow-sm outline-none transition-all placeholder:text-muted-foreground focus:border-lake-600/50 focus:ring-2 focus:ring-lake-600/15 disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className={cn(
              "absolute bottom-2 right-2 flex h-8 w-8 items-center justify-center rounded-xl transition-all",
              input.trim() && !isLoading
                ? "bg-lake-600 text-white shadow-md hover:bg-lake-700"
                : "bg-muted text-muted-foreground"
            )}
            aria-label="Send"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ArrowUp className="h-4 w-4" />
            )}
          </button>
        </form>
        {!isOverlay && (
          <p className="mt-2 px-1 text-[10px] text-muted-foreground">
            Enter to send · Shift+Enter for new line
          </p>
        )}
      </div>
    </div>
  );
}
