// apps/api/src/services/columnDetectionService.ts
import { LlmProvider, ColumnDetectionResult } from "../providers/LlmProvider";
import { detectColumnsNaive } from "../utils/csvStreamParser";

export async function detectContactColumns(
  provider: LlmProvider,
  headers: string[]
): Promise<ColumnDetectionResult> {
  const naive = detectColumnsNaive(headers);
  try {
    const llmResult = await provider.detectContactColumns(headers);
    return {
      emailColumns: Array.from(new Set([...llmResult.emailColumns, ...naive.emailColumns])),
      mobileColumns: Array.from(new Set([...llmResult.mobileColumns, ...naive.mobileColumns])),
    };
  } catch (err) {
    console.warn(`[columnDetectionService] LLM column detection failed, falling back to naive heuristic only.`);
    return naive;
  }
}