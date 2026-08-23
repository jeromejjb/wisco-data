import type { Metadata } from "next";
import { DataSourceLinks } from "@/components/layout/data-source-links";
import { LegalPage, LegalSection } from "@/components/layout/legal-page";
import { SITE } from "@/lib/site-meta";

export const metadata: Metadata = {
  title: "About us",
  description: "Why Wisconsin Workways exists and how we think about civic data.",
};

export default function AboutPage() {
  return (
    <LegalPage
      title="About Wisconsin Workways"
      description="We're building a friendlier way to explore jobs, wages, and transit in Wisconsin — with the map upfront and the spreadsheets in the background."
    >
      <LegalSection title="Why this exists">
        <p>
          Wisconsin has excellent public data — unemployment by county, federal job postings, transit
          schedules — but it&apos;s scattered across a dozen websites with different formats and no
          shared map. {SITE.name} started as a simple question:{" "}
          <em>what if you could ask &ldquo;CNA jobs in Green Bay I can reach on a bus&rdquo; and
          actually see an answer on a map?</em>
        </p>
        <p>
          We&apos;re not a government agency, a staffing firm, or a newsroom. We&apos;re a civic-tech
          experiment: pull live sources together, show our work, and let you explore without creating
          an account first.
        </p>
      </LegalSection>

      <LegalSection title="What we believe">
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong>Place matters.</strong> A job in Milwaukee and a job in Ashland are not the same
            opportunity — distance, transit, and local wages all change the picture.
          </li>
          <li>
            <strong>Commute health counts.</strong> We cap recommendations at a 45-minute one-way
            commute because research consistently links longer daily travel to stress and poorer
            wellbeing. You can widen filters on the job board if you need to — we&apos;ll tell you when
            something is a stretch.
          </li>
          <li>
            <strong>Show the sources.</strong> When we display a number, we try to say where it came
            from and when it was last refreshed. Guessing is for weather apps, not labor data.
          </li>
          <li>
            <strong>Humans over hype.</strong> The AI agent helps you navigate the map; it doesn&apos;t
            replace reading a job posting or checking with your transit agency.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="How it works (short version)">
        <p>
          The home screen is a full-viewport map of Wisconsin. You ask questions in plain English;
          we fetch live jobs, economy, and transit data; answers show up as map layers, pins, and short
          summaries — not walls of text. Behind the scenes: Next.js API routes, MapLibre, GTFS feeds
          for MCTS and Madison Metro, and optional Gemini for the conversational agent.
        </p>
        <p>
          Some features need API keys you provide (Adzuna, USAJobs, Census, etc.). Economy and transit
          basics work without keys. See the README in the project repo for setup.
        </p>
      </LegalSection>

      <LegalSection title="Who built it">
        <p>
          {SITE.name} is an independent project built for Wisconsin residents, planners, journalists,
          and anyone curious about how work and geography connect in the state. If you&apos;re from a
          workforce board, a newsroom, or a community org and want to collaborate — we&apos;d love to
          hear from you at{" "}
          <a
            href={`mailto:${SITE.contactEmail}`}
            className="text-lake-600 underline-offset-2 hover:underline dark:text-lake-400"
          >
            {SITE.contactEmail}
          </a>
          .
        </p>
      </LegalSection>

      <LegalSection title="Where the data comes from">
        <p>
          We pull from public APIs and open feeds. When a number or listing appears on the map, you
          can usually trace it back to one of these providers:
        </p>
        <DataSourceLinks
          className="mt-4 text-muted-foreground"
          linkClassName="text-lake-600 dark:text-lake-400"
          separatorClassName="text-muted-foreground/50"
        />
      </LegalSection>

      <LegalSection title="What we're not">
        <p>
          We don&apos;t guarantee job availability, wages, or commute times. We don&apos;t sell your
          data. We don&apos;t speak for the State of Wisconsin, DWD, MCTS, or any employer listed on
          the site. When in doubt, click through to the original posting or agency.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
