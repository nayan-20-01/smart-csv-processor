// apps/api/src/providers/GeminiProvider.ts
import { GoogleGenAI } from "@google/genai";
import { LlmProvider } from "./LlmProvider";
import { CrmRecord } from "@groweasy/shared";
import { IndexedRow } from "../utils/csvStreamParser";
import { buildExtractionPrompt } from "./geminiPrompt";
import { crmRecordResponseSchema } from "./geminiSchema";
import { buildColumnDetectionPrompt, columnDetectionResponseSchema } from "./geminiColumnDetection";
import { ColumnDetectionResult } from "./LlmProvider";

const MODEL_NAME = "gemini-3.5-flash";

export class GeminiProvider implements LlmProvider {
  private client: GoogleGenAI;

  constructor(apiKey: string) {
    if (!apiKey) {
      throw new Error("GeminiProvider requires a non-empty API key");
    }
    this.client = new GoogleGenAI({ apiKey });
  }

  async extractRecords(rows: IndexedRow[]): Promise<Partial<CrmRecord>[]> {
    const prompt = buildExtractionPrompt(rows);
    
    const response = await this.client.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: crmRecordResponseSchema,
      },
    });
    
    const text = response.text;
    if (!text) {
      throw new Error("Gemini returned an empty response");
    }
    
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      throw new Error("Gemini response was not valid JSON");
    }
    
    if (!Array.isArray(parsed)) {
      throw new Error("Gemini response was not a JSON array as expected");
    }
    
    return parsed as Partial<CrmRecord>[];
  }
  async detectContactColumns(headers: string[]): Promise<ColumnDetectionResult> {
    const prompt = buildColumnDetectionPrompt(headers);
    const response = await this.client.models.generateContent({
      model: "gemini-3.5-flash", // Making sure we use the current model!
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: columnDetectionResponseSchema,
      },
    });

    const text = response.text;
    if (!text) {
      throw new Error("Gemini returned an empty response for column detection");
    }

    const parsed = JSON.parse(text) as ColumnDetectionResult;
    const headerSet = new Set(headers);
    
    return {
      emailColumns: (parsed.emailColumns ?? []).filter((c) => headerSet.has(c)),
      mobileColumns: (parsed.mobileColumns ?? []).filter((c) => headerSet.has(c)),
    };
  }
}