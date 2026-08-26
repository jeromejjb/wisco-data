"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, Moon, Sun, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { LiveBadge } from "@/components/ui/live-badge";
import { GlobalSearch } from "./global-search";
import { overlaySpring } from "@/lib/motion";

const navItems = [
  { href: "/explore", label: "Explore Economy" },
  { href: "/jobs", label: "Find Jobs" },
  { href: "/transit", label: "Transit to Work" },
  { href: "/budgets", label: "Budgets & Investment" },
  { href: "/insights", label: "Insights" },
  { href: "/saved", label: "Saved Places" },
];

export function Header() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { darkMode, toggleDarkMode } = useAppStore();

  return (
    <header className="sticky top-0 z-50 border-b border-border/60 glass-panel !rounded-none">
      <div className="mx-auto flex max-w-[1600px] items-center gap-4 px-4 py-3 lg:px-8">
        <Link href="/" className="group flex shrink-0 items-center gap-3">
          <div className="relative flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-lake-600 via-lake-700 to-navy-900 text-white shadow-lg shadow-lake-600/20 transition-transform group-hover:scale-105">
            <MapPin className="h-4 w-4" aria-hidden />
          </div>
          <div className="hidden sm:block">
            <span className="block text-sm font-bold tracking-tight">Wisconsin Workways</span>
            <span className="flex items-center gap-2">
              <LiveBadge label="Live" className="!py-0.5 !text-[10px]" />
            </span>
          </div>
        </Link>

        <div className="hidden flex-1 lg:block lg:max-w-xl xl:max-w-2xl">
          <GlobalSearch />
        </div>

        <nav className="hidden items-center gap-0.5 xl:flex" aria-label="Main">
          {navItems.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "relative rounded-xl px-3 py-2 text-sm font-medium transition-all",
                  active
                    ? "text-lake-700 dark:text-lake-400"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {active && (
                  <span className="absolute inset-0 rounded-xl bg-lake-600/10 dark:bg-lake-600/15" />
                )}
                <span className="relative">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleDarkMode}
            className="rounded-xl"
            aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"}
          >
            {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="rounded-xl lg:hidden"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      <div className="border-t border-border/60 px-4 py-2.5 lg:hidden">
        <GlobalSearch compact />
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <motion.nav
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={overlaySpring}
            className="overflow-hidden border-t border-border bg-background/95 backdrop-blur-xl lg:hidden"
            aria-label="Mobile"
          >
            <div className="flex flex-col gap-1 px-4 py-4">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    "rounded-xl px-4 py-3.5 text-sm font-medium transition-colors",
                    pathname === item.href ? "bg-lake-600/10 text-lake-700" : "hover:bg-muted"
                  )}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}
