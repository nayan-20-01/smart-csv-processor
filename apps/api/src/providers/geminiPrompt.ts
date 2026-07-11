// apps/api/src/providers/geminiPrompt.ts
import { IndexedRow } from "../utils/csvStreamParser";

export function buildExtractionPrompt(rows: IndexedRow[]): string {
  const inputPayload = rows.map((r) => ({
    row_index: r.row_index,
    columns: r.raw,
  }));
  
  return `You are extracting structured CRM lead data from raw CSV rows with arbitrary, inconsistent column names.
For each input row, produce one output object. Rules:
- Always echo back the exact "row_index" you were given for that row — this is how outputs are matched back to inputs, it is not a data field to infer.
- "email": the first email address found in the row's columns, or null if none.
- "mobile_without_country_code" / "country_code": split the first phone number found; if no country code is present, infer it only if you are confident, otherwise leave country_code null.
- If a row contains MORE than one email or phone number, put the additional ones in "crm_note" as free text.
- "crm_status": one of GOOD_LEAD_FOLLOW_UP, DID_NOT_CONNECT, BAD_LEAD, SALE_DONE — set this ONLY if the row's content clearly indicates one of these. If you are not confident, set it to null. Never guess.
- "data_source": one of leads_on_demand, meridian_tower, eden_park, varah_swamy, sarjapur_plots — set this ONLY on a confident match.
- "created_at": normalize to an ISO 8601 date string if a date is present and parseable; otherwise null. Never invent a date.
- Every other field: map from the most semantically appropriate column, or null if no reasonable match exists.

Input rows (JSON):
${JSON.stringify(inputPayload)}`;
}