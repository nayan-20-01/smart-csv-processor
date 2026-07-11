// apps/api/src/services/jobService.ts
import pLimit from "p-limit";
import { RowOutcome } from "@groweasy/shared";
import { getJob } from "../state/jobStore";
import { assignRowIndices, shouldSkipRow, IndexedRow } from "../utils/csvStreamParser";
import { createTokenBudgetedBatches } from "./batchService";
import { validateBatch } from "./validationService";
import { getLlmProvider } from "./providerFactory";
import { detectContactColumns } from "./columnDetectionService";

const MAX_CONCURRENT_BATCHES = 4;
const MAX_RETRIES = 3;
const BASE_BACKOFF_MS = 500;

export async function processImportJob(jobId: string) {
  const job = getJob(jobId);
  if (!job) return;

  try {
    const indexedRows = assignRowIndices(job.rows);
    const provider = getLlmProvider();
    
    // Step 4: The new Intelligent Column Detection!
    const headers = Array.from(new Set(indexedRows.flatMap((r) => Object.keys(r.raw))));
    const { emailColumns, mobileColumns } = await detectContactColumns(provider, headers);
    
    const skipped: Extract<RowOutcome, { status: "skipped" }>[] = [];
    const toProcess: IndexedRow[] = [];
    
    for (const row of indexedRows) {
      if (shouldSkipRow(row.raw, emailColumns, mobileColumns)) {
        skipped.push({
          status: "skipped",
          row_index: row.row_index,
          reason: "no_email_or_mobile",
        });
      } else {
        toProcess.push(row);
      }
    }

    const batches = createTokenBudgetedBatches(toProcess);
    const batchesTotal = batches.length;
    let batchesCompleted = 0;
    
    const limit = pLimit(MAX_CONCURRENT_BATCHES);
    const allOutcomes: RowOutcome[] = [...skipped];
    
    const batchPromises = batches.map((batch) =>
      limit(async () => {
        const rawByIndex = new Map(batch.rows.map((r) => [r.row_index, r.raw]));
        const candidates = await callProviderWithRetry(provider, batch.rows);
        const outcomes = validateBatch(candidates, rawByIndex);
        allOutcomes.push(...outcomes);
        batchesCompleted += 1;
        job.emit({ type: "progress", batchesCompleted, batchesTotal });
      })
    );
    
    await Promise.all(batchPromises);

    const imported = allOutcomes.filter(
      (o): o is Extract<RowOutcome, { status: "imported" }> => o.status === "imported"
    );
    const skippedOutcomes = allOutcomes.filter(
      (o): o is Extract<RowOutcome, { status: "skipped" }> => o.status === "skipped"
    );
    const needsReview = allOutcomes.filter(
      (o): o is Extract<RowOutcome, { status: "needs_review" }> => o.status === "needs_review"
    );

    job.emit({
      type: "complete",
      result: {
        imported: imported.map((o) => o.record),
        skipped: skippedOutcomes.map((o) => ({ row_index: o.row_index, reason: o.reason })),
        needsReview: needsReview.map((o) => ({
          row_index: o.row_index,
          raw: o.raw,
          reason: o.reason,
        })),
        totals: {
          imported: imported.length,
          skipped: skippedOutcomes.length,
          needsReview: needsReview.length,
          total: job.rows.length,
        },
      },
    });
  } catch (err) {
    job.emit({
      type: "error",
      message: err instanceof Error ? err.message : "Unknown error during import processing",
    });
  }
}

async function callProviderWithRetry(
  provider: ReturnType<typeof getLlmProvider>,
  rows: IndexedRow[]
): Promise<unknown[]> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const result = await provider.extractRecords(rows);
      if (attempt > 0) {
        console.warn(`[jobService] Batch of ${rows.length} rows succeeded on attempt ${attempt + 1}/${MAX_RETRIES + 1}`);
      }
      return result;
    } catch (err) {
      lastError = err;
      const message = err instanceof Error ? err.message : String(err);
      if (attempt < MAX_RETRIES) {
        const backoffMs = BASE_BACKOFF_MS * 2 ** attempt;
        console.warn(`[jobService] Batch of ${rows.length} rows failed on attempt ${attempt + 1}/${MAX_RETRIES + 1}: ${message} — retrying in ${backoffMs}ms`);
        await new Promise((resolve) => setTimeout(resolve, backoffMs));
      } else {
        console.warn(`[jobService] Batch of ${rows.length} rows exhausted all ${MAX_RETRIES + 1} attempts. Final error: ${message}`);
      }
    }
  }
  throw lastError;
}