/** Server-side helpers for job API env configuration */

export type JobsEnvStatus = {
  usajobsReady: boolean;
  adzunaReady: boolean;
  anyLiveSource: boolean;
  missing: string[];
};

export function getJobsEnvStatus(): JobsEnvStatus {
  const usajobsReady = Boolean(
    process.env.USAJOBS_AUTH_KEY?.trim() && process.env.USAJOBS_USER_AGENT?.trim()
  );
  const adzunaReady = Boolean(
    process.env.ADZUNA_APP_ID?.trim() && process.env.ADZUNA_APP_KEY?.trim()
  );

  const missing: string[] = [];
  if (!process.env.USAJOBS_AUTH_KEY?.trim()) missing.push("USAJOBS_AUTH_KEY");
  if (!process.env.USAJOBS_USER_AGENT?.trim()) missing.push("USAJOBS_USER_AGENT");
  if (!process.env.ADZUNA_APP_ID?.trim()) missing.push("ADZUNA_APP_ID");
  if (!process.env.ADZUNA_APP_KEY?.trim()) missing.push("ADZUNA_APP_KEY");

  return {
    usajobsReady,
    adzunaReady,
    anyLiveSource: usajobsReady || adzunaReady,
    missing,
  };
}
