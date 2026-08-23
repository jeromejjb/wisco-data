import type { ChoroplethMetric } from "@/lib/agent/map-actions";
import { formatPopulation, formatIncome } from "@/lib/format-population";
import { formatCountyDataValue } from "@/components/map/map-story-banner";

export function buildCountyHoverHtml(input: {
  name: string;
  fips: string;
  population?: number;
  populationIsEstimate?: boolean;
  medianIncome?: number;
  choroplethMetric: ChoroplethMetric | null;
  choroplethValues: Record<string, number>;
  choroplethLabels: Record<string, string>;
  unemploymentRate?: number;
}): string {
  const countyLabel = input.name.endsWith(" County") ? input.name : `${input.name} County`;
  const rows: string[] = [];

  if (input.population && input.population > 0) {
    rows.push(
      `<div class="county-popup-stat"><span class="county-popup-stat-label">Population</span><span class="county-popup-stat-value">${formatPopulation(input.population, { estimate: input.populationIsEstimate })}</span></div>`
    );
  }

  const dataLine = formatCountyDataValue(
    input.choroplethMetric,
    input.fips,
    input.choroplethValues,
    input.choroplethLabels
  );
  if (dataLine) {
    rows.push(
      `<div class="county-popup-stat"><span class="county-popup-stat-label">Layer</span><span class="county-popup-stat-value">${dataLine}</span></div>`
    );
  } else if (input.unemploymentRate != null) {
    rows.push(
      `<div class="county-popup-stat"><span class="county-popup-stat-label">Unemployment</span><span class="county-popup-stat-value">${input.unemploymentRate.toFixed(1)}%</span></div>`
    );
  }

  if (input.medianIncome && input.medianIncome > 0) {
    rows.push(
      `<div class="county-popup-stat"><span class="county-popup-stat-label">Median income</span><span class="county-popup-stat-value">${formatIncome(input.medianIncome)}</span></div>`
    );
  }

  const statsBlock =
    rows.length > 0
      ? `<div class="county-popup-stats">${rows.join("")}</div>`
      : "";

  return `<div class="county-popup-card">
    <div class="county-popup-name">${countyLabel}</div>
    ${statsBlock}
    <div class="county-popup-hint">Click for details</div>
  </div>`;
}
