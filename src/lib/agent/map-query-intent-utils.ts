import { WI_COUNTIES } from "@/lib/wi-counties";

/** Shared county token matching for pins and intent. */
export function countiesFromText(text: string): string[] {
  const lower = text.toLowerCase();
  const ids: string[] = [];
  for (const c of WI_COUNTIES) {
    const first = c.name.split(" ")[0].toLowerCase();
    if (lower.includes(c.id) || lower.includes(first)) {
      ids.push(c.id);
    }
  }
  return [...new Set(ids)];
}
