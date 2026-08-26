"use client";

import { motion } from "framer-motion";
import { ExternalLink } from "lucide-react";
import type { AreaNewsItem } from "@/lib/news-types";
import { AnswerCard, AnswerSectionHeader } from "./answer-panel-chrome";

type MapBizJournalPanelProps = {
  stories: AreaNewsItem[];
  areaLabel?: string;
};

const listVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06, delayChildren: 0.05 } },
};

const itemVariants = {
  hidden: { opacity: 0, x: -10 },
  visible: { opacity: 1, x: 0, transition: { type: "spring" as const, stiffness: 320, damping: 28 } },
};

export function MapBizJournalPanel({ stories, areaLabel }: MapBizJournalPanelProps) {
  if (!stories.length) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="pointer-events-auto"
    >
      <AnswerCard>
        <AnswerSectionHeader
          label="Business journals"
          meta={
            areaLabel ? (
              <span className="text-[10px] font-medium text-white/45">{areaLabel}</span>
            ) : undefined
          }
        />
        <motion.ul
          variants={listVariants}
          initial="hidden"
          animate="visible"
          className="space-y-2 px-4 py-3"
        >
          {stories.slice(0, 5).map((story) => (
            <motion.li
              key={story.id}
              variants={itemVariants}
              whileHover={{ y: -3, scale: 1.012 }}
              transition={{ type: "spring", stiffness: 400, damping: 24 }}
              className="group relative overflow-hidden rounded-xl border border-white/8 bg-gradient-to-br from-white/[0.06] to-white/[0.02] px-3.5 py-3 shadow-[0_2px_10px_rgba(0,0,0,0.15)] transition-[border-color,box-shadow] hover:border-amber-300/25 hover:shadow-[0_10px_28px_rgba(251,191,36,0.1)]"
            >
              <span
                className="absolute inset-y-0 left-0 w-[3px] bg-gradient-to-b from-amber-300 to-orange-500 opacity-0 transition-opacity group-hover:opacity-100"
                aria-hidden
              />
              <p className="inline-flex rounded-full bg-amber-400/10 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-amber-300/90 ring-1 ring-amber-400/20">
                {story.publisher ?? "Wisconsin business"}
              </p>
              {story.url ? (
                <a
                  href={story.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1.5 flex items-start gap-1.5 text-[13px] font-medium leading-snug text-white hover:text-cyan-200"
                >
                  <span className="min-w-0 flex-1">{story.title}</span>
                  <ExternalLink className="mt-0.5 h-3 w-3 shrink-0 opacity-40 transition-transform group-hover:translate-x-0.5 group-hover:translate-y-[-1px] group-hover:opacity-90" />
                </a>
              ) : (
                <p className="mt-1.5 text-[13px] font-medium leading-snug text-white">{story.title}</p>
              )}
              {story.summary && (
                <p className="mt-1 text-[11px] leading-relaxed text-white/50">
                  {story.summary}
                </p>
              )}
              {story.countyName && (
                <p className="mt-1.5 text-[10px] text-white/35">{story.countyName} area</p>
              )}
            </motion.li>
          ))}
        </motion.ul>
      </AnswerCard>
    </motion.div>
  );
}
