"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Newspaper } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AreaSentimentSnapshot, NewsTopic } from "@/lib/news-types";
import { topicLabel } from "@/lib/news-geo";

const TONE_STYLES = {
  upbeat: "from-emerald-500/20 to-teal-500/10 text-emerald-100 border-emerald-400/30",
  mixed: "from-amber-500/20 to-orange-500/10 text-amber-50 border-amber-400/30",
  cautious: "from-stone-500/20 to-stone-400/10 text-stone-100 border-stone-400/25",
  concerned: "from-rose-500/20 to-red-500/10 text-rose-50 border-rose-400/30",
} as const;

type MapAreaSentimentProps = {
  sentiment: AreaSentimentSnapshot | null;
  className?: string;
};

export function MapAreaSentiment({ sentiment, className }: MapAreaSentimentProps) {
  return (
    <AnimatePresence>
      {sentiment && (
        <motion.div
          key="area-sentiment"
          initial={{ opacity: 0, y: -8, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ type: "spring", stiffness: 420, damping: 32 }}
          className={cn(
            "pointer-events-none fixed left-4 top-[4.5rem] z-30 w-[min(280px,calc(100vw-2rem))] lg:top-20",
            className
          )}
        >
          <div
            className={cn(
              "pointer-events-auto overflow-hidden rounded-2xl border bg-gradient-to-br shadow-[0_10px_40px_rgba(12,18,34,0.28)] backdrop-blur-xl",
              TONE_STYLES[sentiment.tone]
            )}
          >
            <div className="flex items-start gap-2.5 px-3.5 py-3">
              <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-black/20">
                <Newspaper className="h-3.5 w-3.5" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] opacity-70">
                  {sentiment.areaName} vibe
                </p>
                <p className="font-display text-[15px] font-semibold leading-snug">
                  {sentiment.vibe}
                </p>
                <p className="mt-1 text-[11px] leading-snug opacity-85">{sentiment.oneLiner}</p>
                {sentiment.topics.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {sentiment.topics.slice(0, 3).map((t) => (
                      <span
                        key={t}
                        className="rounded-full bg-black/15 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide"
                      >
                        {formatTopicTag(t)}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function formatTopicTag(tag: string): string {
  const known = ["jobs", "economy", "civic", "community", "general"] as const;
  if (known.includes(tag as NewsTopic)) return topicLabel(tag as NewsTopic);
  return tag.replace(/-/g, " ");
}
