"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Newspaper } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMapStore } from "@/lib/map-store";
import { topicLabel } from "@/lib/news-geo";
import type { NewsTopic } from "@/lib/news-types";
import { useMapSession } from "./map-session-provider";
import { overlaySpring } from "@/lib/motion";

type MapAreaSentimentProps = {
  className?: string;
};

/** Top local headline when News is on — hidden while a county panel is open. */
export function MapAreaSentiment({ className }: MapAreaSentimentProps) {
  const selectedCounty = useMapStore((s) => s.selectedCounty);
  const pins = useMapStore((s) => s.localNewsPins);
  const { showAnswerStack, newsPromptsEnabled } = useMapSession();

  const headline = pins[0];
  const open = Boolean(headline) && !selectedCounty && newsPromptsEnabled;

  return (
    <AnimatePresence>
      {open && headline && (
        <motion.div
          key={headline.id}
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={overlaySpring}
          className={cn(
            "pointer-events-none fixed left-4 top-[4.5rem] z-20 w-[min(300px,calc(100vw-2rem))] lg:top-20",
            showAnswerStack && "max-sm:hidden",
            className
          )}
        >
          <div className="pointer-events-auto rounded-xl border border-black/[0.07] bg-white/95 px-3 py-2 shadow-lg backdrop-blur-xl dark:border-white/10 dark:bg-[#0c1222]/92">
            <div className="flex items-start gap-2">
              <Newspaper className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" aria-hidden />
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-wide text-[#8b95a8] dark:text-[#b4bcc9]">
                  Local headline
                  {headline.countyName ? ` · ${headline.countyName}` : ""}
                </p>
                <p className="mt-0.5 text-[12px] font-medium leading-snug text-[#2a3344] dark:text-[#eef2f7]">
                  {headline.headline}
                </p>
                <p className="mt-1 text-[10px] text-[#8b95a8] dark:text-[#a8b0c0]">
                  {topicLabel(headline.topic as NewsTopic)} · use prompt carousel to ask about this
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
