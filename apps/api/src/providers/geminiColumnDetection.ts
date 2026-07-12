// apps/api/src/providers/geminiColumnDetection.ts

export function buildColumnDetectionPrompt(headers: string[]): string {
  return `You are an expert AI data mapper for a CRM ingestion pipeline (GrowEasy). 
Your exact job is to analyze the following raw CSV column headers and identify EVERY column that likely contains an email address or a phone number.

These headers come from messy, real-world sources like Facebook Lead Ads, Google Ads, arbitrary Excel sheets, and Real Estate CRMs. 
You must be highly aggressive in finding contact information.

Raw Column headers:
${JSON.stringify(headers)}

CRITICAL RULES:
1. EMAIL COLUMNS: Hunt for ANY variation of email. 
   Examples: "Email", "E-mail", "Contact E-mail", "Mail", "Email Address", "Work Email", "Personal Email".
2. MOBILE COLUMNS: Hunt for ANY variation of phone or mobile. 
   Examples: "Phone", "Mobile", "Cell", "Lead Phone", "Phn", "Contact No", "WhatsApp", "Phone Number", "Primary Phone".
3. STRICT EXACT MATCH: You MUST return the column name EXACTLY as it appears in the raw list above. Do not change capitalization, remove spaces, or alter punctuation. If you change even one character, the pipeline will break.
4. A column can appear in at most one category. If absolutely no columns match a category, return an empty array for it.`;
}

export const columnDetectionResponseSchema = {
  type: "object",
  properties: {
    emailColumns: { type: "array", items: { type: "string" } },
    mobileColumns: { type: "array", items: { type: "string" } },
  },
  required: ["emailColumns", "mobileColumns"],
};
