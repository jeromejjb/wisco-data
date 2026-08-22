import type { Job } from "@/lib/types";

export function filterJobs(
  jobs: Job[],
  filters: {
    keyword?: string;
    industry?: string;
    transitOnly?: boolean;
    maxCommute?: number;
    maxTransfers?: number;
    minSalary?: number;
    employmentType?: string;
    workMode?: string;
  }
): Job[] {
  return jobs.filter((job) => {
    if (filters.keyword) {
      const q = filters.keyword.toLowerCase();
      const match =
        job.title.toLowerCase().includes(q) ||
        job.employer.toLowerCase().includes(q) ||
        job.skills.some((s) => s.toLowerCase().includes(q));
      if (!match) return false;
    }
    if (filters.industry && job.industry !== filters.industry) return false;
    if (filters.transitOnly && !job.transitAccessible) return false;
    if (
      filters.maxCommute &&
      job.commute &&
      job.commute.durationMinutes > filters.maxCommute
    )
      return false;
    if (
      filters.maxTransfers !== undefined &&
      job.commute &&
      job.commute.transfers > filters.maxTransfers
    )
      return false;
    if (filters.minSalary) {
      const pay =
        job.payType === "hourly" ? (job.payMin ?? 0) * 2080 : (job.payMin ?? 0);
      if (pay < filters.minSalary) return false;
    }
    if (filters.employmentType && job.employmentType !== filters.employmentType)
      return false;
    if (filters.workMode && job.workMode !== filters.workMode) return false;
    return true;
  });
}

export function rankJobsByReach(jobs: Job[]): Job[] {
  return [...jobs].sort((a, b) => computeReachScore(b) - computeReachScore(a));
}

function computeReachScore(job: Job): number {
  const pay =
    job.payType === "hourly"
      ? ((job.payMin ?? 0) + (job.payMax ?? 0)) / 2 * 2080
      : ((job.payMin ?? 0) + (job.payMax ?? 0)) / 2;
  const commutePenalty = job.commute ? job.commute.durationMinutes * 1.2 : 60;
  const transferPenalty = job.commute ? job.commute.transfers * 8 : 16;
  const scheduleBonus = job.commute?.scheduleCompatible ? 15 : -20;
  const ratingBonus = (job.employerRating ?? 3.5) * 5;
  return pay / 1000 - commutePenalty - transferPenalty + scheduleBonus + ratingBonus;
}
