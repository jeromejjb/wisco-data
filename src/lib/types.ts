export type DataProvenance = {
  source: string;
  lastUpdated: string;
  coverage: string;
  confidence: "high" | "medium" | "low" | "estimated";
  methodology?: string;
};

export type Coordinates = { lat: number; lng: number };

export type WisconsinMetro =
  | "milwaukee"
  | "madison"
  | "green-bay"
  | "kenosha"
  | "racine"
  | "appleton"
  | "eau-claire"
  | "statewide";

export type EmploymentType =
  | "full-time"
  | "part-time"
  | "temporary"
  | "internship";

export type WorkMode = "on-site" | "hybrid" | "remote";

export type Job = {
  id: string;
  title: string;
  employer: string;
  employerId: string;
  industry: string;
  location: {
    address: string;
    city: string;
    county: string;
    zip: string;
    coordinates: Coordinates;
  };
  payMin?: number;
  payMax?: number;
  payType: "annual" | "hourly";
  employmentType: EmploymentType;
  workMode: WorkMode;
  postedDate: string;
  skills: string[];
  benefits: string[];
  experienceLevel: string;
  education: string;
  shift: string;
  schedule: string;
  isOpen: boolean;
  applicationUrl?: string;
  transitAccessible: boolean;
  commute?: CommuteSummary;
  commuteFitScore?: number;
  employerRating?: number;
};

export type CommuteSummary = {
  durationMinutes: number;
  walkMinutes: number;
  transfers: number;
  fareEstimate: number;
  scheduleCompatible: boolean;
  scheduleNotes?: string;
  reliability: "high" | "medium" | "low";
};

export type TransitRoute = {
  id: string;
  label: "Fastest" | "Fewest Transfers" | "Lowest Walking" | "Most Reliable";
  durationMinutes: number;
  walkMinutes: number;
  transfers: number;
  fare: number;
  departureTime: string;
  arrivalTime: string;
  reliability: "high" | "medium" | "low";
  frequency: string;
  legs: TransitLeg[];
  scheduleWarnings?: string[];
};

export type TransitLeg = {
  mode: "walk" | "bus" | "rail" | "brt" | "bike" | "park-and-ride";
  from: string;
  to: string;
  durationMinutes: number;
  line?: string;
  color?: string;
};

export type CountyEconomy = {
  id: string;
  name: string;
  fips: string;
  coordinates: Coordinates;
  unemploymentRate: number;
  laborForceParticipation: number;
  openJobs: number;
  medianWage: number;
  medianHouseholdIncome: number;
  costOfLivingIndex: number;
  populationChange: number;
  transitCoverage: number;
  transitAccessibleJobShare: number;
  opportunityIndex: number;
  industryGrowth: { industry: string; growth: number }[];
};

export type MetroRegion = {
  id: WisconsinMetro;
  name: string;
  tagline: string;
  coordinates: Coordinates;
  unemploymentRate: number;
  openJobs: number;
  medianWage: number;
  transitAccessibleShare: number;
  fastestGrowingIndustry: string;
  imageGradient: string;
};

export type BudgetCategory = {
  id: string;
  name: string;
  amount: number;
  changeYoY: number;
  perCapita: number;
};

export type BudgetEntity = {
  id: string;
  name: string;
  type: "state" | "county" | "city" | "transit-agency" | "workforce";
  geography: string;
  coordinates: Coordinates;
  fiscalYear: string;
  totalBudget: number;
  categories: BudgetCategory[];
  capitalProjects: CapitalProject[];
  insight?: string;
  provenance: DataProvenance;
};

export type CapitalProject = {
  id: string;
  name: string;
  amount: number;
  type: "transit" | "infrastructure" | "workforce" | "development";
  coordinates: Coordinates;
  status: "planned" | "in-progress" | "completed";
};

export type Insight = {
  id: string;
  title: string;
  summary: string;
  category: "jobs" | "transit" | "economy" | "investment" | "regional";
  region?: string;
  publishedAt: string;
  tags: string[];
  highlight?: string;
  provenance: DataProvenance;
};

export type SavedPlace = {
  id: string;
  name: string;
  address: string;
  type: "home" | "work" | "other";
  coordinates: Coordinates;
  createdAt: string;
};

export type EconomyMetric =
  | "unemployment"
  | "job-openings"
  | "median-income"
  | "median-wage"
  | "cost-of-living"
  | "industry-growth"
  | "population-change"
  | "transit-coverage"
  | "transit-jobs"
  | "public-investment";

export type StatewideStats = {
  unemploymentRate: number;
  laborForceParticipation: number;
  openJobs: number;
  medianWage: number;
  fastestGrowingIndustries: { name: string; growth: number }[];
  transitAccessibleJobShare: number;
  provenance: DataProvenance;
};
