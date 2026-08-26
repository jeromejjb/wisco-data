"use client";

import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useRotatingMessage } from "@/hooks/use-rotating-message";

type LoaderVariant = "dark" | "light" | "pill" | "inline";

type DataGatheringLoaderProps = {
  messages: string[];
  variant?: LoaderVariant;
  subtitle?: string;
  className?: string;
  intervalMs?: number;
};

const variantStyles: Record<
  LoaderVariant,
  { wrap: string; text: string; sub: string; pulse: string }
> = {
  dark: {
    wrap: "",
    text: "text-sm text-white/80",
    sub: "text-[10px] text-white/60",
    pulse: "border-cyan-400/60 bg-cyan-400/20",
  },
  light: {
    wrap: "",
    text: "text-sm text-[#3d4659]",
    sub: "text-[11px] text-[#8b95a8]",
    pulse: "border-[#1e6b9c]/50 bg-[#1e6b9c]/10",
  },
  pill: {
    wrap: "rounded-full border border-white/30 bg-white/92 px-4 py-2.5 shadow-md backdrop-blur-md dark:border-white/12 dark:bg-[#0f1524]/92",
    text: "text-xs font-medium text-[#3d4659] dark:text-[#eef2f7]",
    sub: "text-[10px] text-[#8b95a8] dark:text-[#b4bcc9]",
    pulse: "border-[#1e6b9c]/50 bg-[#1e6b9c]/10",
  },
  inline: {
    wrap: "rounded-xl border border-black/[0.06] bg-white/95 px-3 py-2 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-[#0f1524]/95",
    text: "text-[12px] font-medium text-[#3d4659] dark:text-[#eef2f7]",
    sub: "text-[10px] text-[#8b95a8] dark:text-[#b4bcc9]",
    pulse: "border-[#1e6b9c]/50 bg-[#1e6b9c]/10",
  },
};

export function GatheringPulse({
  className,
  tone = "cyan",
}: {
  className?: string;
  tone?: "cyan" | "lake";
}) {
  const border = tone === "lake" ? "border-[#1e6b9c]/50" : "border-cyan-400/60";
  const fill = tone === "lake" ? "bg-[#1e6b9c]/15" : "bg-cyan-400/20";
  const dot = tone === "lake" ? "bg-[#1e6b9c]" : "bg-cyan-400";

  return (
    <span className={cn("relative flex h-4 w-4 shrink-0 items-center justify-center", className)}>
      <span className={cn("absolute inset-0 animate-ping rounded-full border opacity-40", border)} />
      <span className={cn("relative h-2 w-2 rounded-full", dot, fill)} />
    </span>
  );
}

export function DataGatheringLoader({
  messages,
  variant = "light",
  subtitle = "Live sources can take a few seconds",
  className,
  intervalMs = 2800,
}: DataGatheringLoaderProps) {
  const message = useRotatingMessage(messages, intervalMs);
  const styles = variantStyles[variant];
  const tone = variant === "dark" ? "cyan" : "lake";

  return (
    <div className={cn("flex flex-col gap-1", styles.wrap, className)}>
      <div className="flex items-start gap-2.5">
        <GatheringPulse tone={tone} className="mt-0.5" />
        <div className="min-w-0 flex-1">
          <AnimatePresence mode="wait">
            <motion.p
              key={message}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.14, ease: "easeOut" }}
              className={cn("leading-snug", styles.text)}
            >
              {message}
            </motion.p>
          </AnimatePresence>
          {subtitle ? <p className={cn("mt-1", styles.sub)}>{subtitle}</p> : null}
        </div>
      </div>
    </div>
  );
}
