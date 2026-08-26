"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { DataSourceLinks } from "@/components/layout/data-source-links";
import { APP_VERSION_LABEL } from "@/lib/app-version";
import { SITE, TECH_STACK } from "@/lib/site-meta";

type SiteFooterProps = {
  variant?: "full" | "minimal";
};

export function SiteFooter({ variant = "full" }: SiteFooterProps) {
  const pathname = usePathname();
  const year = new Date().getFullYear();

  if (variant === "minimal") {
    return (
      <footer className="pointer-events-none fixed bottom-0 left-0 z-40 hidden sm:block">
        <div className="pointer-events-auto m-4 rounded-xl border border-black/[0.06] bg-white/90 px-3 py-2 shadow-lg backdrop-blur-md dark:border-white/10 dark:bg-navy-900/90">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
            <span className="font-semibold text-foreground/80">{SITE.name}</span>
            <span className="font-mono text-[10px] text-muted-foreground/80">{APP_VERSION_LABEL}</span>
            <FooterLegalLinks className="gap-2" />
          </div>
        </div>
      </footer>
    );
  }

  return (
    <footer className="relative mt-auto overflow-hidden border-t border-white/10 bg-navy-900 text-white dark:bg-[#070b14]">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/60 to-transparent"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -left-32 top-0 h-64 w-64 rounded-full bg-lake-600/20 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -right-24 bottom-0 h-48 w-48 rounded-full bg-forest-600/15 blur-3xl"
        aria-hidden
      />

      <div className="relative mx-auto max-w-[1600px] px-4 py-14 lg:px-8 lg:py-16">
        <div className="grid gap-12 lg:grid-cols-12 lg:gap-8">
          <div className="lg:col-span-4">
            <p className="font-display text-2xl font-bold tracking-tight">{SITE.name}</p>
            <p className="mt-3 max-w-sm text-[15px] leading-relaxed text-white/65">
              {SITE.tagline} We pull live public data, put it on a map, and help you ask plain-language
              questions about work and place in Wisconsin — without pretending to be a state agency.
            </p>
            <p className="mt-4 text-sm text-white/45">
              Questions?{" "}
              <a
                href={`mailto:${SITE.contactEmail}`}
                className="text-cyan-300/90 underline-offset-2 hover:text-cyan-200 hover:underline"
              >
                {SITE.contactEmail}
              </a>
            </p>
          </div>

          <div className="lg:col-span-3">
            <FooterHeading>Explore</FooterHeading>
            <ul className="mt-4 space-y-2.5 text-sm text-white/70">
              <FooterNavLink href="/">Map & agent</FooterNavLink>
              <FooterNavLink href="/jobs">Find jobs</FooterNavLink>
              <FooterNavLink href="/explore">Economy</FooterNavLink>
              <FooterNavLink href="/transit">Transit to work</FooterNavLink>
              <FooterNavLink href="/insights">Insights</FooterNavLink>
            </ul>
          </div>

          <div className="lg:col-span-2">
            <FooterHeading>Policy</FooterHeading>
            <ul className="mt-4 space-y-2.5 text-sm text-white/70">
              <FooterNavLink href="/about">About us</FooterNavLink>
              <FooterNavLink href="/privacy">Privacy</FooterNavLink>
              <FooterNavLink href="/terms">Terms of use</FooterNavLink>
            </ul>
          </div>

          <div className="lg:col-span-3">
            <FooterHeading>Live data feeds</FooterHeading>
            <DataSourceLinks className="mt-4 text-white/55" linkClassName="text-white/70" />
          </div>
        </div>

        <div className="mt-14">
          <FooterHeading>Built with</FooterHeading>
          <p className="mt-2 max-w-2xl text-sm text-white/50">
            Open-source libraries and public APIs — stitched together so you can see Wisconsin clearly,
            not buried in spreadsheets.
          </p>
          <ul className="mt-4 flex flex-wrap gap-2">
            {TECH_STACK.map(({ name, detail }) => (
              <li key={name}>
                <span
                  className="group inline-flex flex-col rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 transition-colors hover:border-cyan-400/30 hover:bg-white/[0.07]"
                  title={detail}
                >
                  <span className="font-mono text-[12px] font-medium text-white/90">{name}</span>
                  <span className="mt-0.5 text-[10px] text-white/40 group-hover:text-white/55">
                    {detail}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-12 flex flex-col gap-4 border-t border-white/10 pt-8 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs leading-relaxed text-white/40">
            © {year} {SITE.name} {APP_VERSION_LABEL}. Not an official Wisconsin state website. Commute
            times and job listings are estimates — always confirm with employers and transit agencies.
          </p>
          <FooterLegalLinks className="text-xs text-white/50" />
        </div>
      </div>
    </footer>
  );
}

function FooterHeading({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-cyan-300/80">{children}</p>
  );
}

function FooterNavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <li>
      <Link href={href} className="transition-colors hover:text-cyan-200">
        {children}
      </Link>
    </li>
  );
}

function FooterLegalLinks({ className }: { className?: string }) {
  return (
    <nav className={cn("flex flex-wrap items-center gap-x-4 gap-y-1", className)} aria-label="Legal">
      <Link href="/about" className="hover:text-cyan-200 hover:underline">
        About
      </Link>
      <Link href="/privacy" className="hover:text-cyan-200 hover:underline">
        Privacy
      </Link>
      <Link href="/terms" className="hover:text-cyan-200 hover:underline">
        Terms
      </Link>
    </nav>
  );
}

/** Pick footer variant from route — map home gets minimal chip. */
export function RouteFooter() {
  const pathname = usePathname();
  if (pathname === "/") return <SiteFooter variant="minimal" />;
  return <SiteFooter variant="full" />;
}
