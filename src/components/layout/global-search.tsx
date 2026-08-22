"use client";

import { useRouter } from "next/navigation";
import { Sparkles, ArrowRight } from "lucide-react";
import { useState } from "react";
import { useAgentShell } from "@/components/agent/agent-shell";
import { cn } from "@/lib/utils";

export function GlobalSearch({ compact = false }: { compact?: boolean }) {
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const router = useRouter();
  const { openAgent } = useAgentShell();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    openAgent(query.trim());
    if (window.location.pathname !== "/") {
      router.push("/");
    }
    setQuery("");
  }

  return (
    <form onSubmit={handleSubmit} className="relative w-full" role="search">
      <div
        className={cn(
          "ai-search rounded-2xl transition-all duration-300",
          focused && "ai-search-focused"
        )}
      >
        <Sparkles
          className={cn(
            "pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 transition-colors",
            focused ? "text-lake-600" : "text-muted-foreground"
          )}
          aria-hidden
        />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={
            compact ? "Ask the agent…" : "Ask anything about Wisconsin jobs & economy…"
          }
          className="flex h-11 w-full rounded-2xl border border-border/70 bg-card/90 py-2 pl-10 pr-11 text-sm backdrop-blur-sm placeholder:text-muted-foreground focus-visible:outline-none"
          aria-label="Ask the Workways Agent"
        />
        <button
          type="submit"
          disabled={!query.trim()}
          className="absolute right-1.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-xl bg-lake-600/10 text-lake-600 transition-all hover:bg-lake-600 hover:text-white disabled:opacity-30"
          aria-label="Submit question"
        >
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </form>
  );
}
