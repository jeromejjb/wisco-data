import type { Metadata } from "next";
import { LegalPage, LegalSection } from "@/components/layout/legal-page";
import { SITE } from "@/lib/site-meta";

export const metadata: Metadata = {
  title: "Terms of use",
  description: "Rules and expectations for using Wisconsin Workways.",
};

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of use"
      description="Plain-language rules for using the site. If something here doesn't make sense, email us — we'd rather clarify than lawyer up."
    >
      <LegalSection title="Agreement">
        <p>
          By using {SITE.name}, you agree to these terms. If you don&apos;t agree, please don&apos;t
          use the service. We may update these terms; continued use after changes means you accept the
          updated version.
        </p>
      </LegalSection>

      <LegalSection title="What we provide">
        <p>
          {SITE.name} is an informational tool that aggregates and visualizes publicly available data
          about Wisconsin jobs, economics, transit, and related topics. We provide maps, estimates,
          and an optional AI assistant to help you explore that data.
        </p>
        <p>
          The service is provided <strong>&ldquo;as is&rdquo;</strong> and <strong>&ldquo;as
          available.&rdquo;</strong> We work hard to keep data fresh and accurate, but we can&apos;t
          promise perfection — APIs go down, employers mis-post jobs, and commute math is inherently
          approximate.
        </p>
      </LegalSection>

      <LegalSection title="Not official — not advice">
        <p>
          {SITE.name} is <strong>not</strong> affiliated with the State of Wisconsin, the Department
          of Workforce Development, any transit agency, or any employer shown on the map. Nothing on
          this site is legal, financial, medical, or career counseling. Talk to qualified professionals
          for decisions that affect your health, finances, or employment rights.
        </p>
      </LegalSection>

      <LegalSection title="Commute & job estimates">
        <p>
          Commute times are modeled from GTFS schedules and straight-line distances — not live traffic
          or door-to-door routing. We filter out listings beyond a 45-minute one-way commute by default
          based on public-health research; that&apos;s a design choice, not a guarantee that a trip
          will feel short.
        </p>
        <p>
          Job titles, pay ranges, and application links come from third-party APIs. Always verify details
          on the employer&apos;s official posting before applying or relying on compensation figures.
        </p>
      </LegalSection>

      <LegalSection title="Acceptable use">
        <p>You agree not to:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>Scrape or hammer our APIs in ways that degrade service for others.</li>
          <li>Attempt to break into admin routes or bypass security controls.</li>
          <li>Use the site to harass, spam, or submit illegal content through the agent.</li>
          <li>Misrepresent {SITE.name} as an official government service.</li>
          <li>Reverse-engineer or resell our data feeds without permission.</li>
        </ul>
        <p>
          We may suspend access if we see abuse. For good-faith research or bulk access, reach out first
          — we&apos;re open to conversation.
        </p>
      </LegalSection>

      <LegalSection title="Intellectual property">
        <p>
          The {SITE.name} name, design, and original code are protected by applicable copyright laws.
          Public data displayed on the site remains subject to the terms of its original sources (BLS,
          Census, GTFS providers, etc.). Map tiles and library software carry their own licenses.
        </p>
      </LegalSection>

      <LegalSection title="Limitation of liability">
        <p>
          To the fullest extent permitted by law, {SITE.name} and its contributors are not liable for
          any indirect, incidental, or consequential damages arising from your use of the site — including
          missed interviews, bad commutes, or decisions made from outdated job listings. Our total
          liability for any claim is limited to the amount you paid us in the past twelve months (which,
          for a free service, is zero).
        </p>
      </LegalSection>

      <LegalSection title="Indemnity">
        <p>
          If your misuse of the service causes a third party to sue us, you agree to cover reasonable
          costs we incur defending that claim — except where the misuse wasn&apos;t yours.
        </p>
      </LegalSection>

      <LegalSection title="Governing law">
        <p>
          These terms are governed by the laws of the State of Wisconsin, without regard to conflict-of-law
          rules. Disputes should be brought in Wisconsin courts unless otherwise required by law.
        </p>
      </LegalSection>

      <LegalSection title="Contact">
        <p>
          Terms questions:{" "}
          <a
            href={`mailto:${SITE.contactEmail}`}
            className="text-lake-600 underline-offset-2 hover:underline dark:text-lake-400"
          >
            {SITE.contactEmail}
          </a>
          . We&apos;re real people — write in plain English.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
