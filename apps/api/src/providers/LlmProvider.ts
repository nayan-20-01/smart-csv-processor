// apps/api/src/providers/LlmProvider.ts
import { CrmRecord } from "@groweasy/shared";
import { IndexedRow } from "../utils/csvStreamParser";

export interface ColumnDetectionResult {
  emailColumns: string[];
  mobileColumns: string[];
}

export interface LlmProvider {
  extractRecords(rows: IndexedRow[]): Promise<Partial<CrmRecord>[]>;
  detectContactColumns(headers: string[]): Promise<ColumnDetectionResult>;
}