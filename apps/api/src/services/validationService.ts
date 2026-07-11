import { CrmRecordSchema, CrmRecord, RowOutcome } from "@groweasy/shared";

/** * Validates a single AI-extracted record against CrmRecordSchema. 
 * Never trusts structured-output mode alone (architecture.md §2 step 7) — 
 * Gemini's responseSchema constrains generation, but doesn't guarantee 
 * validity (e.g. it can still hallucinate an enum-adjacent string in 
 * some edge cases, or omit row_index). 
 * * Returns a RowOutcome: "imported" on success, "needs_review" on failure. 
 */
export function validateExtractedRecord(
  candidate: unknown,
  raw: Record<string, string>
): RowOutcome {
  const result = CrmRecordSchema.safeParse(candidate);
  if (result.success) {
    return { status: "imported", record: result.data };
  }
  const rowIndex = extractRowIndex(candidate);
  return {
    status: "needs_review",
    row_index: rowIndex,
    raw,
    reason: summarizeZodError(result.error),
  };
}

/** * Batch variant — validates every record returned from a single LLM call. 
 * `rawByIndex` lets us attach the original row data to needs_review outcomes 
 * even when the AI response is malformed enough that we can't trust its 
 * own row_index field. 
 */
export function validateBatch(
  candidates: unknown[],
  rawByIndex: Map<number, Record<string, string>>
): RowOutcome[] {
  return candidates.map((candidate) => {
    const rowIndex = extractRowIndex(candidate);
    const raw = rawByIndex.get(rowIndex) ?? {};
    return validateExtractedRecord(candidate, raw);
  });
}

function extractRowIndex(candidate: unknown): number {
  if (
    typeof candidate === "object" &&
    candidate !== null &&
    "row_index" in candidate &&
    typeof (candidate as Record<string, unknown>).row_index === "number"
  ) {
    return (candidate as { row_index: number }).row_index;
  }
  return -1; // sentinel: row_index itself was missing/invalid
}

function summarizeZodError(error: { issues: Array<{ path: (string | number)[]; message: string }> }): string {
  // Keep this human-readable for the results UI (contract.md notes evaluators 
  // should be able to see the imported/skipped/needs_review distinction).
  return error.issues
    .map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`)
    .join("; ");
}