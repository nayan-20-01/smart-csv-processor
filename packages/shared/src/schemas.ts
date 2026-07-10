// packages/shared/src/schemas.ts
import { z } from "zod";

// --- Enums (contract.md §2.1) ---

export const CrmStatus = z.enum([
  "GOOD_LEAD_FOLLOW_UP",
  "DID_NOT_CONNECT",
  "BAD_LEAD",
  "SALE_DONE",
]);
export type CrmStatus = z.infer<typeof CrmStatus>;

export const DataSource = z.enum([
  "leads_on_demand",
  "meridian_tower",
  "eden_park",
  "varah_swamy",
  "sarjapur_plots",
]);
export type DataSource = z.infer<typeof DataSource>;

// --- CRM Record (contract.md §2.1) ---
// Note: crm_status / data_source are null when the AI isn't confident —
// never invented. Post-AI validation (architecture.md §2 step 7) checks
// against this schema; failures route to needs_review, not a forced guess.

export const CrmRecordSchema = z.object({
  row_index: z.number().int().nonnegative(),
  created_at: z.string().nullable().refine(
    (val) => val === null || !isNaN(new Date(val).getTime()),
    { message: "created_at must be parseable by new Date()" }
  ),
  name: z.string().nullable(),
  email: z.string().nullable(),
  country_code: z.string().nullable(),
  mobile_without_country_code: z.string().nullable(),
  company: z.string().nullable(),
  city: z.string().nullable(),
  state: z.string().nullable(),
  country: z.string().nullable(),
  lead_owner: z.string().nullable(),
  crm_status: CrmStatus.nullable(),
  crm_note: z.string().nullable(),
  data_source: DataSource.nullable(),
  possession_time: z.string().nullable(),
  description: z.string().nullable(),
});
export type CrmRecord = z.infer<typeof CrmRecordSchema>;

// --- Row Outcome (contract.md §2.2) ---
// Discriminated union on `status` — every input row resolves to exactly
// one of these three, never silently dropped (invariant #1 in contract.md §5).

export const RowOutcomeSchema = z.discriminatedUnion("status", [
  z.object({
    status: z.literal("imported"),
    record: CrmRecordSchema,
  }),
  z.object({
    status: z.literal("skipped"),
    row_index: z.number().int().nonnegative(),
    reason: z.literal("no_email_or_mobile"),
  }),
  z.object({
    status: z.literal("needs_review"),
    row_index: z.number().int().nonnegative(),
    raw: z.record(z.string(), z.string()),
    reason: z.string(),
  }),
]);
export type RowOutcome = z.infer<typeof RowOutcomeSchema>;

// --- API request/response shapes (contract.md §3) ---

export const ImportStartRequestSchema = z.object({
  rows: z.array(z.record(z.string(), z.string())),
});
export type ImportStartRequest = z.infer<typeof ImportStartRequestSchema>;

export const ImportStartResponseSchema = z.object({
  jobId: z.string().uuid(),
});
export type ImportStartResponse = z.infer<typeof ImportStartResponseSchema>;

export const SseProgressEventSchema = z.object({
  type: z.literal("progress"),
  batchesCompleted: z.number().int().nonnegative(),
  batchesTotal: z.number().int().nonnegative(),
});

export const SseCompleteEventSchema = z.object({
  type: z.literal("complete"),
  result: z.object({
    imported: z.array(CrmRecordSchema),
    skipped: z.array(
      z.object({ row_index: z.number(), reason: z.literal("no_email_or_mobile") })
    ),
    needsReview: z.array(
      z.object({
        row_index: z.number(),
        raw: z.record(z.string(), z.string()),
        reason: z.string(),
      })
    ),
    totals: z.object({
      imported: z.number(),
      skipped: z.number(),
      needsReview: z.number(),
      total: z.number(),
    }),
  }),
});

export const SseErrorEventSchema = z.object({
  type: z.literal("error"),
  message: z.string(),
});

export const SseEventSchema = z.discriminatedUnion("type", [
  SseProgressEventSchema,
  SseCompleteEventSchema,
  SseErrorEventSchema,
]);
export type SseEvent = z.infer<typeof SseEventSchema>;

// --- Error shape (contract.md §4) ---

export const ErrorCodeSchema = z.enum([
  "VALIDATION_ERROR",
  "LLM_PROVIDER_ERROR",
  "INTERNAL_ERROR",
  "JOB_NOT_FOUND",
]);

export const ApiErrorSchema = z.object({
  error: z.object({
    code: ErrorCodeSchema,
    message: z.string(),
    details: z.record(z.string(), z.unknown()).optional(),
  }),
});
export type ApiError = z.infer<typeof ApiErrorSchema>;