"use client";

import { Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { messagesForContext } from "@/lib/loading-messages";
import { useRotatingMessage } from "@/hooks/use-rotating-message";
import type { ChatStarter } from "@/lib/agent/chat-starters";
import type { UserArea } from "@/lib/user-area";
import { AreaPicker } from "./area-picker";
import { PromptCarousel } from "./prompt-carousel";

type LocalPromptBarProps = {
  starters: ChatStarter[];
  area: UserArea;
  meta?: { city?: string | null; resolved?: boolean };
  areaLoading?: boolean;
  newsLoading?: boolean;
  newsPromptsEnabled: boolean;
  onPick: (starter: ChatStarter) => void;
  disabled?: boolean;
  variant?: "floating" | "dock" | "embedded";
  /** Embedded variant only: hide the starter-prompt carousel while keeping the area picker mounted. */
  showCarousel?: boolean;
};

export function LocalPromptBar({
  starters,
  area,
  areaLoading,
  newsLoading,
  newsPromptsEnabled,
  onPick,
  disabled,
  variant = "floating",
  showCarousel = true,
}: LocalPromptBarProps) {
  const embedded = variant === "embedded";
  const areaLine = useRotatingMessage(areaLoading ? messagesForContext("location") : [], 2400);
  const showNewsPlaceholder = newsPromptsEnabled && newsLoading && starters.length === 0;

  return (
    <div
      className={cn(
        "flex w-full flex-col",
        embedded ? "gap-0" : "pointer-events-auto gap-2",
        variant === "floating" && !embedded && "max-w-[520px]"
      )}
    >
      <div
        className={cn(
          "flex items-center gap-1.5",
          embedded ? "border-b border-black/[0.05] px-2.5 py-1.5 sm:px-3" : "flex-wrap justify-center px-1"
        )}
      >
        {/* Location + its settings live in one labeled menu */}
        <div className="flex shrink-0 items-center gap-1">
          <AreaPicker area={area} loading={areaLoading} loadingLabel={areaLine} compact />
          {newsPromptsEnabled && newsLoading && (
            <Loader2 className="h-3 w-3 shrink-0 animate-spin text-amber-600" aria-label="Loading local news" />
          )}
        </div>

        {embedded && showCarousel && (
          <>
            <div className="mx-0.5 hidden h-4 w-px shrink-0 bg-black/[0.08] sm:block" aria-hidden />
            <div className="min-w-0 flex-1 pb-1 pt-0.5 sm:pb-0.5">
              {showNewsPlaceholder ? (
                <motion.div
                  aria-hidden
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex h-7 items-center justify-center rounded-full bg-[#f4f6f9] px-3 sm:h-8"
                >
                  <span className="h-2.5 w-32 animate-pulse rounded-full bg-black/[0.06]" />
                </motion.div>
              ) : (
                <PromptCarousel starters={starters} onPick={onPick} disabled={disabled} />
              )}
            </div>
          </>
        )}
      </div>

      {/* Floating variant: carousel below pills */}
      {!embedded && starters.length > 0 && (
        <div className="px-0.5 pb-0.5">
          <PromptCarousel starters={starters} onPick={onPick} disabled={disabled} />
        </div>
      )}
    </div>
  );
}
