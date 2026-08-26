import type { Job } from "@/lib/types";
import { cached } from "@/lib/cache";
import { matchCityInText, userAreaFromCountyId } from "@/lib/user-area";
import { countyIdsFromText } from "@/lib/county-lookup";

function parseLocation(location: string): { city: string; lat: number; lng: number; county: string } {
  const cityMatch = matchCityInText(location);
  if (cityMatch) {
    const area = userAreaFromCountyId(cityMatch.countyId);
    return { city: cityMatch.cityLabel, lat: area.lat, lng: area.lng, county: area.displayName };
  }

  const [countyId] = countyIdsFromText(location);
  if (countyId) {
    const area = userAreaFromCountyId(countyId);
    return { city: area.displayName, lat: area.lat, lng: area.lng, county: area.displayName };
  }

  const lower = location.toLowerCase();
  if (lower.includes("wisconsin") || lower.includes(", wi")) {
    return { city: "Wisconsin", lat: 44.5, lng: -89.5, county: "Wisconsin" };
  }
  return { city: "Wisconsin", lat: 44.5, lng: -89.5, county: "Wisconsin" };
}

export function parseJobSearchLocation(location: string) {
  return parseLocation(location);
}

type UsaJobsResult = {
  SearchResult?: {
    SearchResultItems?: Array<{
      MatchedObjectId: string;
      MatchedObjectDescriptor: {
        PositionTitle: string;
        OrganizationName: string;
        PositionLocationDisplay: string;
        PositionRemuneration?: Array<{ MinimumRange: string; MaximumRange: string; RateIntervalCode: string }>;
        PositionSchedule?: Array<{ Name: string }>;
        PositionOfferingType?: Array<{ Name: string }>;
        QualificationSummary?: string;
        PositionURI: string;
        PublicationStartDate: string;
        UserArea?: { Details?: { MajorDuties?: string[] } };
      };
    }>;
  };
};

export async function fetchUsaJobsWisconsin(params?: {
  keyword?: string;
  location?: string;
  page?: number;
}) {
  const key = process.env.USAJOBS_AUTH_KEY;
  const userAgent = process.env.USAJOBS_USER_AGENT;
  if (!key || !userAgent) return { jobs: [] as Job[], error: "USAJOBS_AUTH_KEY not configured" };

  const cacheKey = `usajobs:${params?.keyword ?? ""}:${params?.location ?? "Wisconsin"}:${params?.page ?? 1}`;
  return cached(
    cacheKey,
    30 * 60 * 1000,
    async () => {
    try {
    const searchParams = new URLSearchParams({
      LocationName: params?.location ?? "Wisconsin",
      ResultsPerPage: "25",
      Page: String(params?.page ?? 1),
    });
    if (params?.keyword) searchParams.set("Keyword", params.keyword);

    const res = await fetch(`https://data.usajobs.gov/api/search?${searchParams}`, {
      headers: {
        Host: "data.usajobs.gov",
        "User-Agent": userAgent,
        "Authorization-Key": key,
      },
      next: { revalidate: 1800 },
    });

    if (!res.ok) {
      return { jobs: [] as Job[], error: `USAJobs ${res.status}` };
    }

    const data = (await res.json()) as UsaJobsResult;
    const items = data.SearchResult?.SearchResultItems ?? [];

    const jobs: Job[] = items.map((item) => {
      const d = item.MatchedObjectDescriptor;
      const loc = parseLocation(d.PositionLocationDisplay ?? "Wisconsin");
      const pay = d.PositionRemuneration?.[0];
      const isHourly = pay?.RateIntervalCode === "PH";

      return {
        id: `usajobs-${item.MatchedObjectId}`,
        title: d.PositionTitle,
        employer: d.OrganizationName,
        employerId: d.OrganizationName.toLowerCase().replace(/\s+/g, "-"),
        industry: "Government",
        location: {
          address: d.PositionLocationDisplay ?? loc.city,
          city: loc.city,
          county: loc.county,
          zip: "",
          coordinates: { lat: loc.lat, lng: loc.lng },
        },
        payMin: pay ? parseFloat(pay.MinimumRange) : undefined,
        payMax: pay ? parseFloat(pay.MaximumRange) : undefined,
        payType: isHourly ? "hourly" : "annual",
        employmentType: d.PositionOfferingType?.[0]?.Name?.toLowerCase().includes("part")
          ? "part-time"
          : "full-time",
        workMode: "on-site",
        postedDate: d.PublicationStartDate?.split("T")[0] ?? new Date().toISOString().split("T")[0],
        skills: [],
        benefits: ["Federal benefits"],
        experienceLevel: "Varies",
        education: "See posting",
        shift: d.PositionSchedule?.[0]?.Name ?? "Day",
        schedule: d.PositionSchedule?.[0]?.Name ?? "Full-time",
        isOpen: true,
        applicationUrl: d.PositionURI,
        transitAccessible: false,
        commuteFitScore: undefined,
        employerRating: undefined,
      };
    });

    return { jobs, error: null, count: jobs.length };
    } catch (err) {
      return { jobs: [] as Job[], error: `USAJobs network: ${String(err)}` };
    }
  },
    { shouldCache: (r) => !r.error }
  );
}

