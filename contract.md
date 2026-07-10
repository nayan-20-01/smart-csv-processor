# contract.md — Frontend ↔ Backend Contract

**Status:** Locked (Phase 0)
**Owners:** Frontend (Next.js, `apps/web`) and Backend (Express, `apps/api`)
**Source of truth:** This document is a human-readable mirror of the Zod schemas in `packages/shared`. If a type changes, `packages/shared` changes first, then this file is updated to match. Never the other way around.

---

## 1. Tech Context (for reference)

- LLM Provider: **Google Gemini** (`gemini-2.0-flash` or `gemini-1.5-flash`), accessed via a provider-agnostic interface (`packages/shared` types + `apps/api/src/providers/`)
- Persistence: **Stateless** — no database. Job state lives in-memory on the API server for the lifetime of an import job.
- Deployment: Frontend → Vercel. Backend → Railway/Render (persistent process, required for in-memory job state + SSE).

---

## 2. Shared Types (canonical — lives in `packages/shared/src/schemas.ts`)

### 2.1 CRM Record (output shape)

```ts
enum CrmStatus {
  GOOD_LEAD_FOLLOW_UP = "GOOD_LEAD_FOLLOW_UP",
  DID_NOT_CONNECT = "DID_NOT_CONNECT",
  BAD_LEAD = "BAD_LEAD",
  SALE_DONE = "SALE_DONE",
}

enum DataSource {
  leads_on_demand = "leads_on_demand",
  meridian_tower = "meridian_tower",
  eden_park = "eden_park",
  varah_swamy = "varah_swamy",
  sarjapur_plots = "sarjapur_plots",
}

interface CrmRecord {
  row_index: number;              // stable index from original CSV, always present
  created_at: string | null;      // must satisfy `new Date(created_at)` in JS
  name: string | null;
  email: string | null;           // first email only
  country_code: string | null;
  mobile_without_country_code: string | null; // first mobile only
  company: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  lead_owner: string | null;
  crm_status: CrmStatus | null;   // null if AI not confident — never invented
  crm_note: string | null;        // includes extra emails/mobiles, remarks
  data_source: DataSource | null; // null if no confident match — per spec
  possession_time: string | null;
  description: string | null;
}
```

### 2.2 Row Outcome Classification

Every input row resolves to exactly one of three outcomes — never silently dropped:

```ts
type RowOutcome =
  | { status: "imported"; record: CrmRecord }
  | { status: "skipped"; row_index: number; reason: "no_email_or_mobile" }
  | { status: "needs_review"; row_index: number; raw: Record<string,string>; reason: string };
```

`needs_review` exists for rows where the LLM output failed post-validation (bad enum, unparseable date, schema mismatch) — this is distinct from `skipped` (which is a deterministic, pre-AI rule per the assignment spec: no email AND no mobile). Evaluators should be able to see this distinction in the results UI.

---

## 3. API Endpoints

### 3.1 `POST /api/import/start`

Kicks off an import job. Called only after user clicks **Confirm** (Step 3).

**Request body:**
```json
{
  "rows": [ { "<original CSV column name>": "<value>", ... }, ... ]
}
```
- `rows` is the array of parsed CSV row objects (raw column names preserved — do not pre-map on the frontend, that's the backend's job).

**Response (202 Accepted):**
```json
{ "jobId": "uuid-v4-string" }
```

### 3.2 `GET /api/import/status/:jobId` (SSE stream)

Server-Sent Events stream of job progress.

**Event payloads:**
```json
{ "type": "progress", "batchesCompleted": 3, "batchesTotal": 10 }
{ "type": "complete", "result": { "imported": [...], "skipped": [...], "needsReview": [...], "totals": { "imported": 42, "skipped": 3, "needsReview": 1, "total": 46 } } }
{ "type": "error", "message": "string" }
```

### 3.3 `GET /api/health`

Standard health check for deployment platforms. Returns `{ "status": "ok" }`.

---

## 4. Error Shape (all endpoints)

```json
{
  "error": {
    "code": "VALIDATION_ERROR" | "LLM_PROVIDER_ERROR" | "INTERNAL_ERROR" | "JOB_NOT_FOUND",
    "message": "human-readable string",
    "details": { }
  }
}
```

---

## 5. Invariants (must always hold — used as test assertions)

1. `rows.length` (request) === `imported.length + skipped.length + needsReview.length` (response) — **always**, no exceptions.
2. Every `crm_status` value is either `null` or one of the 4 allowed enum values — never a hallucinated string.
3. Every `data_source` value is either `null` or one of the 5 allowed enum values.
4. Every `imported` record's `created_at` (if not null) is parseable by `new Date(...)` without producing `Invalid Date`.
5. `row_index` is unique and traceable back to the original input array position for every row in every outcome bucket.

---

## 6. Change Log

| Date | Change | Reason |
|---|---|---|
| 2026-07-10 | Initial contract locked | Phase 0 completion |
