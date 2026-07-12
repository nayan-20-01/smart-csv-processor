# project_status.md — Living Progress Tracker


## Project
GrowEasy AI-Powered CSV Importer — Software Developer (Intern/Full-Time) assignment.
Deadline: 12 July 2026. Submit to: varun@groweasy.ai (hosted app URL + GitHub URL + position applying for).

## Current Phase
**Phase 5 — Polish & Bonus Features: COMPLETE**
Next up: **Phase 6 — Deployment (backend first, per ADR-003)**

## Locked Decisions (do not re-litigate without a new ADR)
- LLM Provider: **Google Gemini** (flash tier), behind a provider-agnostic interface
- Persistence: **Stateless**, no database, in-memory job state
- Deployment: **Vercel** (frontend) + **Railway/Render** (backend, persistent process for SSE + job state)
- Monorepo: pnpm workspaces — `apps/web`, `apps/api`, `packages/shared`
- Testing scope: focused unit tests on batching + validation logic only (`services/`, `utils/`)
- Full architecture reasoning: see `architecture.md`. Full API/data contract: see `contract.md`.

## Phase Log

### Phase 0 — Architecture & Documentation ✅ (2026-07-10)
- 7-vector analytical breakdown completed (hidden traps, stack, AI batching, separation of concerns, UI/UX, high-ROI features, roadmap)
- Tech stack finalized and justified
- `contract.md` drafted — API endpoints, shared CrmRecord schema, RowOutcome typing, error shape, invariants
- `architecture.md` drafted — system diagram, data flow, layering rationale, ADR-001 through ADR-008
- Key architectural decisions: stateless backend, Gemini as provider, deterministic pre-AI skip pass, `needs_review` as a third outcome bucket distinct from `skipped`, token-budgeted batching

### Phase 1 — Scaffolding ✅ (2026-07-10)
**Monorepo**
- pnpm workspace initialized (`apps/web`, `apps/api`, `packages/shared`), root `package.json` with `dev:web` / `dev:api` / `build:shared` / `test` scripts, `.gitignore` in place.

