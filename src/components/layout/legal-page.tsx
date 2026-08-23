import Link from "next/link";
import type { ReactNode } from "react";
import { SITE } from "@/lib/site-meta";

export function LegalPage({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <article className="mx-auto max-w-3xl px-4 py-12 lg:px-8 lg:py-16">
      <header className="mb-10 border-b border-border pb-8">
        <p className="text-sm font-medium text-lake-600 dark:text-lake-400">
          <Link href="/" className="hover:underline">
            {SITE.name}
          </Link>
        </p>
        <h1 className="font-display mt-3 text-3xl font-bold tracking-tight text-foreground lg:text-4xl">
          {title}
        </h1>
        <p className="mt-3 text-lg leading-relaxed text-muted-foreground">{description}</p>
        <p className="mt-4 text-sm text-muted-foreground">
          Last updated {SITE.lastUpdated}
        </p>
      </header>
      <div className="legal-prose space-y-8 text-[15px] leading-relaxed text-foreground/90">
        {children}
      </div>
      <footer className="mt-14 flex flex-wrap gap-4 border-t border-border pt-8 text-sm text-muted-foreground">
        <Link href="/about" className="hover:text-lake-600 hover:underline">
          About
        </Link>
        <Link href="/privacy" className="hover:text-lake-600 hover:underline">
          Privacy
        </Link>
        <Link href="/terms" className="hover:text-lake-600 hover:underline">
          Terms
        </Link>
        <Link href="/" className="hover:text-lake-600 hover:underline">
          Back to map
        </Link>
      </footer>
    </article>
  );
}

export function LegalSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section>
      <h2 className="font-display text-xl font-semibold text-foreground">{title}</h2>
      <div className="mt-3 space-y-3">{children}</div>
    </section>
  );
}
