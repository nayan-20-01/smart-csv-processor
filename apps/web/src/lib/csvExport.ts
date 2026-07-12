// apps/web/src/lib/csvExport.ts
import Papa from "papaparse";
import { RowOutcome } from "@groweasy/shared";

type NeedsReviewOutcome = Extract<RowOutcome, { status: "needs_review" }>;

export function buildNeedsReviewCsv(needsReview: NeedsReviewOutcome[]): string {
  const allRawKeys = new Set<string>();
  for (const row of needsReview) {
    Object.keys(row.raw).forEach((key) => allRawKeys.add(key));
  }

  const rawColumns = Array.from(allRawKeys);
  const records = needsReview.map((row) => {
    const record: Record<string, string> = {
      row_index: String(row.row_index),
      reason: row.reason,
    };
    for (const col of rawColumns) {
      record[col] = row.raw[col] ?? "";
    }
    return record;
  });

  return Papa.unparse(records, {
    columns: ["row_index", "reason", ...rawColumns],
  });
}

export function downloadCsv(filename: string, csvContent: string) {
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}