**`packages/shared`**
- Zod schemas written as a direct 1:1 mirror of `contract.md` §2: `CrmStatus`, `DataSource` enums; `CrmRecordSchema` (with `created_at` refined against `new Date()` parseability, matching invariant #4); `RowOutcomeSchema` as a discriminated union on `status` (`imported` / `skipped` / `needs_review`); request/response schemas for `POST /api/import/start`; SSE event schemas (`progress` / `complete` / `error`); `ApiErrorSchema` matching the error shape in `contract.md` §4.
- Builds cleanly via `tsc` → `dist/`.
- **Flagged for review:** `needs_review.raw` is currently typed `Record<string,string>` per contract.md exactly — may need to loosen to `Record<string, unknown>` once real CSV parsing (Papaparse) is wired up in Phase 2, if any columns get coerced to non-string types.

**`apps/api` (Express)**
- Folder structure per `architecture.md` §3 layering: `routes/`, `controllers/`, `services/`, `providers/`, `utils/`, `state/`.
- `routes/healthRoutes.ts` — `GET /api/health` → `{ status: "ok" }`.
- `routes/importRoutes.ts` + `controllers/importController.ts` — `POST /api/import/start` (validates body against `ImportStartRequestSchema`, creates job, returns `202` + `jobId`) and `GET /api/import/status/:jobId` (SSE stream, `text/event-stream`, subscribes to job's event emitter, closes on `complete`/`error`).
- `state/jobStore.ts` — in-memory `Map<jobId, ImportJob>` per ADR-002, `ImportJob` class with pub/sub listener set for SSE push.
- `services/jobService.ts` — `processImportJob` orchestration **stub**, currently emits an empty `complete` event immediately. Contains explicit `TODO Phase 3` markers for: row_index assignment, deterministic skip pass (ADR-005), token-budgeted batching (ADR-007), provider dispatch with `p-limit` concurrency, post-AI Zod validation → `imported`/`needs_review` split (ADR-006).
- `providers/LlmProvider.ts` — interface per ADR-004 (`extractRecords(rows) => Partial<CrmRecord>[]`).
- `providers/GeminiProvider.ts` — implements `LlmProvider`, constructor takes API key, `extractRecords` currently **throws `Not implemented — Phase 3`** (structured-output call not yet built).
- `.env.example` created (`GEMINI_API_KEY`, `PORT`).
- Smoke-tested: `pnpm --filter api dev` + `curl localhost:4000/api/health` → `{"status":"ok"}`.

**`apps/web` (Next.js)**
- Scaffolded via `create-next-app` (TypeScript, Tailwind, ESLint, App Router, `src/` dir).
- Added `zustand`, `@tanstack/react-table`, `@tanstack/react-virtual`, `papaparse` (+ types).
- `store/importStore.ts` — Zustand store holding `step` (`upload`/`preview`/`confirm`/`results`), `rawRows`, `jobId`.
- `components/StepRail.tsx` — visual 4-step indicator, bolds current + completed steps based on store state.
- `app/page.tsx` — renders `StepRail` + placeholder panel per step (`Upload step — Phase 2`, etc.).
- Smoke-tested: `pnpm --filter web dev` → localhost:3000 renders step rail with "Upload" active.

**Both deferred decisions resolved — implemented same day (2026-07-10):**

- **`services/validationService.ts`** — `validateExtractedRecord` (single record) and `validateBatch` (batch, keyed by `row_index` via a `rawByIndex` map) both implemented. Re-validates AI output against `CrmRecordSchema` per ADR-006; success → `imported`, failure → `needs_review` with a human-readable Zod-issue summary attached as `reason`. Handles missing/malformed `row_index` via a `-1` sentinel rather than throwing.
- **`utils/dateNormalizer.ts`** — `normalizeDate` (loose input → ISO string or `null`) and `isValidDateString` guard. Flagged `TODO Phase 3` for real-world CSV date-format edge cases (DD/MM vs MM/DD ambiguity, Excel serials).
- **`utils/enumGuard.ts`** — `guardCrmStatus` / `guardDataSource`, strict Zod-backed guards (invalid → `null`, never coerced/invented, per contract.md §2.1). Flagged `TODO Phase 3` decision: stay strict vs. add fuzzy correction.
- **`utils/csvStreamParser.ts`** — `assignRowIndices` (stable `row_index` assignment, architecture.md §2 step 3) and `shouldSkipRow` (ADR-005 deterministic skip check, naive key-hint matching on email/mobile-like column names for now). Flagged `TODO Phase 3`: replace with the real column-detection heuristic referenced in architecture.md §5.
- **`providers/MockProvider.ts`** — implements `LlmProvider`, zero network calls, simulated latency (300ms default), deliberately returns one invalid-enum record per multi-row batch to exercise the `needs_review` path end-to-end without needing real bad data.
- **`services/providerFactory.ts`** — new file, `getLlmProvider()` reads `LLM_PROVIDER` env var (`mock` vs default Gemini) so provider selection is a one-line env-driven swap, consistent with ADR-004's isolation goal. `.env.example` updated with `LLM_PROVIDER=mock`.

All new files compile cleanly via `pnpm --filter api build`.

**Still open for Phase 3 (see TODOs embedded in files above):**
- Real CSV date-format handling in `dateNormalizer`.
- Strict-vs-fuzzy enum correction policy in `enumGuard`.
- Real column-detection heuristic in `csvStreamParser.shouldSkipRow` (currently naive substring matching on column names — fine for demo data, not production-robust).
- Wire `providerFactory.getLlmProvider()` into `jobService.processImportJob` (currently `jobService` still emits an empty stub `complete` event and doesn't call any provider yet — that integration is Phase 3 work).

### Phase 2 — Frontend Steps 1–2 ✅ (2026-07-10)
**Architecture decisions (sanity-checked before writing code):**
- Core constraint identified: the browser must hold the *entire* parsed dataset in memory regardless of virtualization, since `POST /api/import/start` requires the full `rows` array in one JSON body (no streaming/chunked upload endpoint exists). TanStack Virtual solves rendering cost, not memory cost — these are separate problems.
- File-size guard: **10MB soft warning / 18MB hard cap**, the hard cap deliberately set with headroom under `apps/api`'s existing `express.json({ limit: "20mb" })`, so frontend and backend ceilings are consistent by design.
- Malformed-row policy: rows with parse issues (field-count mismatch, quoting errors, etc.) are **never dropped** — every row Papaparse can produce is kept and forwarded, since silently dropping a row client-side would violate contract.md invariant #1 (`rows.length` must be traceable through `imported + skipped + needsReview`) before the row even reaches the backend's classification logic.
- Confirm-gate policy: if any parse warnings exist, the user must **explicitly check an acknowledgment box** before proceeding to Confirm — warn-and-block-until-acknowledged, not silent pass-through and not a hard block requiring the file to be fixed.
- Chunking approach: Papaparse's built-in `chunk` callback is **byte-size-driven, not row-count-driven** — identified as a poor fit for predictable progress reporting. Switched to `step` (row-by-row) with manual buffering into exact **500-row batches** before flushing to store, giving deterministic progress granularity regardless of row width.

**Files built:**
- `lib/fileGuard.ts` — `guardFileSize()`, returns `ok` / `warn` / `reject` with human-readable messages; constants `SOFT_WARN_BYTES` (10MB) / `HARD_CAP_BYTES` (18MB).
- `lib/csvParser.ts` — `parseCsvFile()`: Papaparse with `worker: true` (off main thread), `header: true`, `dynamicTyping: false` (preserve strings, avoid corrupting e.g. leading-zero phone numbers), `skipEmptyLines: 'greedy'`, `step`-based parsing manually batched into 500-row chunks via `flushBatch()`. Returns `{ rows, warnings }`; warnings carry `row_index` + human-readable message, keyed to original file position.
- `store/importStore.ts` — extended with parse-time state: `isParsing`, `rowsParsedSoFar`, `parseWarnings`, `warningsAcknowledged`, plus `appendRows`/`acknowledgeWarnings`/`resetForNewFile`. **Known trade-off flagged:** `appendRows` spreads the full array on every batch (`[...state.rawRows, ...chunk]`), which is O(n) per batch / O(n²) overall — acceptable given the 18MB hard cap, but would need to move to a mutable-ref-then-single-commit pattern if the cap is ever raised significantly.
- `components/steps/Dropzone.tsx` — drag/drop + file-input UI. Runs `.csv` extension check → `guardFileSize` → `parseCsvFile`, surfaces soft-warning/reject messages, shows live "N rows parsed" progress, transitions to `preview` step on success.
- `components/steps/PreviewTable.tsx` — TanStack Table with columns inferred from parsed headers (raw CSV column names, untouched, per contract.md — no frontend pre-mapping); TanStack Virtual windowing so DOM only renders visible rows + overscan regardless of dataset size; warning rows highlighted with a tooltip icon; acknowledgment checkbox gates the "Continue to Confirm" button when `parseWarnings.length > 0`.
- `app/page.tsx` updated to render `Dropzone` (upload step) and `PreviewTable` (preview step).

**Known follow-ups flagged during build (not blocking, noted for later phases):**
- `appendRows` O(n²) spread pattern — revisit only if the 18MB cap is raised (see above).
- Warning-row lookup in `PreviewTable` is keyed by array index (`virtualRow.index`), which assumes row order is never resorted/filtered client-side. If Phase 5 adds column sorting to this table, the warning-to-row mapping will silently break — needs a stable-ID-based lookup instead of positional index if sorting is added.
- Native `title` attribute used for warning tooltips — functional but not ideal for accessibility/mobile; candidate for a proper popover in Phase 5 polish.
- Acknowledgment checkbox is currently one-way (`acknowledgeWarnings` only sets `true`; reset only via `resetForNewFile` on a new upload) — fine for now, flagged in case a "let me un-acknowledge" UX is wanted later.
- If the file-size cap is ever raised well beyond 18MB, the real fix is a backend streaming/multipart ingestion path (Phase 3+ backend decision), not further frontend cleverness — noted so this isn't miscategorized as a frontend problem later.

**Not yet built (Phase 4 scope, correctly deferred):** Confirm step UI, POST to `/api/import/start`, SSE consumption, Results step.

### Phase 3 — Backend Core ✅ (2026-07-11)
Row indexing, deterministic pre-AI skip pass (ADR-005), token-budgeted batching (ADR-007), Gemini integration + `responseSchema` structured output, retry/backoff via `p-limit`, post-AI Zod validation (ADR-006), unit test coverage per ADR-008.

**Step 1 ✅ — `jobService` wired against `MockProvider`, SSE pipeline validated end-to-end**
- `jobService.processImportJob` runs the full pipeline: `assignRowIndices` → skip pass → `createTokenBudgetedBatches` (new `services/batchService.ts`, chars/4 token estimate, default 4000-token ceiling — placeholder, see Open Questions) → `p-limit`-bounded dispatch (concurrency 4) with exponential backoff retry (`callProviderWithRetry`, 3 retries, 500ms base) → `validateBatch` → `progress` SSE event per completed batch → `complete` SSE event with full reconciled result.
- `LlmProvider` interface corrected: takes `IndexedRow[]` (structured `{ row_index, raw }`) instead of smuggling `__row_index` into raw row data.
- Live-tested via curl/SSE against `LLM_PROVIDER=mock` — all three outcome buckets confirmed populating correctly.

**Step 2 ✅ — Real `GeminiProvider.extractRecords()` implemented and tested live**
- SDK corrected before implementation: `@google/generative-ai` (Phase 1) → `@google/genai` (current unified SDK), verified via web search before writing code.
- New files: `providers/geminiSchema.ts` (hand-maintained `responseSchema` mirroring `CrmRecordSchema`), `providers/geminiPrompt.ts` (`buildExtractionPrompt`, row_index passed as structured metadata, never smuggled into row content).
- Live-tested against real Gemini with a deliberately messy payload — correctly extracted secondary phone into `crm_note`, identified `data_source`, set `crm_status`.
- **Flagged, still outstanding:** `GeminiProvider.ts`'s `MODEL_NAME` constant and `contract.md` §1 both still say `gemini-2.0-flash`/`gemini-1.5-flash`; real testing used `gemini-3.5-flash`. Needs a manual sync on the person's end (see Open Questions).

**Step 3 ✅ (2026-07-11) — LLM-assisted column detection replaces naive-only skip-pass heuristic**
- Design decision: one cheap LLM call **per import job** (not per row/batch) to identify email/mobile columns from headers alone (never row data) — keeps the actual skip *decision* fully deterministic per ADR-005, while letting detection catch semantically-named columns (e.g. "Reach Us At") the naive hint-matcher never could.
- `LlmProvider` interface extended with `detectContactColumns(headers)`; implemented in both `GeminiProvider` (new `geminiColumnDetection.ts` — cheap prompt sending only headers, defensive filtering of hallucinated column names against the actual header set) and `MockProvider` (delegates to `detectColumnsNaive`, network-free).
- New `services/columnDetectionService.ts` — **unions** the LLM result with the naive heuristic's result (deliberate asymmetry: under-detecting a contact column silently loses a real lead via wrongful `skipped`, over-detecting just checks one harmless extra column). Falls back to naive-only if the LLM call fails, with a `console.warn` — no retry wrapper, since the fallback is fast and safe enough that retrying isn't worth the latency.
- `csvStreamParser.ts` refactored: `shouldSkipRow` no longer does its own column-name matching — it now takes pre-identified `emailColumns`/`mobileColumns` and applies a pure boolean rule. Naive matching moved into standalone `detectColumnsNaive`, used both as the LLM's fallback and as one half of the union.
- Live-tested with a CSV containing a "Reach Us At" column — confirmed Gemini correctly identified it on the first pass, and the deterministic skip logic then applied correctly against that mapping.

**Step 4 ✅ (2026-07-11) — Unit test suite (ADR-008 scope)**
All tests written one file at a time, reviewed and run green before moving to the next:
- `utils/dateNormalizer.test.ts` — 11 tests. Includes a documented **known limitation**: `normalizeDate` accepts bare numeric strings like `"123"` as valid years (JS `Date` parsing quirk) — not fixed, flagged as a real edge case for the existing `TODO Phase 3` in `dateNormalizer.ts` to address later.
- `utils/enumGuard.ts` tests — written and passing, confirming strict-only guard behavior (invalid → null, never coerced).
- `utils/csvStreamParser.test.ts` — 17 tests covering `assignRowIndices`, `detectColumnsNaive`, and `shouldSkipRow`, including a documented **known limitation** test on `detectColumnsNaive` (can't catch non-hint-matching headers like "Reach Us At" — this is exactly the gap Step 3's LLM path exists to cover) and a regression guard confirming `shouldSkipRow` only consults columns it's explicitly told about (no longer does its own name matching).
- `services/batchService.test.ts` — 14 tests: token estimation math, batch-boundary packing, the "single oversized row gets its own batch" edge case, and a reconciliation-invariant test confirming no row is ever dropped or duplicated across batches regardless of split points.
- `services/validationService.test.ts` — 15 tests: valid records, each invalid-field case (`crm_status`, `data_source`, `created_at`) routing correctly to `needs_review` with a matching `reason`, missing/non-numeric `row_index` handling via the `-1` sentinel, and — flagged as a notable inclusion — an explicit regression guard for `row_index: 0` being correctly treated as a valid index rather than a falsy "missing" value.
- All test files run via `pnpm test` (vitest), fully mock/fixture-based — zero real Gemini calls, consistent with ADR-008's "fast and network-free" scope.

**Phase 3 fully closed.** All planned scope (pipeline wiring, real Gemini integration, LLM-assisted column detection, unit tests) complete and verified.

### Phase 4 — Frontend Steps 3–4 + Async Wiring ✅ (2026-07-11)
Confirm flow, SSE progress consumption with reconnect-on-refresh, results table with imported/skipped/needs_review breakdown, CSV export for needs_review.

**Pre-build design decisions (resolved before coding):**
- CSV export: **yes**, needs_review rows only (not imported/skipped) — button added to the Results UI.
- SSE reconnect-on-refresh: **yes, built** — jobId persisted in the URL (`?jobId=`) as the source of truth (not localStorage), page-load hydration reads it back into the store, `useImportStream` reopens the `EventSource` against the same job.

**What was built:**
- `store/importStore.ts` extended with job/SSE state: `jobStatus` (`idle`/`connecting`/`streaming`/`complete`/`error`/`not_found`), `batchesCompleted`/`batchesTotal`, `result`, `jobErrorMessage`, plus `setProgress`/`setResult`/`setJobError`/`resetJob`.
- `lib/useImportStream.ts` — owns the `EventSource` lifecycle for a given `jobId`. Validates every incoming SSE payload against `SseEventSchema.safeParse` rather than trusting the wire format. Implements reconnect-with-backoff (up to 3 attempts) for mid-stream drops, and distinguishes "job not found" (no message ever received before `onerror`) from "connection dropped mid-stream" (at least one message received, then error) — flagged as a **known imprecision**: `EventSource.onerror` can't natively distinguish a 404 from a generic network failure, so "never received a message" is used as a proxy. A more precise fix (backend existence-check endpoint or response header) was identified but deliberately not built to avoid unilaterally expanding `contract.md` scope — flagged as a Phase 5+ candidate if needed.
- `components/steps/ConfirmStep.tsx` — POSTs `rawRows` to `/api/import/start`, validates the response against `ImportStartResponseSchema`, stores `jobId`, and pushes it into the URL via `router.replace` for refresh-recovery.
- `app/page.tsx` — reads `?jobId=` on mount and hydrates the store if present (refresh-recovery entry point), mounts `useImportStream` unconditionally at the page level so it's active before the person necessarily navigates to Results visually.
- `lib/csvExport.ts` — `buildNeedsReviewCsv` (computes the union of all `raw` column keys across every needs_review row first, so rows with different original headers don't get misaligned columns) + `downloadCsv` (Blob + object URL, no external dependency needed).
- `components/results/ResultsTable.tsx` — generic virtualized table component, generalized from Phase 2's `PreviewTable` pattern and reused across all three outcome buckets rather than duplicated three times.
- `components/steps/ResultsStep.tsx` — live progress bar while streaming; on complete, a **visible reconciliation banner** that recomputes `imported + skipped + needsReview === total` client-side (directly surfacing contract.md invariant #1 to the end user, not just enforced server-side); tabbed three-way breakdown (Imported/Skipped/Needs Review) each using `ResultsTable`; CSV export button scoped to the Needs Review tab; explicit UI states for `not_found` and `error` job statuses, each with a "Start a new import" recovery action.

**Live end-to-end test confirmed:** dropped a real CSV, watched the progress bar update in real time via SSE, three-way Results table rendered correctly, reconciliation banner showed green, needs_review CSV export downloaded correctly.

**Deviation from plan, resolved by the person locally:** a `tsconfig.json` path-alias issue (`@/*` resolution) needed a local fix — not something built or diagnosed in this session, noted here only so the repo history has a record of it.

**Known follow-ups flagged during build (not blocking, candidates for Phase 5):**
- `EventSource` can't natively distinguish "job not found" from "generic network failure" — current proxy (no message ever received) works but isn't precise. A backend existence-check would need a `contract.md`-touching change.
- `needs_review`'s "Original Row Data" column renders raw JSON as a flat string — functional, not pretty. Candidate for a proper expandable sub-view.
- CSV export only covers `needs_review` (as scoped) — `imported`/`skipped` export wasn't built, easy to add symmetrically later if wanted.
- Active tab in Results resets to "Imported" on every fresh mount — doesn't persist across a refresh mid-review.

### Phase 5 — Polish & Bonus Features ✅ (2026-07-12)
Scope tackled: dark mode (site-wide), empty states, table styling polish. Deliberately deprioritized against the deadline: symmetric CSV export, results tab persistence, `needs_review` expandable raw-data view, `dateNormalizer` numeric-string edge case, `EventSource` not-found precision — all still valid ideas, just not done, see Open Questions.

**What was built:**
- **Dark mode** — class-based (`darkMode: "class"` in `tailwind.config.ts`), inline `<head>` script in `app/layout.tsx` reading `localStorage`/`prefers-color-scheme` before paint (no flash-of-wrong-theme), `ThemeToggle.tsx` component (sun/moon icon toggle, persists choice to `localStorage`). Applied consistently across every screen: `Dropzone`, `PreviewTable`, `ConfirmStep`, `ResultsStep`, `ResultsTable`, `StepRail`, `page.tsx`/`layout.tsx` shell.
- **Empty states** — new shared `components/EmptyState.tsx` (icon + title + description), wired into `ResultsTable`'s empty-data branch so each of the three outcome buckets gets a proper icon-based empty state instead of plain text.
- **Table styling polish** — zebra striping, row hover states, rounded-xl containers with subtle shadow, refined header typography (uppercase/tracked/muted), consistent border colors — applied to both `PreviewTable` and the shared `ResultsTable`.
- **`StepRail.tsx`** rebuilt — numbered circles with checkmarks for completed steps, connecting line between steps that fills in as progress is made, full dark-mode support.
- **`ResultsStep.tsx`** rebuilt — icon-based success/error states (`CheckCircle2`/`XCircle` from lucide-react) for the reconciliation banner and not-found/error states, spinner during streaming, icon-labeled export/start-over buttons.

**Real-world stress test (2026-07-12):** local test against a 26,000+ row CSV — UI stayed smooth throughout thanks to TanStack Virtual (Phase 2/4 windowing held up as designed at real scale, not just small demo files), deterministic skip-pass validation correctly skipped contact-less rows at this volume. No performance or correctness issues surfaced — the `overscan: 12`/virtualization-tuning candidate item is now considered validated rather than a real risk, given this was tested at meaningfully large scale, not just theorized about.

Committed and pushed to GitHub.

### Phase 6 — Deployment & Docs ⏳ IN PROGRESS
Deploy (Vercel + Railway/Render per ADR-003), final README, submission checklist.

**Plan (per architecture.md ADR-003 — backend needs a persistent process for SSE + in-memory job state, cannot be Vercel serverless):**
1. **Backend first** (Railway or Render): root dir `apps/api`, build `pnpm install && pnpm --filter shared build && pnpm --filter api build` (run from repo root), start `node dist/index.js`. Env vars: `GEMINI_API_KEY`, `LLM_PROVIDER=gemini`, platform-provided `PORT`. Verify via `GET /api/health`.
2. **Frontend** (Vercel): root dir `apps/web`, install/build commands adjusted for the pnpm workspace + `packages/shared` dependency. Env var: `NEXT_PUBLIC_API_BASE_URL` pointing at the deployed backend URL.
3. **CORS hardening** — tighten `apps/api`'s currently-open `cors()` to the real deployed frontend origin via a new `FRONTEND_URL` env var, once the Vercel URL is known.
4. **End-to-end smoke test against real deployed URLs** — SSE across two different hosting providers is the one part of ADR-003's architecture that's genuinely different from local dev; worth verifying for real before submission, not assumed to just work.
5. Final README + submission checklist (per `project_status.md`'s own top-level submission note: hosted app URL + GitHub URL + position applying for, to varun@groweasy.ai).

**Post-deployment mobile responsiveness fix (2026-07-12):** live testing at a narrow viewport (~341px) surfaced a real bug — the Results step's tab strip (Imported/Skipped/Needs Review) had no wrap/scroll fallback and overflowed past the card and page edge, dragging the whole page into horizontal scroll; `StepRail` labels were similarly cramped at that width. Root-caused from a screenshot (no live browser access in this session) and fixed via: `overflow-x-hidden` safety net on `html`/`body`, responsive padding (`p-4 sm:p-6 md:p-8`) throughout, `StepRail` rebuilt to hide non-active step labels below the `sm` breakpoint, and the Results tab strip made horizontally scrollable (`overflow-x-auto` + `min-w-max`) instead of silently overflowing. Footer button rows (`ConfirmStep`, `PreviewTable`, `ResultsStep`) given `flex-wrap` so they don't force cramped single-row layouts on mobile. **Not yet re-verified against the live deployment** — needs a redeploy + re-check at the same narrow width before considered closed.



**Render deployment decisions:**
- Root directory: repo root (not `apps/api`) — build/start commands run from monorepo root so `packages/shared` resolves correctly within a pnpm workspace.
- Build: `pnpm install && pnpm --filter shared build && pnpm --filter api build`. Start: `pnpm --filter api start`.
- **Free tier accepted, risk acknowledged explicitly:** Render's free-tier spin-down (~15 min idle) directly conflicts with ADR-002's in-memory job state — a spin-down mid-review would wipe `jobStore`'s `Map` and surface as the `not_found` state built in Phase 4, not a bug. Decision made consciously given the time crunch; worth calling out as a known limitation in the final README (mirrors ADR-002's own documented trade-off, just now live instead of theoretical).
- **Also flagged, not yet verified:** Render's proxy may cut long-lived SSE connections on very large imports if the platform doesn't see enough traffic — the 26k-row stress test was local only. Live deployment should be smoke-tested against a large CSV, not just a small one, before considering Phase 6 done.


## Open Questions / Revisit Later
- Exact token-per-batch ceiling — currently a 4000-token placeholder in `batchService.ts`, deliberately left untuned for now.
- **`contract.md` §1 Tech Context is stale** — lists `gemini-2.0-flash`/`gemini-1.5-flash`, but real testing used `gemini-3.5-flash`. Still needs an explicit manual update.
- `GeminiProvider.ts`'s `MODEL_NAME` constant still hardcodes `gemini-2.0-flash` — still needs updating to `gemini-3.5-flash`.
- `dateNormalizer.normalizeDate` known limitation: bare numeric strings (e.g. `"123"`) are accepted as valid years due to JS `Date` parsing looseness — documented via test, not fixed. Candidate for the file's existing `TODO Phase 3` (real-world date format handling) — arguably now a Phase 5 polish item since Phase 3 is closed.
- `needs_review.raw` type tightness (`Record<string,string>` vs `Record<string,unknown>`) — revisit if real CSV data surfaces non-string values.
- `PreviewTable`'s warning-to-row lookup is positional (`virtualRow.index`) — will break if column sorting is ever added (Phase 5).
- `appendRows` O(n²) array-spread pattern in `importStore` — fine under the 18MB cap, revisit only if the cap is raised.
- Whether to raise the 18MB frontend cap ever requires a backend streaming/multipart ingestion redesign, not a frontend fix.
- **Resolved (Phase 4 planning):** `needs_review` export → built. SSE reconnect-on-refresh → built.

## How to Resume in a Fresh Session
1. Paste this file.
2. Paste `contract.md` and `architecture.md`.
3. Say: "Resuming GrowEasy CSV Importer project — see attached status/contract/architecture docs. We're starting/continuing Phase [X]."

## Change Log
| Date | Change |
|---|---|
| 2026-07-10 | Phase 0 complete — architecture and contract locked |
| 2026-07-10 | Phase 1 complete — monorepo, shared Zod schemas, Express skeleton (routes/controllers/services/providers/state), Next.js skeleton (step rail, Zustand store, placeholder panels) all scaffolded and smoke-tested |
| 2026-07-10 | Phase 1 finalized — added `validationService.ts`, `utils/` (dateNormalizer, enumGuard, csvStreamParser), `MockProvider.ts`, and `providerFactory.ts`. Ready to commit and move into Phase 2. |
| 2026-07-10 | Phase 2 complete — Upload (`Dropzone.tsx`) and Preview (`PreviewTable.tsx`) built with file-size guard (10MB warn/18MB cap), worker-based streaming CSV parsing in exact 500-row batches, malformed-row preservation with warning flags, TanStack Virtual windowing, and acknowledgment-gated Confirm transition. Phase 3 plan drafted, ready to start. |
| 2026-07-11 | Phase 3 Step 1 complete — `jobService` wired end-to-end against `MockProvider` (skip pass → token-budgeted batching → concurrent dispatch with retry/backoff → validation → SSE progress/complete events). Live-tested via curl/SSE. |
| 2026-07-11 | Phase 3 Step 2 complete — swapped `@google/generative-ai` → `@google/genai`, built `geminiSchema.ts`/`geminiPrompt.ts`, wired real `GeminiProvider.extractRecords()`. Live-tested against real Gemini API with a messy payload. Flagged model-name sync needed in code + `contract.md`. |
| 2026-07-11 | Phase 3 Step 3 complete — LLM-assisted column detection (`detectContactColumns`) added to `LlmProvider` interface, implemented in both providers, unioned with naive heuristic via new `columnDetectionService.ts`. `shouldSkipRow` refactored to a pure rule over pre-identified columns. Live-tested against a "Reach Us At" column, correctly detected. |
| 2026-07-11 | Phase 3 Step 4 complete — full unit test suite per ADR-008 scope: `dateNormalizer` (11 tests), `enumGuard` (passing), `csvStreamParser` (17 tests), `batchService` (14 tests), `validationService` (15 tests). All mock/fixture-based, zero live Gemini calls. Two known limitations documented via tests rather than silently fixed or ignored. |
| 2026-07-11 | **Phase 3 officially complete.** Phase 4 plan drafted, two open design questions flagged before starting build. |
| 2026-07-11 | Phase 4 pre-build decisions locked: CSV export for needs_review (yes), SSE reconnect-on-refresh (yes, build it). |
| 2026-07-11 | Phase 4 complete — `importStore` extended with job/SSE state, `useImportStream` hook (SSE consumption + reconnect-with-backoff + not-found detection), `ConfirmStep`, URL-based job-id hydration for refresh recovery, `csvExport.ts`, generic `ResultsTable`, `ResultsStep` with live progress bar, reconciliation banner, tabbed three-way breakdown, and needs_review CSV export. Live end-to-end test confirmed working (real-time progress bar, correct 3-way breakdown, green reconciliation banner, working CSV export). Minor local `tsconfig.json` path-alias fix noted (fixed locally, not diagnosed in-session). |
| 2026-07-11 | **Phase 4 officially complete.** Phase 5 candidate list drafted from items flagged across Phases 2–4; nothing prioritized yet. Deadline flagged (project doc lists 12 July 2026 as the deadline; person chose to prioritize Phase 5 polish first with deployment planned for later same day). |
| 2026-07-12 | Phase 5 complete — site-wide dark mode (class-based, no-flash init script, `ThemeToggle`), shared `EmptyState` component wired into `ResultsTable`, table styling polish (zebra striping, hover states, rounded containers) across `PreviewTable`/`ResultsTable`, `StepRail` rebuilt (numbered/checkmark steps with progress line), `ResultsStep` rebuilt (icon-based states throughout). Deliberately deferred: symmetric export, tab persistence, needs_review raw-data view, dateNormalizer edge case, EventSource not-found precision. |
| 2026-07-12 | **Real-world stress test:** 26,000+ row CSV tested locally — UI stayed smooth (TanStack Virtual held up at real scale), skip-pass validation correct at volume. Virtualization-tuning open item now considered validated. Committed and pushed to GitHub. **Phase 5 officially complete.** |
| 2026-07-12 | Phase 6 started — deployment plan confirmed (backend on Railway/Render first per ADR-003, then Vercel frontend, then CORS hardening, then live end-to-end smoke test, then README/submission checklist). Backend deployment in progress. |
| 2026-07-11 | **Phase 4 officially complete.** Phase 5 candidate list drafted from items flagged across Phases 2–4; nothing prioritized yet. |
