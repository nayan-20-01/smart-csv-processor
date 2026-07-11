// apps/api/src/providers/geminiColumnDetection.ts
export function buildColumnDetectionPrompt(headers: string[]): string {
  return `You are analyzing the column headers of a CSV file (not the data itself) to identify which columns likely contain email addresses and which likely contain phone/mobile numbers.
Column headers:
${JSON.stringify(headers)}

Rules:
- A column can appear in at most one category, or neither.
- Only include a column if you are reasonably confident based on its name (e.g. "Email", "Contact No.", "Primary Phone", "Reach Us At" are confident matches; "Notes", "City" are not).
- If no columns clearly match a category, return an empty array for it.
- Return ONLY column names exactly as given above — do not alter capitalization or spacing.`;
}

export const columnDetectionResponseSchema = {
  type: "object",
  properties: {
    emailColumns: { type: "array", items: { type: "string" } },
    mobileColumns: { type: "array", items: { type: "string" } },
  },
  required: ["emailColumns", "mobileColumns"],
};