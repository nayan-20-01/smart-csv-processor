// apps/web/src/components/steps/ResultsStep.tsx
"use client";
import { useState } from "react";
import { ColumnDef, createColumnHelper } from "@tanstack/react-table";
import { CheckCircle2, XCircle, Download, RotateCcw } from "lucide-react";
import { CrmRecord, RowOutcome } from "@groweasy/shared";
import { useImportStore } from "@/store/importStore";
import { ResultsTable } from "@/components/results/ResultsTable";
import { buildNeedsReviewCsv, downloadCsv } from "@/lib/csvExport";

type SkippedOutcome = Extract<RowOutcome, { status: "skipped" }>;
type NeedsReviewOutcome = Extract<RowOutcome, { status: "needs_review" }>;
type Tab = "imported" | "skipped" | "needs_review";

const crmColumnHelper = createColumnHelper<CrmRecord>();
const importedColumns: ColumnDef<CrmRecord, any>[] = [
  crmColumnHelper.accessor("row_index", { header: "Row" }),
  crmColumnHelper.accessor("name", { header: "Name" }),
  crmColumnHelper.accessor("email", { header: "Email" }),
  crmColumnHelper.accessor("mobile_without_country_code", { header: "Mobile" }),
  crmColumnHelper.accessor("crm_status", { header: "Status" }),
  crmColumnHelper.accessor("data_source", { header: "Source" }),
  crmColumnHelper.accessor("city", { header: "City" }),
  crmColumnHelper.accessor("crm_note", { header: "Note" }),
] as ColumnDef<CrmRecord, any>[];

const skippedColumnHelper = createColumnHelper<SkippedOutcome>();
const skippedColumns: ColumnDef<SkippedOutcome, any>[] = [
  skippedColumnHelper.accessor("row_index", { header: "Row" }),
  skippedColumnHelper.accessor("reason", { header: "Reason" }),
] as ColumnDef<SkippedOutcome, any>[];

const needsReviewColumnHelper = createColumnHelper<NeedsReviewOutcome>();
const needsReviewColumns: ColumnDef<NeedsReviewOutcome, any>[] = [
  needsReviewColumnHelper.accessor("row_index", { header: "Row" }),
  needsReviewColumnHelper.accessor("reason", { header: "Reason" }),
  needsReviewColumnHelper.accessor((row) => JSON.stringify(row.raw), {
    id: "raw_preview",
    header: "Original Row Data",
    cell: (info) => (
      <span className="text-xs text-gray-500 dark:text-gray-400">{info.getValue()}</span>
    ),
  }),
] as ColumnDef<NeedsReviewOutcome, any>[];

export function ResultsStep() {
  const jobStatus = useImportStore((s) => s.jobStatus);
  const batchesCompleted = useImportStore((s) => s.batchesCompleted);
  const batchesTotal = useImportStore((s) => s.batchesTotal);
  const result = useImportStore((s) => s.result);
  const jobErrorMessage = useImportStore((s) => s.jobErrorMessage);
  const setStep = useImportStore((s) => s.setStep);
  const resetForNewFile = useImportStore((s) => s.resetForNewFile);
  const resetJob = useImportStore((s) => s.resetJob);
  const [activeTab, setActiveTab] = useState<Tab>("imported");

  const handleExportNeedsReview = () => {
    if (!result || result.needsReview.length === 0) return;
    const csv = buildNeedsReviewCsv(result.needsReview);
    downloadCsv(`needs_review_${new Date().toISOString().slice(0, 10)}.csv`, csv);
  };

  const handleStartOver = () => {
    resetForNewFile();
    resetJob();
    setStep("upload");
  };

  if (jobStatus === "not_found") {
    return (
      <div className="space-y-4">
        <div className="flex items-start gap-3 p-4 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900">
          <XCircle size={20} className="text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
          <p className="text-red-700 dark:text-red-300 text-sm">
            This import job couldn't be found. It may have expired, or the server may have
            restarted since it was created — job state isn't persisted between server restarts.
          </p>
        </div>
        <StartOverButton onClick={handleStartOver} />
      </div>
    );
  }

  if (jobStatus === "error") {
    return (
      <div className="space-y-4">
        <div className="flex items-start gap-3 p-4 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900">
          <XCircle size={20} className="text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
          <p className="text-red-700 dark:text-red-300 text-sm">
            {jobErrorMessage ?? "Something went wrong while processing this import."}
          </p>
        </div>
        <StartOverButton onClick={handleStartOver} />
      </div>
    );
  }

  if (!result) {
    const progressPct = batchesTotal > 0 ? Math.round((batchesCompleted / batchesTotal) * 100) : 0;
    return (
      <div className="space-y-4 py-4">
        <div className="flex items-center justify-center gap-3">
          <div className="h-6 w-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-600 dark:text-gray-300">
            {jobStatus === "connecting" && "Connecting to import job…"}
            {jobStatus === "streaming" &&
              (batchesTotal > 0
                ? `Processing batch ${batchesCompleted} of ${batchesTotal}…`
                : "Processing…")}
          </p>
        </div>
        <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-2.5 overflow-hidden">
          <div
            className="bg-blue-600 dark:bg-blue-500 h-2.5 transition-all duration-300"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>
    );
  }

  const { imported, skipped, needsReview, totals } = result;
  const reconciled = totals.imported + totals.skipped + totals.needsReview === totals.total;

  return (
    <div className="space-y-4">
      <div
        className={`flex items-center gap-2.5 rounded-xl p-4 border ${
          reconciled
            ? "bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-900 text-green-800 dark:text-green-300"
            : "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900 text-red-800 dark:text-red-300"
        }`}
      >
        {reconciled ? (
          <CheckCircle2 size={20} className="shrink-0" />
        ) : (
          <XCircle size={20} className="shrink-0" />
        )}
        <p className="text-sm">
          <strong>
            {totals.imported + totals.skipped + totals.needsReview} of {totals.total}
          </strong>{" "}
          rows accounted for
          {!reconciled && " — totals don't reconcile, this shouldn't happen. Please report this."}
        </p>
      </div>

      <div className="flex gap-1 border-b border-gray-200 dark:border-gray-800">
        {(["imported", "skipped", "needs_review"] as Tab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeTab === tab
                ? "border-blue-600 dark:border-blue-500 text-blue-600 dark:text-blue-400"
                : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
            }`}
          >
            {tab === "imported" && `Imported (${totals.imported})`}
            {tab === "skipped" && `Skipped (${totals.skipped})`}
            {tab === "needs_review" && `Needs Review (${totals.needsReview})`}
          </button>
        ))}
      </div>

      {activeTab === "needs_review" && needsReview.length > 0 && (
        <button
          onClick={handleExportNeedsReview}
          className="flex items-center gap-2 text-sm px-3.5 py-2 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-200 transition-colors"
        >
          <Download size={15} />
          Export needs-review rows as CSV
        </button>
      )}

      {activeTab === "imported" && (
        <ResultsTable data={imported} columns={importedColumns} emptyMessage="No rows were imported." />
      )}
      {activeTab === "skipped" && (
        <ResultsTable data={skipped} columns={skippedColumns} emptyMessage="No rows were skipped." />
      )}
      {activeTab === "needs_review" && (
        <ResultsTable
          data={needsReview}
          columns={needsReviewColumns}
          emptyMessage="No rows need review."
        />
      )}
      <StartOverButton onClick={handleStartOver} />
    </div>
  );
}

function StartOverButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 text-sm text-blue-600 dark:text-blue-400 hover:underline"
    >
      <RotateCcw size={14} />
      Start a new import
    </button>
  );
}