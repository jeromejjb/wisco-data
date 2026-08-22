"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  MapPin,
  Moon,
  Sun,
  Menu,
  X,
  Briefcase,
  TrendingUp,
  Bus,
} from "lucide-react";
import { cn, formatPercent, formatCurrency } from "@/lib/utils";
import { useAppStore } from "@/lib/store";
import { LiveBadge } from "@/components/ui/live-badge";
import type { StatewideStats } from "@/lib/types";

const QUICK_LINKS = [
  { href: "/jobs", label: "Jobs", icon: Briefcase },
  { href: "/explore", label: "Economy", icon: TrendingUp },
  { href: "/transit", label: "Transit", icon: Bus },
];

type WorkspaceChromeProps = {
  stats?: StatewideStats | null;
  statsLoading?: boolean;
};

export function WorkspaceChrome({ stats, statsLoading }: WorkspaceChromeProps) {
  const pathname = usePathname();
  const { darkMode, toggleDarkMode } = useAppStore();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="pointer-events-none absolute inset-x-0 top-0 z-40">
      <div className="bg-gradient-to-b from-black/50 via-black/20 to-transparent px-3 pb-8 pt-3 sm:px-4">
        <div className="pointer-events-auto mx-auto flex max-w-[1800px] items-center gap-2 sm:gap-3">
          <Link
            href="/"
            className="flex shrink-0 items-center gap-2 rounded-full bg-white/10 px-2.5 py-1.5 backdrop-blur-md transition-colors hover:bg-white/15"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-lake-600 text-white shadow-sm">
              <MapPin className="h-3.5 w-3.5" />
            </div>
            <span className="hidden font-display text-sm font-semibold text-white sm:inline">
              Workways
            </span>
            <LiveBadge
              label="Live"
              className="!border-white/20 !bg-white/10 !py-0 !text-[9px] !text-white"
            />
          </Link>

          {!statsLoading && stats && (
            <div className="hidden items-center gap-1.5 md:flex">
              <StatChip label="Unemp." value={formatPercent(stats.unemploymentRate)} />
              <StatChip label="Jobs" value={stats.openJobs.toLocaleString()} />
              <StatChip label="Wage" value={formatCurrency(stats.medianWage, true)} />
            </div>
          )}

          <nav
            className="ml-auto hidden items-center gap-0.5 rounded-full bg-white/10 p-0.5 backdrop-blur-md lg:flex"
            aria-label="Quick links"
          >
            {QUICK_LINKS.map(({ href, label, icon: Icon }) => {
              const active = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-white/80 transition-colors hover:bg-white/10 hover:text-white",
                    active && "bg-white/15 text-white"
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                </Link>
              );
            })}
            <Link
              href="/insights"
              className="rounded-full px-3 py-1.5 text-xs font-medium text-white/70 hover:bg-white/10 hover:text-white"
            >
              More
            </Link>
          </nav>

          <div className="ml-auto flex items-center gap-1 lg:ml-0">
            <button
              type="button"
              onClick={toggleDarkMode}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-md hover:bg-white/20"
              aria-label={darkMode ? "Light mode" : "Dark mode"}
            >
              {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            <button
              type="button"
              onClick={() => setMenuOpen(!menuOpen)}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-md hover:bg-white/20 lg:hidden"
              aria-label={menuOpen ? "Close menu" : "Open menu"}
            >
              {menuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {menuOpen && (
          <nav className="pointer-events-auto mx-auto mt-2 max-w-[1800px] rounded-2xl border border-white/10 bg-navy-900/90 p-2 backdrop-blur-xl lg:hidden">
            {QUICK_LINKS.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-white/90 hover:bg-white/10"
              >
                <Icon className="h-4 w-4 text-lake-400" />
                {label}
              </Link>
            ))}
            <Link
              href="/explore"
              onClick={() => setMenuOpen(false)}
              className="block rounded-xl px-3 py-2.5 text-sm text-white/70 hover:bg-white/10"
            >
              Explore economy
            </Link>
            <Link
              href="/budgets"
              onClick={() => setMenuOpen(false)}
              className="block rounded-xl px-3 py-2.5 text-sm text-white/70 hover:bg-white/10"
            >
              Budgets
            </Link>
          </nav>
        )}
      </div>
    </header>
  );
}

function StatChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-full bg-white/10 px-2.5 py-1 backdrop-blur-md">
      <span className="text-[9px] font-semibold uppercase tracking-wider text-white/50">
        {label}
      </span>
      <span className="ml-1.5 text-xs font-bold tabular-nums text-white">{value}</span>
    </div>
  );
}
