// apps/web/src/store/importStore.ts
import { create } from "zustand";
import { ParseWarning } from "@/lib/csvParser";

export type Step = "upload" | "preview" | "confirm" | "results";

interface ImportState {
  step: Step;
  rawRows: Record<string, string>[];
  jobId: string | null;
  
  // Parse-time state
  isParsing: boolean;
  rowsParsedSoFar: number;
  parseWarnings: ParseWarning[];
  warningsAcknowledged: boolean;
  
  setStep: (step: Step) => void;
  setRawRows: (rows: Record<string, string>[]) => void;
  appendRows: (rows: Record<string, string>[]) => void;
  setJobId: (id: string) => void;
  
  setIsParsing: (parsing: boolean) => void;
  setRowsParsedSoFar: (n: number) => void;
  setParseWarnings: (warnings: ParseWarning[]) => void;
  acknowledgeWarnings: () => void;
  resetForNewFile: () => void;
}

export const useImportStore = create<ImportState>((set) => ({
  step: "upload",
  rawRows: [],
  jobId: null,
  isParsing: false,
  rowsParsedSoFar: 0,
  parseWarnings: [],
  warningsAcknowledged: false,
  
  setStep: (step) => set({ step }),
  setRawRows: (rawRows) => set({ rawRows }),
  appendRows: (chunk) =>
    set((state) => ({ rawRows: [...state.rawRows, ...chunk] })),
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
}));