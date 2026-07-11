import { IndexedRow } from "../utils/csvStreamParser";

const CHARS_PER_TOKEN_ESTIMATE = 4; // rough chars/4 ≈ tokens heuristic
const DEFAULT_MAX_TOKENS_PER_BATCH = 4000; // safe placeholder ceiling

export interface RowBatch {
  rows: IndexedRow[];
}

export function estimateRowTokens(row: IndexedRow): number {
  const rawText = Object.values(row.raw).join(" ");
  return Math.ceil(rawText.length / CHARS_PER_TOKEN_ESTIMATE);
}

/**
 * Packs rows into batches under a token budget, not a fixed row count.
 */
export function createTokenBudgetedBatches(
  rows: IndexedRow[],
  maxTokensPerBatch: number = DEFAULT_MAX_TOKENS_PER_BATCH
): RowBatch[] {
  const batches: RowBatch[] = [];
  let currentBatch: IndexedRow[] = [];
  let currentTokens = 0;

  for (const row of rows) {
    const rowTokens = estimateRowTokens(row);
    
    // Edge case: a single row alone exceeds the budget. 
    if (rowTokens > maxTokensPerBatch) {
      if (currentBatch.length > 0) {
        batches.push({ rows: currentBatch });
        currentBatch = [];
        currentTokens = 0;
      }
      batches.push({ rows: [row] });
      continue;
    }
    
    if (currentTokens + rowTokens > maxTokensPerBatch && currentBatch.length > 0) {
      batches.push({ rows: currentBatch });
      currentBatch = [];
      currentTokens = 0;
    }
    
    currentBatch.push(row);
    currentTokens += rowTokens;
  }
  
  if (currentBatch.length > 0) {
    batches.push({ rows: currentBatch });
  }
  
  return batches;
}