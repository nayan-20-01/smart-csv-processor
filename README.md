# GrowEasy AI-Powered CSV Importer

An AI-assisted CSV import tool that takes messy, inconsistently-formatted lead data and maps it into a structured CRM schema — using Google Gemini for field extraction, with deterministic validation and reconciliation guarantees around it.

**Live app:** https://smart-csv-processor-web-jvtv.vercel.app/
**Backend API:** https://smart-csv-processor.onrender.com (health check: `/api/health`)

> ⚠️ The backend runs on Render's free tier, which spins down after ~15 minutes of inactivity. The first request after idle time may take 30–60 seconds to respond while the server cold-starts. See [Known Limitations](#known-limitations) below.

---

## What it does

1. **Upload** a CSV with arbitrary, inconsistent column names (e.g. "Reach Us At" instead of "Email").
2. **Preview** the parsed data client-side — nothing is sent to a server until you confirm.
3. **Confirm** to kick off processing: rows are batched and sent to Gemini, which maps each row into a fixed CRM schema.
4. **Results** stream in live via Server-Sent Events, sorted into three outcomes:
   - **Imported** — successfully mapped and validated.
   - **Skipped** — no email or phone number found (a deterministic rule, not an AI judgment call).
   - **Needs Review** — the AI's output failed schema validation (bad enum, unparseable date, etc.) and is flagged for a human to check, rather than silently dropped or force-coerced.

Every row from the original file is accounted for in exactly one of these three buckets — this is enforced and displayed as a live reconciliation check in the UI.

---

## Architecture

```
Frontend (Next.js, Vercel)          Backend (Express, Render)
  Upload → local CSV parse   HTTP/    routes → controllers → services → providers
  (Papaparse, zero backend   SSE  ──►   - jobService (orchestration)
   calls until Confirm)      ◄──       - batchService (token-budgeted batching)
  Preview (virtualized table)          - validationService (post-AI Zod re-check)
  Confirm → POST /api/import/start     - providers/GeminiProvider (Gemini calls)
  Results (SSE progress + 3-way        - providers/MockProvider (network-free testing)
   breakdown, CSV export)
                shared Zod schemas (packages/shared) — single source of truth
                                                  │
                                                  ▼
                                        Google Gemini (gemini-3.5-flash,
                                        structured output via responseSchema)
```

**Monorepo layout:** pnpm workspaces — `apps/web` (Next.js), `apps/api` (Express), `packages/shared` (Zod schemas + types used by both).

**Key design decisions:**
- **Stateless backend, no database.** Job state lives in an in-memory `Map` for the job's lifetime — deliberate scope decision for this assignment, not an oversight. In a production system this would move to Redis-backed job state.
- **Deterministic skip pass, AI-assisted column detection.** Whether a row gets skipped (no contact info) is always a pure rule — never an LLM judgment call. But *which columns count as "contact info"* is identified via one cheap LLM call per import job (catching headers like "Reach Us At" that no hint-list could), unioned with a naive fallback heuristic in case that call fails.
- **`needs_review` as a distinct outcome from `skipped`.** Conflating "the spec says skip this" with "the AI's output was invalid" would hide real failure modes — auditability over tidiness.
- **Token-budgeted batching, not fixed row-count batching.** A verbose `description` column shouldn't blow a batch's context budget just because the row count looked safe.
- **Provider-agnostic LLM interface.** All Gemini calls go through an `LlmProvider` interface; a `MockProvider` implementation allows the entire pipeline (batching, SSE, validation, UI) to be tested end-to-end with zero API cost and zero network latency.

Full reasoning and the complete ADR log live in `architecture.md`; the full API/data contract lives in `contract.md`.

---

## Tech stack

| Layer | Choice |
|---|---|
| Frontend | Next.js (App Router), TypeScript, Tailwind CSS, Zustand, TanStack Table + Virtual |
| Backend | Express, TypeScript, `@google/genai` (Gemini SDK), `p-limit` |
| Shared | Zod (schemas + runtime validation, single source of truth for both frontend and backend) |
| CSV parsing | Papaparse (Web Worker, streamed in exact 500-row batches) |
| LLM | Google Gemini (`gemini-3.5-flash`) — structured output via `responseSchema` |
| Testing | Vitest — unit tests on batching, validation, and utility logic |
| Deployment | Vercel (frontend) + Render (backend, persistent process for SSE + in-memory job state) |

---

## Getting started locally

**Prerequisites:** Node.js, pnpm.

```bash
git clone <https://github.com/nayan-20-01/smart-csv-processor>
cd groweasy-csv-importer
pnpm install
pnpm --filter shared build
```

**Backend:**

```bash
cd apps/api
cp .env.example .env
# Edit .env — set GEMINI_API_KEY, and LLM_PROVIDER=mock or LLM_PROVIDER=gemini
pnpm dev
```

Runs on `http://localhost:4000`. Set `LLM_PROVIDER=mock` to run the entire pipeline (batching, skip logic, SSE events, validation) with zero Gemini API calls — useful for fast local iteration.

**Frontend:**

```bash
cd apps/web
# Set NEXT_PUBLIC_API_BASE_URL=http://localhost:4000 in .env.local
pnpm dev
```

Runs on `http://localhost:3000`.

**Run tests:**

```bash
cd apps/api
pnpm test
```

---

## API reference

See `contract.md` for the full, canonical contract. Summary:

- `POST /api/import/start` — `{ rows: [...] }` → `202 { jobId }`
- `GET /api/import/status/:jobId` — Server-Sent Events stream: `progress`, `complete`, `error` events
- `GET /api/health` — `{ status: "ok" }`

**Invariant enforced end-to-end and shown live in the UI:** `rows.length` (request) always equals `imported.length + skipped.length + needsReview.length` (response) — no row is ever silently dropped.

---

## Known limitations

- **Render free-tier spin-down** can wipe in-memory job state mid-session if the server idles and restarts — surfaces as a "job not found" state in the UI rather than a silent failure, but is a real trade-off of the stateless architecture running on a free tier.
- **`dateNormalizer`** relies on JS's native `Date` parsing, which accepts bare numeric strings (e.g. `"123"`) as valid years — documented via a unit test rather than fixed, given assignment time constraints.
- **`EventSource`'s "job not found" detection** uses a proxy signal (no SSE message ever received before an error) rather than a precise HTTP-status-based check, since browsers can't distinguish a 404 from a generic connection failure on an `EventSource`.
- **Token-per-batch ceiling** (currently 4000, in `batchService.ts`) is a reasonable placeholder, not tuned against production Gemini pricing/limits.
- **Mobile responsiveness** — fixed after an initial pass surfaced overflow issues on narrow viewports (see change log in `project_status.md`); re-verify on a real device before considering fully polished.

---

## Project docs

- `architecture.md` — full system design, data flow, and ADR log
- `contract.md` — canonical API/data contract and invariants
- `project_status.md` — phase-by-phase build log (useful for resuming work in a fresh session)
