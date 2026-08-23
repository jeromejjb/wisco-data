"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, ChevronDown, Crosshair, RotateCcw, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { WI_COUNTIES } from "@/lib/wi-counties";
import { userAreaFromCountyId, type UserArea } from "@/lib/user-area";
import { useAppStore } from "@/lib/store";
import { useMapStore } from "@/lib/map-store";
import { GatheringPulse } from "@/components/ui/data-gathering-loader";

type AreaPickerProps = {
  area: UserArea;
  loading?: boolean;
  loadingLabel?: string;
  className?: string;
  compact?: boolean;
};

type DropdownRect = { bottom: number; left: number; width: number };

export function AreaPicker({ area, loading, loadingLabel, className, compact }: AreaPickerProps) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [dropdownRect, setDropdownRect] = useState<DropdownRect | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const setChosenArea = useAppStore((s) => s.setChosenArea);
  const chosenArea = useAppStore((s) => s.chosenArea);
  const setBrowserLocationEnabled = useAppStore((s) => s.setBrowserLocationEnabled);
  const browserLocationEnabled = useAppStore((s) => s.browserLocationEnabled);
  const applyActions = useMapStore((s) => s.applyActions);

  const label = area.displayName;

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: MouseEvent | TouchEvent) {
      const target = e.target as Node;
      if (rootRef.current?.contains(target)) return;
      if (dropdownRef.current?.contains(target)) return;
      setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // Portal-position the dropdown against the viewport so ancestor
  // `overflow-hidden` panels (the ask dock, mobile sheet) can't clip it.
  useLayoutEffect(() => {
    if (!open) return;
    function updateRect() {
      const btn = buttonRef.current;
      if (!btn) return;
      const rect = btn.getBoundingClientRect();
      const width = Math.min(280, window.innerWidth - 16);
      const left = Math.min(Math.max(8, rect.left), window.innerWidth - width - 8);
      const bottom = Math.max(8, window.innerHeight - rect.top + 8);
      setDropdownRect({ bottom, left, width });
    }
    updateRect();
    window.addEventListener("resize", updateRect);
    window.addEventListener("scroll", updateRect, true);
    return () => {
      window.removeEventListener("resize", updateRect);
      window.removeEventListener("scroll", updateRect, true);
    };
  }, [open]);

  function pickCounty(countyId: string) {
    const next = userAreaFromCountyId(countyId);
    setChosenArea(next);
    setBrowserLocationEnabled(false);
    applyActions([
      {
        type: "flyTo",
        center: { lat: next.lat, lng: next.lng },
        zoom: 8.35,
        pitch: 30,
      },
    ]);
    setOpen(false);
  }

  function useGps() {
    setChosenArea(null);
    setBrowserLocationEnabled(true);
    setOpen(false);
  }

  function resetAuto() {
    setChosenArea(null);
    setBrowserLocationEnabled(false);
    setOpen(false);
  }

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => !loading && setOpen((v) => !v)}
        disabled={loading}
        aria-expanded={open}
        aria-haspopup="listbox"
        className={cn(
          "inline-flex items-center gap-1 rounded-full font-medium transition-all duration-200",
          compact
            ? "max-w-[min(36vw,120px)] py-0.5 pl-1.5 pr-1.5 text-[10px] sm:max-w-[140px] sm:py-1 sm:pl-2 sm:pr-2 sm:text-[11px]"
            : "max-w-[min(42vw,160px)] py-1 pl-2.5 pr-2 text-[11px]",
          open
            ? "bg-[#e8f4fa] text-[#1e6b9c] ring-2 ring-[#1e6b9c]/20"
            : "bg-[#f0f7fb] text-[#3d4659] ring-1 ring-[#1e6b9c]/12 hover:bg-[#e8f4fa] hover:ring-[#1e6b9c]/25"
        )}
      >
        {loading ? (
          <GatheringPulse tone="lake" className="h-3 w-3 shrink-0" />
        ) : (
          <MapPin className="h-3 w-3 shrink-0 text-[#1e6b9c]" />
        )}
        <span className="truncate">{loading && loadingLabel ? loadingLabel : label}</span>
        {!loading && (
          <ChevronDown
            className={cn("h-3 w-3 shrink-0 text-[#1e6b9c]/70 transition-transform", open && "rotate-180")}
          />
        )}
      </button>

      {mounted &&
        createPortal(
          <AnimatePresence>
            {open && dropdownRect && (
              <motion.div
                ref={dropdownRef}
                initial={{ opacity: 0, y: 6, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 4, scale: 0.98 }}
                transition={{ type: "spring", stiffness: 480, damping: 32 }}
                style={{
                  position: "fixed",
                  bottom: dropdownRect.bottom,
                  left: dropdownRect.left,
                  width: dropdownRect.width,
                }}
                className="z-[100] overflow-hidden rounded-2xl border border-black/[0.07] bg-white/98 shadow-[0_16px_48px_rgba(12,18,34,0.16)] backdrop-blur-xl"
                role="listbox"
                aria-label="Choose your area"
              >
                <div className="border-b border-black/[0.05] px-3.5 py-2.5">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#8b95a8]">
                    Your area
                  </p>
                  <p className="mt-0.5 text-[13px] font-semibold text-[#0c1222]">
                    {area.displayName}
                    <span className="ml-1 font-normal text-[#8b95a8]">· {area.countyName}</span>
                  </p>
                </div>

                <ul className="max-h-[220px] overflow-y-auto p-1.5">
                  {WI_COUNTIES.map((county) => {
                    const selected = area.countyId === county.id;
                    const name = county.name.replace(" County", "");
                    return (
                      <li key={county.id}>
                        <button
                          type="button"
                          role="option"
                          aria-selected={selected}
                          onClick={() => pickCounty(county.id)}
                          className={cn(
                            "flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2 text-left text-[13px] transition-colors",
                            selected
                              ? "bg-[#e8f4fa] font-semibold text-[#1e6b9c]"
                              : "text-[#3d4659] hover:bg-[#f4f6f9]"
                          )}
                        >
                          <span>{name}</span>
                          {selected && <Check className="h-3.5 w-3.5 shrink-0" strokeWidth={2.5} />}
                        </button>
                      </li>
                    );
                  })}
                </ul>

                <div className="flex gap-1 border-t border-black/[0.05] p-1.5">
                  <button
                    type="button"
                    onClick={useGps}
                    className={cn(
                      "flex flex-1 items-center justify-center gap-1.5 rounded-xl px-2 py-2 text-[11px] font-medium transition-colors",
                      browserLocationEnabled && !chosenArea
                        ? "bg-[#ecfdf5] text-[#267a55]"
                        : "text-[#5a6278] hover:bg-[#f4f6f9]"
                    )}
                  >
                    <Crosshair className="h-3.5 w-3.5" />
                    Use GPS
                  </button>
                  {(chosenArea || browserLocationEnabled) && (
                    <button
                      type="button"
                      onClick={resetAuto}
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-xl px-2 py-2 text-[11px] font-medium text-[#5a6278] transition-colors hover:bg-[#f4f6f9]"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      Auto
                    </button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body
        )}
    </div>
  );
}
