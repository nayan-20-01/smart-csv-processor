import { CrmRecord } from "@groweasy/shared";

export interface LlmProvider {
  extractRecords(
    rows: Record<string, string>[]
  ): Promise<Partial<CrmRecord>[]>;
}