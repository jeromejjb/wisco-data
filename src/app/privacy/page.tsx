import type { Metadata } from "next";
import { LegalPage, LegalSection } from "@/components/layout/legal-page";
import { SITE } from "@/lib/site-meta";

export const metadata: Metadata = {
  title: "Privacy policy",
  description: "What Wisconsin Workways collects, stores, and why.",
};

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy policy"
      description="We built this to help you explore public data — not to build a profile on you. Here's what actually happens when you use the site."
    >
      <LegalSection title="The short version">
        <p>
          We don&apos;t sell your personal information. We don&apos;t require an account to browse the
          map or search jobs. Most data processing happens in your browser and on our servers to fetch
          public APIs — not to track you across the web.
        </p>
      </LegalSection>

      <LegalSection title="Information we may collect">
        <p>
          <strong>What you type.</strong> Questions you send to the map agent are processed to generate
          responses and may be logged temporarily for debugging or prompt experiments if you use admin
          features. Don&apos;t submit passwords, SSNs, or medical records — this isn&apos;t a secure
          messaging channel.
        </p>
        <p>
          <strong>Approximate location (optional).</strong> If you enable &ldquo;near me&rdquo; prompts
          or browser location, we use city-level or coordinate data to tailor starters and map focus.
          You can turn this off anytime. We don&apos;t store precise GPS trails.
        </p>
        <p>
          <strong>Saved jobs & preferences.</strong> If you save jobs or set home/work locations, that
          information is kept in your browser&apos;s local storage on your device — not on our servers
          unless we add cloud sync later (we&apos;ll update this page if we do).
        </p>
        <p>
          <strong>Standard server logs.</strong> Like most websites, hosting may record IP address,
          browser type, and request timestamps for security and performance. We use these to keep the
          service running, not to advertise to you.
        </p>
      </LegalSection>

      <LegalSection title="Third-party services">
        <p>
          When you use {SITE.name}, your queries may be sent to external providers depending on
          configuration:
        </p>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong>Google Gemini</strong> (optional) — powers the conversational agent when{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-sm">GOOGLE_GENERATIVE_AI_API_KEY</code>{" "}
            is set. Google&apos;s terms apply to that processing.
          </li>
          <li>
            <strong>Job APIs</strong> — Adzuna, USAJobs, and similar services receive search terms and
            location filters to return listings.
          </li>
          <li>
            <strong>News APIs</strong> — GNews or RSS feeds for local headlines when enabled.
          </li>
          <li>
            <strong>Map tiles</strong> — OpenFreeMap and optionally Mapbox serve map imagery; those
            providers may see tile request IPs.
          </li>
        </ul>
        <p>
          We don&apos;t control third-party privacy practices. Read their policies if you need detail
          beyond what we describe here.
        </p>
      </LegalSection>

      <LegalSection title="Cookies & local storage">
        <p>
          We use local storage for theme preference (light/dark), saved jobs, and similar on-device
          settings. We don&apos;t run invasive ad trackers. If we add analytics later, we&apos;ll ask
          consent where required and update this policy.
        </p>
      </LegalSection>

      <LegalSection title="Children">
        <p>
          {SITE.name} is a general-audience civic tool, not directed at children under 13. We don&apos;t
          knowingly collect personal information from kids.
        </p>
      </LegalSection>

      <LegalSection title="Your choices">
        <ul className="list-disc space-y-2 pl-5">
          <li>Clear saved data anytime via your browser settings.</li>
          <li>Disable location permissions in your browser or OS.</li>
          <li>Use the job board and economy pages without the AI agent if you prefer not to send prompts.</li>
        </ul>
      </LegalSection>

      <LegalSection title="Changes & contact">
        <p>
          We may update this policy as the product evolves. The date at the top reflects the latest
          revision. Questions or data requests:{" "}
          <a
            href={`mailto:${SITE.contactEmail}`}
            className="text-lake-600 underline-offset-2 hover:underline dark:text-lake-400"
          >
            {SITE.contactEmail}
          </a>
          .
        </p>
      </LegalSection>
    </LegalPage>
  );
}
