// apps/web/src/store/importStore.ts
import { create } from "zustand";
import { ParseWarning } from "../lib/csvParser";
import { RowOutcome, CrmRecord } from "@groweasy/shared";

export type Step = "upload" | "preview" | "confirm" | "results";
export type JobStatus = "idle" | "connecting" | "streaming" | "complete" | "error" | "not_found";

export interface ImportResult {
  imported: CrmRecord[];
  skipped: Extract<RowOutcome, { status: "skipped" }>[];
  needsReview: Extract<RowOutcome, { status: "needs_review" }>[];
  totals: { imported: number; skipped: number; needsReview: number; total: number };
}

interface ImportState {
  step: Step;
  rawRows: Record<string, string>[];
  jobId: string | null;
  isParsing: boolean;
  rowsParsedSoFar: number;
  parseWarnings: ParseWarning[];
  warningsAcknowledged: boolean;
  
  // Job/SSE state
  jobStatus: JobStatus;
  batchesCompleted: number;
  batchesTotal: number;
  result: ImportResult | null;
  jobErrorMessage: string | null;
  
  setStep: (step: Step) => void;
  setRawRows: (rows: Record<string, string>[]) => void;
  appendRows: (rows: Record<string, string>[]) => void;
  setJobId: (id: string | null) => void;
  setIsParsing: (parsing: boolean) => void;
  setRowsParsedSoFar: (n: number) => void;
  setParseWarnings: (warnings: ParseWarning[]) => void;
  acknowledgeWarnings: () => void;
  resetForNewFile: () => void;
  
  setJobStatus: (status: JobStatus) => void;
  setProgress: (completed: number, total: number) => void;
  setResult: (result: ImportResult) => void;
  setJobError: (message: string) => void;
  resetJob: () => void;
  
  // Wipes the entire store clean (fixes the refresh bug)
  resetAll: () => void;
}

export const useImportStore = create<ImportState>((set) => ({
  step: "upload",
  rawRows: [],
  jobId: null,
  isParsing: false,
  rowsParsedSoFar: 0,
  parseWarnings: [],
  warningsAcknowledged: false,
  jobStatus: "idle",
  batchesCompleted: 0,
  batchesTotal: 0,
  result: null,
  jobErrorMessage: null,

  setStep: (step) => set({ step }),
  setRawRows: (rawRows) => set({ rawRows }),
  appendRows: (chunk) => set((state) => ({ rawRows: [...state.rawRows, ...chunk] })),
  setJobId: (jobId) => set({ jobId }),
  setIsParsing: (isParsing) => set({ isParsing }),
  setRowsParsedSoFar: (rowsParsedSoFar) => set({ rowsParsedSoFar }),
  setParseWarnings: (parseWarnings) => set({ parseWarnings }),
  acknowledgeWarnings: () => set({ warningsAcknowledged: true }),
  
  resetForNewFile: () =>
    set({
      rawRows: [],
      isParsing: false,
      rowsParsedSoFar: 0,
      parseWarnings: [],
      warningsAcknowledged: false,
    }),

  setJobStatus: (jobStatus) => set({ jobStatus }),
  setProgress: (batchesCompleted, batchesTotal) => set({ batchesCompleted, batchesTotal }),
  setResult: (result) => set({ result, jobStatus: "complete" }),
  setJobError: (jobErrorMessage) => set({ jobErrorMessage, jobStatus: "error" }),
  
  resetJob: () =>
    set({
      jobId: null,
      jobStatus: "idle",
      batchesCompleted: 0,
      batchesTotal: 0,
      result: null,
      jobErrorMessage: null,
    }),

  // Factory reset for the entire store
  resetAll: () =>
    set({
      step: "upload",
      rawRows: [],
      jobId: null,
      isParsing: false,
      rowsParsedSoFar: 0,
      parseWarnings: [],
      warningsAcknowledged: false,
      jobStatus: "idle",
      batchesCompleted: 0,
      batchesTotal: 0,
      result: null,
      jobErrorMessage: null,
    }),
}));