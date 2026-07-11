/** * Backend-side row indexing utility (architecture.md §2 step 3). 
 * Note: actual CSV *parsing* happens client-side via Papaparse 
 * (architecture.md §1 — "zero backend calls" for parse+preview). 
 * This util operates on already-parsed row objects arriving in the 
 * POST /api/import/start body, assigning the stable row_index that 
 * survives the entire pipeline. 
 * * TODO Phase 3: implement the pre-AI deterministic skip-pass column 
 * detection heuristic here (see architecture.md §5 open item — 
 * recognizing "email"-like columns across arbitrary naming). 
 */
export interface IndexedRow {
  row_index: number;
  raw: Record<string, string>;
}

export function assignRowIndices(rows: Record<string, string>[]): IndexedRow[] {
  return rows.map((raw, row_index) => ({ row_index, raw }));
}

/** * Deterministic skip check (ADR-005): true if row has neither an 
 * email-like nor mobile-like value across likely column name variants. 
 * Pure rule, no AI — must stay cheap and synchronous. 
 * * TODO Phase 3: replace naive key matching with the real heuristic 
 * (case-insensitive, handles "Email Address", "phone_no", "Mobile No.", etc.) 
 */
const EMAIL_KEY_HINTS = ["email", "e-mail", "mail"];
const MOBILE_KEY_HINTS = ["mobile", "phone", "contact", "cell"];

export function shouldSkipRow(raw: Record<string, string>): boolean {
  const keys = Object.keys(raw).map((k) => k.toLowerCase());
  const hasEmailColumn = keys.some((k) =>
    EMAIL_KEY_HINTS.some((hint) => k.includes(hint))
  );
  const hasMobileColumn = keys.some((k) =>
    MOBILE_KEY_HINTS.some((hint) => k.includes(hint))
  );
  const hasEmailValue =
    hasEmailColumn &&
    Object.entries(raw).some(
      ([k, v]) =>
        EMAIL_KEY_HINTS.some((hint) => k.toLowerCase().includes(hint)) &&
        v?.trim()
    );
  const hasMobileValue =
    hasMobileColumn &&
    Object.entries(raw).some(
      ([k, v]) =>
        MOBILE_KEY_HINTS.some((hint) => k.toLowerCase().includes(hint)) &&
        v?.trim()
    );
  return !hasEmailValue && !hasMobileValue;
}