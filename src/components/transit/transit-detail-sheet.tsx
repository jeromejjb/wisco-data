"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Bus, MapPin, Radio, Route, X } from "lucide-react";
import type { TransitMapSelection } from "@/components/transit/transit-map";
import type { TransitServiceAlert } from "@/lib/transit-types";
import { cn } from "@/lib/utils";

type TransitDetailSheetProps = {
  selection: TransitMapSelection | null;
  alerts: TransitServiceAlert[];
  stats?: {
    liveVehicles?: number;
    routeShapes?: number;
    totalStops?: number;
  };
  onClose: () => void;
  className?: string;
};

export function TransitDetailSheet({
  selection,
  alerts,
  stats,
  onClose,
  className,
}: TransitDetailSheetProps) {
  const open = Boolean(selection) || alerts.length > 0;

  return (
    <>
      <div className={cn("hidden lg:block", className)}>
        <AnimatePresence mode="wait">
          {selection ? (
            <motion.div
              key={selection.item.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              className="glass-panel rounded-2xl border border-black/5 p-4 shadow-lg"
            >
              <TransitDetailContent selection={selection} onClose={onClose} stats={stats} />
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="glass-panel rounded-2xl border border-black/5 p-4 text-sm text-muted-foreground"
            >
              <p className="font-medium text-foreground">Tap a stop, route, or live bus on the map</p>
              <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
                <StatPill icon={MapPin} label="Stops" value={stats?.totalStops} />
                <StatPill icon={Route} label="Routes" value={stats?.routeShapes} />
                <StatPill icon={Radio} label="Live" value={stats?.liveVehicles} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {alerts.length > 0 && (
          <div className="mt-3 space-y-2">
            {alerts.slice(0, 3).map((alert) => (
              <AlertCard key={alert.id} alert={alert} />
            ))}
          </div>
        )}
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 320 }}
            className="fixed inset-x-0 bottom-0 z-50 lg:hidden"
          >
            <div className="mx-auto max-h-[min(72vh,520px)] overflow-y-auto rounded-t-3xl border border-black/10 bg-white/95 px-4 pb-[var(--safe-pb)] pt-3 shadow-[0_-12px_40px_rgba(0,0,0,0.18)] backdrop-blur-xl dark:bg-[#12161c]/95">
              <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-black/15" />
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm font-semibold">Transit details</p>
                <button
                  type="button"
                  onClick={onClose}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-black/5"
                  aria-label="Close"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {selection ? (
                <TransitDetailContent selection={selection} onClose={onClose} stats={stats} compact />
              ) : (
                <div className="grid grid-cols-3 gap-2 pb-2 text-center text-xs">
                  <StatPill icon={MapPin} label="Stops" value={stats?.totalStops} />
                  <StatPill icon={Route} label="Routes" value={stats?.routeShapes} />
                  <StatPill icon={Radio} label="Live" value={stats?.liveVehicles} />
                </div>
              )}

              {alerts.length > 0 && (
                <div className="mt-3 space-y-2 border-t border-black/5 pt-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Service alerts
                  </p>
                  {alerts.slice(0, 2).map((alert) => (
                    <AlertCard key={alert.id} alert={alert} compact />
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function TransitDetailContent({
  selection,
  onClose,
  stats,
  compact,
}: {
  selection: TransitMapSelection;
  onClose: () => void;
  stats?: TransitDetailSheetProps["stats"];
  compact?: boolean;
}) {
  return (
    <div>
      <div className="flex items-start justify-between gap-3">
        <div>
          {selection.type === "stop" && (
            <>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-lake-600">Bus stop</p>
              <p className={cn("font-semibold leading-snug", compact ? "text-base" : "text-lg")}>
                {selection.item.name}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">{selection.item.agency}</p>
            </>
          )}
          {selection.type === "route" && (
            <>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-lake-600">Route line</p>
              <p className={cn("font-semibold", compact ? "text-base" : "text-lg")}>
                <span
                  className="mr-2 inline-flex min-w-[2rem] items-center justify-center rounded-lg px-2 py-0.5 text-white"
                  style={{ backgroundColor: selection.item.color }}
                >
                  {selection.item.shortName}
                </span>
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Scheduled route shape from GTFS · tap stops along this line for connections
              </p>
            </>
          )}
          {selection.type === "vehicle" && (
            <>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-600">Live bus</p>
              <p className={cn("font-semibold", compact ? "text-base" : "text-lg")}>
                {selection.item.routeLabel ? `Route ${selection.item.routeLabel}` : "Vehicle in service"}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">{selection.item.agency}</p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Position updated {new Date(selection.item.updatedAt).toLocaleTimeString()}
              </p>
            </>
          )}
        </div>
        {!compact && (
          <button type="button" onClick={onClose} className="text-xs text-muted-foreground hover:text-foreground">
            Clear
          </button>
        )}
      </div>

      {!compact && stats && (
        <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
          <StatPill icon={MapPin} label="Stops nearby" value={stats.totalStops} />
          <StatPill icon={Route} label="Route lines" value={stats.routeShapes} />
          <StatPill icon={Bus} label="Live now" value={stats.liveVehicles} />
        </div>
      )}
    </div>
  );
}

function StatPill({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof MapPin;
  label: string;
  value?: number;
}) {
  return (
    <div className="rounded-xl bg-black/[0.03] px-2 py-2 dark:bg-white/[0.04]">
      <Icon className="mx-auto h-3.5 w-3.5 text-lake-600" />
      <p className="mt-1 text-sm font-bold tabular-nums">{value ?? "—"}</p>
      <p className="text-[10px] text-muted-foreground">{label}</p>
    </div>
  );
}

function AlertCard({ alert, compact }: { alert: TransitServiceAlert; compact?: boolean }) {
  return (
    <div
      className={cn(
        "rounded-xl border border-amber-200/60 bg-amber-50/80 p-3 text-sm dark:border-amber-900/40 dark:bg-amber-950/30",
        compact && "p-2.5 text-xs"
      )}
    >
      <p className="font-semibold text-amber-950 dark:text-amber-100">{alert.title}</p>
      {alert.description && (
        <p className="mt-1 line-clamp-3 text-amber-900/80 dark:text-amber-200/80">{alert.description}</p>
      )}
      <p className="mt-2 text-[10px] font-medium uppercase tracking-wide text-amber-700/70">{alert.agency}</p>
    </div>
  );
}
