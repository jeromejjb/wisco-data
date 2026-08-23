"use client";

import { Newspaper, Crosshair, Loader2, type LucideIcon } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { messagesForContext } from "@/lib/loading-messages";
import { useRotatingMessage } from "@/hooks/use-rotating-message";
import type { ChatStarter } from "@/lib/agent/chat-starters";
import type { UserArea } from "@/lib/user-area";
import { useAppStore } from "@/lib/store";
import { AreaPicker } from "./area-picker";
import { PromptCarousel } from "./prompt-carousel";

type LocalPromptBarProps = {
  starters: ChatStarter[];
  area: UserArea;
  meta?: { city?: string | null; resolved?: boolean };
  areaLoading?: boolean;
  newsLoading?: boolean;
  newsPromptsEnabled: boolean;
  onNewsToggle: (enabled: boolean) => void;
  browserLocationEnabled: boolean;
  onBrowserLocationToggle: (enabled: boolean) => void;
  onPick: (starter: ChatStarter) => void;
  disabled?: boolean;
  variant?: "floating" | "dock" | "embedded";
  /** Embedded variant only: hide the starter-prompt carousel while keeping the context pills (area/news/GPS) mounted. */
  showCarousel?: boolean;
};

export function LocalPromptBar({
  starters,
  area,
  areaLoading,
  newsLoading,
  newsPromptsEnabled,
  onNewsToggle,
  browserLocationEnabled,
  onBrowserLocationToggle,
  onPick,
  disabled,
  variant = "floating",
  showCarousel = true,
}: LocalPromptBarProps) {
  const embedded = variant === "embedded";
  const setBrowserLocationEnabled = useAppStore((s) => s.setBrowserLocationEnabled);
  const setChosenArea = useAppStore((s) => s.setChosenArea);
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
        {/* Context pills — compact */}
        <div className="flex shrink-0 items-center gap-0.5">
          <AreaPicker area={area} loading={areaLoading} loadingLabel={areaLine} compact />
          <TogglePill
            checked={newsPromptsEnabled}
            onChange={onNewsToggle}
            icon={Newspaper}
            activeColor="text-amber-600"
            label="News"
            iconOnlyOnMobile
          >
            {newsPromptsEnabled && newsLoading && (
              <Loader2 className="h-2.5 w-2.5 shrink-0 animate-spin text-amber-600" />
            )}
          </TogglePill>
          <TogglePill
            checked={browserLocationEnabled}
            onChange={(enabled) => {
              onBrowserLocationToggle(enabled);
              if (enabled) setChosenArea(null);
            }}
            icon={Crosshair}
            activeColor="text-[#267a55]"
            label="GPS"
            iconOnlyOnMobile
          />
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

function TogglePill({
  checked,
  onChange,
  icon: Icon,
  activeColor,
  label,
  iconOnlyOnMobile,
  children,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  icon: LucideIcon;
  activeColor: string;
  label: string;
  iconOnlyOnMobile?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <label
      className={cn(
        "inline-flex cursor-pointer items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium transition-all duration-200 sm:px-2 sm:py-1 sm:text-[11px]",
        checked
          ? "bg-[#f4f6f9] text-[#3d4659] ring-1 ring-black/[0.06]"
          : "text-[#8b95a8] hover:bg-black/[0.03] hover:text-[#5a6278]"
      )}
    >
      <input
        type="checkbox"
        className="sr-only"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <Icon
        className={cn(
          "h-3 w-3 shrink-0 transition-colors",
          checked ? activeColor : "text-[#b0b8c8]"
        )}
      />
      <span className={cn(iconOnlyOnMobile && "hidden sm:inline")}>{label}</span>
      {children}
    </label>
  );
}
