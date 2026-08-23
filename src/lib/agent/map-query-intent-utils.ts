import { countyIdsFromText } from "@/lib/county-lookup";

/** Shared county token matching for pins and intent — all 72 WI counties. */
export function countiesFromText(text: string): string[] {
  return countyIdsFromText(text);
}
