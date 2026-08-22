"use client";

import { MapPin, Newspaper, Crosshair, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { messagesForContext } from "@/lib/loading-messages";
import { useRotatingMessage } from "@/hooks/use-rotating-message";
import { GatheringPulse } from "@/components/ui/data-gathering-loader";
import type { ChatStarter } from "@/lib/agent/chat-starters";
import type { UserArea } from "@/lib/user-area";

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
  /** Stack vertically for side dock */
  variant?: "floating" | "dock";
};

export function LocalPromptBar({
  starters,
  area,
  meta,
  areaLoading,
  newsLoading,
  newsPromptsEnabled,
  onNewsToggle,
  browserLocationEnabled,
  onBrowserLocationToggle,
  onPick,
  disabled,
  variant = "floating",
}: LocalPromptBarProps) {
  const areaLabel =
    area.source === "default"
      ? "Near Milwaukee (default)"
      : meta?.city
        ? `Near ${meta.city}`
        : `Near ${area.displayName}`;

  const areaLine = useRotatingMessage(areaLoading ? messagesForContext("location") : [], 2400);

  return (
    <div
      className={cn(
        "pointer-events-auto flex w-full flex-col gap-2",
        variant === "floating" && "max-w-[520px] items-center"
      )}
    >
      <div
        className={cn(
          "flex flex-wrap gap-2",
          variant === "floating" ? "justify-center" : "justify-start"
        )}
      >
        <span className="inline-flex items-center gap-1.5 rounded-full border border-black/[0.06] bg-white/92 px-3 py-1 text-[11px] font-medium text-[#3d4659] shadow-sm backdrop-blur-sm">
          {areaLoading ? (
            <GatheringPulse tone="lake" className="h-3 w-3" />
          ) : (
            <MapPin className="h-3 w-3 text-[#1e6b9c]" />
          )}
          {areaLoading ? areaLine : areaLabel}
        </span>

        <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-black/[0.06] bg-white/92 px-3 py-1 text-[11px] font-medium text-[#3d4659] shadow-sm backdrop-blur-sm">
          <input
            type="checkbox"
            className="sr-only"
            checked={newsPromptsEnabled}
            onChange={(e) => onNewsToggle(e.target.checked)}
          />
          <Newspaper
            className={cn("h-3 w-3", newsPromptsEnabled ? "text-amber-600" : "text-[#8b95a8]")}
          />
          <span>Local news</span>
          {newsPromptsEnabled && newsLoading && (
            <Loader2 className="h-3 w-3 animate-spin text-amber-600" />
          )}
        </label>

        <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-black/[0.06] bg-white/92 px-3 py-1 text-[11px] font-medium text-[#3d4659] shadow-sm backdrop-blur-sm">
          <input
            type="checkbox"
            className="sr-only"
            checked={browserLocationEnabled}
            onChange={(e) => onBrowserLocationToggle(e.target.checked)}
          />
          <Crosshair
            className={cn(
              "h-3 w-3",
              browserLocationEnabled ? "text-[#267a55]" : "text-[#8b95a8]"
            )}
          />
          <span>Use GPS</span>
        </label>
      </div>

      <div
        className={cn(
          "flex flex-wrap gap-2",
          variant === "floating" ? "justify-center" : "justify-start"
        )}
      >
        {starters.map((starter) => (
          <button
            key={starter.id}
            type="button"
            disabled={disabled}
            onClick={() => onPick(starter)}
            className={cn(
              "rounded-full border px-3.5 py-1.5 text-xs font-medium shadow-sm backdrop-blur-sm transition-colors disabled:opacity-50",
              starter.kind === "news"
                ? "border-amber-200/80 bg-amber-50/95 text-amber-900 hover:bg-amber-100"
                : "border-black/[0.06] bg-white/90 text-[#3d4659] hover:bg-white hover:text-[#0c1222]"
            )}
          >
            {starter.kind === "news" && (
              <Newspaper className="mr-1 inline h-3 w-3 -translate-y-px opacity-70" />
            )}
            {starter.text.length > 52 ? `${starter.text.slice(0, 49)}…` : starter.text}
          </button>
        ))}
      </div>
    </div>
  );
}
