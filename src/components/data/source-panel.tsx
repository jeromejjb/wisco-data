"use client";

import { motion } from "framer-motion";
import { Database, ExternalLink, Info } from "lucide-react";
import type { DataProvenance } from "@/lib/types";
import { LiveBadge, SourceChip } from "@/components/ui/live-badge";
import { cn } from "@/lib/utils";

const LIVE_SOURCES = [
  { id: "bls", name: "BLS LAUS & QCEW", url: "https://www.bls.gov/" },
  { id: "dwd", name: "Wisconsin DWD WisConomy", url: "https://jobcenterofwisconsin.com/wisconomy/" },
  { id: "gtfs-mcts", name: "MCTS GTFS", url: "https://www.ridemcts.com/" },
  { id: "gtfs-madison", name: "Madison Metro GTFS", url: "https://www.cityofmadison.com/metro/" },
  { id: "usajobs", name: "USAJobs", url: "https://developer.usajobs.gov/" },
  { id: "census", name: "Census ACS", url: "https://api.census.gov/" },
  { id: "fred", name: "FRED", url: "https://fred.stlouisfed.org/" },
];

export function SourcePanel({
  provenance,
  activeSources = ["bls", "dwd"],
  className,
  compact = false,
}: {
  provenance: DataProvenance;
  activeSources?: string[];
  className?: string;
  compact?: boolean;
}) {
  const updated = new Date(provenance.lastUpdated).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  if (compact) {
    return (
      <div className={cn("flex flex-wrap items-center gap-2 text-xs text-muted-foreground", className)}>
        <LiveBadge label="Live" />
        <span>Updated {updated}</span>
        <span className="hidden sm:inline">· {provenance.confidence} confidence</span>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn("glass-panel rounded-2xl p-5", className)}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-lake-600/10">
            <Database className="h-4 w-4 text-lake-600" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold">Data provenance</h3>
              <LiveBadge />
            </div>
            <p className="text-xs text-muted-foreground">Updated {updated}</p>
          </div>
        </div>
        <span className="rounded-full bg-muted px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          {provenance.confidence}
        </span>
      </div>

      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{provenance.source}</p>

      {provenance.methodology && (
        <div className="mt-3 flex gap-2 rounded-xl bg-muted/50 p-3 text-xs text-muted-foreground">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <p>{provenance.methodology}</p>
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-1.5">
        {LIVE_SOURCES.map((s) => (
          <a
            key={s.id}
            href={s.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group"
          >
            <SourceChip name={s.name} active={activeSources.includes(s.id)} />
          </a>
        ))}
      </div>

      <p className="mt-3 flex items-center gap-1 text-[10px] text-muted-foreground">
        Coverage: {provenance.coverage}
        <ExternalLink className="h-3 w-3" />
      </p>
    </motion.div>
  );
}

export function PageHero({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="mesh-hero border-b border-border">
      <div className="mx-auto max-w-[1600px] px-4 py-10 lg:px-8 lg:py-14">
        {eyebrow && (
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-lake-600">
            {eyebrow}
          </p>
        )}
        <h1 className="font-display max-w-3xl text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
          {title}
        </h1>
        <p className="mt-4 max-w-2xl text-base text-muted-foreground lg:text-lg">{description}</p>
        {children && <div className="mt-6">{children}</div>}
      </div>
    </div>
  );
}
