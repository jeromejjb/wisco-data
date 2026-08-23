/** Format population for map UI — compact at scale, precise under 100k. */
export function formatPopulation(value: number, opts?: { estimate?: boolean }): string {
  if (!Number.isFinite(value) || value <= 0) return "—";
  const prefix = opts?.estimate ? "~" : "";
  if (value >= 1_000_000) {
    const m = value / 1_000_000;
    return `${prefix}${m >= 10 ? m.toFixed(0) : m.toFixed(2)}M`;
  }
  if (value >= 10_000) {
    return `${prefix}${Math.round(value / 1000)}k`;
  }
  return `${prefix}${value.toLocaleString()}`;
}

/** Wisconsin statewide LFPR (~2023 ACS) — used to estimate population from WisConomy labor force. */
export const WI_LFPR_ESTIMATE = 0.628;

export function estimatePopulationFromLaborForce(laborForce: number): number {
  if (laborForce <= 0) return 0;
  return Math.round(laborForce / WI_LFPR_ESTIMATE);
}

export function formatIncome(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return "—";
  if (value >= 100_000) return `$${Math.round(value / 1000)}k`;
  return `$${value.toLocaleString()}`;
}
