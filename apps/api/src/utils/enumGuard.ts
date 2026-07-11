import { CrmStatus, DataSource } from "@groweasy/shared";

/** * Guards against hallucinated enum values from the LLM (contract.md 
 * invariants #2 and #3). Per ADR-006 / the CrmRecord contract: an 
 * unconfident or invalid value becomes null, it is never invented 
 * or coerced to a "closest match". 
 * * TODO Phase 3: decide whether to attempt fuzzy correction (e.g. 
 * "good_lead" -> "GOOD_LEAD_FOLLOW_UP") or stay strict. Current stub 
 * is strict-only, consistent with "null if AI not confident" in 
 * contract.md §2.1. 
 */
export function guardCrmStatus(value: unknown): CrmStatus | null {
  const result = CrmStatus.safeParse(value);
  return result.success ? result.data : null;
}

export function guardDataSource(value: unknown): DataSource | null {
  const result = DataSource.safeParse(value);
  return result.success ? result.data : null;
}