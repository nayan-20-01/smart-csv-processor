import { GoogleGenerativeAI } from "@google/generative-ai";
import { LlmProvider } from "./LlmProvider";
import { CrmRecord } from "@groweasy/shared";

export class GeminiProvider implements LlmProvider {
  private client: GoogleGenerativeAI;

  constructor(apiKey: string) {
    this.client = new GoogleGenerativeAI(apiKey);
  }

  async extractRecords(
    rows: Record<string, string>[]
  ): Promise<Partial<CrmRecord>[]> {
    throw new Error("Not implemented — Phase 3");
  }
}
