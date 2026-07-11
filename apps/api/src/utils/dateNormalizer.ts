/** * Normalizes a loosely-formatted date string into an ISO string that 
 * satisfies `new Date(...)` parseability (contract.md invariant #4). 
 * Returns null if the input can't be confidently parsed — callers should 
 * treat null as "leave created_at null", not as an error by itself. 
 * * TODO Phase 3: flesh out real-world CSV date formats (DD/MM/YYYY vs 
 * MM/DD/YYYY ambiguity, Excel serial dates, "2 days ago"-style relative 
 * strings if any appear in sample data). 
 */
export function normalizeDate(input: string | null | undefined): string | null {
  if (!input || input.trim() === "") return null;
  const parsed = new Date(input);
  if (isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
}

/** Type guard used by validationService / tests. */
export function isValidDateString(value: string): boolean {
  return !isNaN(new Date(value).getTime());
}