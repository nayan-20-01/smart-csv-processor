import { getJob } from "../state/jobStore";

export async function processImportJob(jobId: string) {
  const job = getJob(jobId);
  if (!job) return;

  // We will add the batching logic here in Phase 3
  job.emit({
    type: "complete",
    result: {
      imported: [],
      skipped: [],
      needsReview: [],
      totals: { imported: 0, skipped: 0, needsReview: 0, total: job.rows.length },
    },
  });
}