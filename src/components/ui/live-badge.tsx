"use client";

import { cn } from "@/lib/utils";
import { Radio } from "lucide-react";

export function LiveBadge({
  className,
  label = "Live data",
}: {
  className?: string;
  label?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-forest-600/30 bg-forest-600/10 px-2.5 py-1 text-xs font-semibold text-forest-700 dark:text-forest-600",
        className
      )}
    >
      <span className="relative flex h-2 w-2">
        <span className="live-dot absolute inline-flex h-full w-full rounded-full bg-forest-600" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-forest-600" />
      </span>
      {label}
    </span>
  );
}

export function SourceChip({
  name,
  active = true,
}: {
  name: string;
  active?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-medium",
        active
          ? "bg-lake-50 text-lake-700 dark:bg-lake-900/30 dark:text-lake-100"
          : "bg-muted text-muted-foreground"
      )}
    >
      {active && <Radio className="h-3 w-3" aria-hidden />}
      {name}
    </span>
  );
}
