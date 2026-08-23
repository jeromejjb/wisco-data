"use client";

import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence, type PanInfo } from "framer-motion";
import { ChevronLeft, ChevronRight, Newspaper, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { starterDisplayText, type ChatStarter } from "@/lib/agent/chat-starters";

const AUTO_ADVANCE_MS = 4800;

type PromptCarouselProps = {
  starters: ChatStarter[];
  onPick: (starter: ChatStarter) => void;
  disabled?: boolean;
};

export function PromptCarousel({ starters, onPick, disabled }: PromptCarouselProps) {
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const [paused, setPaused] = useState(false);

  const count = starters.length;
  const current = starters[index];

  const go = useCallback(
    (delta: number) => {
      if (count <= 1) return;
      setDirection(delta);
      setIndex((i) => (i + delta + count) % count);
    },
    [count]
  );

  useEffect(() => {
    setIndex(0);
    setDirection(1);
  }, [starters.map((s) => s.id).join("|")]);

  useEffect(() => {
    if (paused || disabled || count <= 1) return;
    const timer = window.setInterval(() => go(1), AUTO_ADVANCE_MS);
    return () => window.clearInterval(timer);
  }, [paused, disabled, count, go]);

  if (!count || !current) return null;

  const slideVariants = {
    enter: (d: number) => ({
      opacity: 0,
      x: d > 0 ? 20 : -20,
      filter: "blur(3px)",
    }),
    center: {
      opacity: 1,
      x: 0,
      filter: "blur(0px)",
    },
    exit: (d: number) => ({
      opacity: 0,
      x: d > 0 ? -20 : 20,
      filter: "blur(3px)",
    }),
  };

  return (
    <div
      className="relative flex min-w-0 flex-1 items-center"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      {count > 1 && (
        <CarouselNav direction="prev" onClick={() => go(-1)} disabled={disabled} />
      )}

      <div className="relative mx-0.5 h-7 min-w-0 flex-1 overflow-hidden sm:h-8">
        <AnimatePresence custom={direction} mode="wait" initial={false}>
          <motion.button
            key={current.id}
            type="button"
            disabled={disabled}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ type: "spring", stiffness: 460, damping: 36 }}
            drag={count > 1 ? "x" : false}
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.12}
            onDragEnd={(_e, info: PanInfo) => {
              if (info.offset.x < -36) go(1);
              else if (info.offset.x > 36) go(-1);
            }}
            onClick={() => onPick(current)}
            title={current.text}
            className={cn(
              "absolute inset-0 flex w-full items-center justify-center gap-1.5 rounded-full px-3 disabled:opacity-50",
              current.kind === "news"
                ? "bg-amber-50/90 text-[11px] font-medium text-amber-950 ring-1 ring-amber-200/60"
                : "bg-[#f4f6f9]/95 text-[11px] font-medium text-[#2a3344] ring-1 ring-black/[0.05] sm:text-[12px]"
            )}
          >
            {current.kind === "news" ? (
              <Newspaper className="h-3 w-3 shrink-0 text-amber-600" aria-hidden />
            ) : (
              <Sparkles className="h-3 w-3 shrink-0 text-[#1e6b9c]/70" aria-hidden />
            )}
            <span className="truncate">{starterDisplayText(current)}</span>
          </motion.button>
        </AnimatePresence>
      </div>

      {count > 1 && (
        <CarouselNav direction="next" onClick={() => go(1)} disabled={disabled} />
      )}

      {count > 1 && (
        <div
          className="pointer-events-none absolute -bottom-1 left-1/2 flex -translate-x-1/2 gap-0.5"
          aria-hidden
        >
          {starters.map((s, i) => (
            <motion.span
              key={s.id}
              animate={{
                width: i === index ? 10 : 3,
                opacity: i === index ? 0.55 : 0.2,
              }}
              transition={{ type: "spring", stiffness: 500, damping: 32 }}
              className="h-0.5 rounded-full bg-[#1e6b9c]"
            />
          ))}
        </div>
      )}
    </div>
  );
}

function CarouselNav({
  direction,
  onClick,
  disabled,
}: {
  direction: "prev" | "next";
  onClick: () => void;
  disabled?: boolean;
}) {
  const Icon = direction === "prev" ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      aria-label={direction === "prev" ? "Previous suggestion" : "Next suggestion"}
      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[#9aa3b5] transition-colors hover:bg-black/[0.04] hover:text-[#3d4659] disabled:opacity-40"
    >
      <Icon className="h-3.5 w-3.5" />
    </button>
  );
}