export async function fetchAdzunaJobs(params?: { keyword?: string; where?: string }) {
  const appId = process.env.ADZUNA_APP_ID;
  const appKey = process.env.ADZUNA_APP_KEY;
  if (!appId || !appKey) return { jobs: [] as Job[], error: "Adzuna keys not configured" };

  const where = params?.where ?? "Wisconsin";
  const what = params?.keyword ?? "";
  const cacheKey = `adzuna:${what}:${where}`;
  return cached(
    cacheKey,
    30 * 60 * 1000,
    async () => {
    try {
    const url = new URL(`https://api.adzuna.com/v1/api/jobs/us/search/1`);
    url.searchParams.set("app_id", appId);
    url.searchParams.set("app_key", appKey);
    url.searchParams.set("where", where);
    url.searchParams.set("results_per_page", "25");
    url.searchParams.set("sort_by", "date");
    if (what) url.searchParams.set("what", what);

    const res = await fetch(url.toString(), { next: { revalidate: 1800 } });
    if (!res.ok) return { jobs: [] as Job[], error: `Adzuna ${res.status}` };

    const data = await res.json();
    const results = data.results ?? [];

    const jobs: Job[] = results.map(
      (r: {
        id: string;
        title: string;
        company: { display_name: string };
        location: { display_name: string; area?: string[] };
        latitude?: number;
        longitude?: number;
        salary_min?: number;
        salary_max?: number;
        contract_type?: string;
        created: string;
        redirect_url: string;
        category?: { label: string };
      }) => {
        const loc = parseLocation(r.location?.display_name ?? "Wisconsin");
        return {
          id: `adzuna-${r.id}`,
          title: r.title,
          employer: r.company?.display_name ?? "Employer",
          employerId: (r.company?.display_name ?? "employer").toLowerCase().replace(/\s+/g, "-"),
          industry: r.category?.label ?? "General",
          location: {
            address: r.location?.display_name ?? loc.city,
            city: loc.city,
            county: loc.county,
            zip: "",
            coordinates: {
              lat: r.latitude ?? loc.lat,
              lng: r.longitude ?? loc.lng,
            },
          },
          payMin: r.salary_min,
          payMax: r.salary_max,
          payType: "annual",
          employmentType: r.contract_type?.toLowerCase().includes("part") ? "part-time" : "full-time",
          workMode: "on-site",
          postedDate: r.created?.split("T")[0] ?? new Date().toISOString().split("T")[0],
          skills: [],
          benefits: [],
          experienceLevel: "Varies",
          education: "See posting",
          shift: "Day",
          schedule: "Varies",
          isOpen: true,
          applicationUrl: r.redirect_url,
          transitAccessible: false,
        };
      }
    );

    return { jobs, error: null, count: jobs.length };
    } catch (err) {
      return { jobs: [] as Job[], error: `Adzuna network: ${String(err)}` };
    }
  },
    { shouldCache: (r) => !r.error }
  );
}
