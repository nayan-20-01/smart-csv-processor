import { LlmProvider } from "../providers/LlmProvider";
import { GeminiProvider } from "../providers/GeminiProvider";
import { MockProvider } from "../providers/MockProvider";

export function getLlmProvider(): LlmProvider {
  if (process.env.LLM_PROVIDER === "mock") {
    return new MockProvider();
  }
  return new GeminiProvider(process.env.GEMINI_API_KEY ?? "");
}