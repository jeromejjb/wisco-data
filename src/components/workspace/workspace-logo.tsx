"use client";

import { MapPin } from "lucide-react";

/** Minimal brand mark — only chrome on the home map screen. */
export function WorkspaceLogo() {
  return (
    <div className="pointer-events-none fixed left-4 top-4 z-40">
      <div className="pointer-events-auto flex items-center gap-3 rounded-2xl border border-black/[0.06] bg-white/95 px-3.5 py-2.5 shadow-[0_4px_24px_rgba(12,18,34,0.08)] backdrop-blur-md">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#1e6b9c] to-[#267a55] shadow-sm">
          <MapPin className="h-4 w-4 text-white" strokeWidth={2.5} />
        </div>
        <div className="min-w-0 leading-tight">
          <p className="font-display text-[15px] font-semibold tracking-tight text-[#0c1222]">
            Workways
          </p>
          <p className="text-[11px] font-medium text-[#5a6278]">Wisconsin · live map</p>
        </div>
      </div>
    </div>
  );
}
