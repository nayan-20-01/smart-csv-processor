# architecture.md — System Architecture & Decision Log

**Project:** GrowEasy AI-Powered CSV Importer
**Status:** Phase 0 complete — architecture locked, scaffolding next

---

## 1. High-Level System Diagram

```
┌─────────────────────────────┐         ┌──────────────────────────────────┐
│   Frontend (Next.js)        │         │   Backend (Express)               │
│   deployed on Vercel        │         │   deployed on Railway/Render      │
│                              │         │                                    │
│  Step 1: Upload (dropzone)  │         │  routes/         (HTTP layer)     │
│  Step 2: Local parse+preview│  HTTP/  │  controllers/    (req/res shape)  │
│    (Papaparse, client-side, │  SSE    │  services/        │               │
│     zero backend calls)     │ ──────► │    - csvService   │  business     │
│  Step 3: Confirm             │         │    - batchService │  logic       │
│  Step 4: Results (job poll) │ ◄────── │    - jobService    │              │
│                              │         │  providers/                       │
│  State: Zustand              │         │    - GeminiProvider (implements   │
│  Table: TanStack Table +     │         │      LlmProvider interface)       │
│    TanStack Virtual          │         │  utils/                           │
└─────────────────────────────┘         │    - dateNormalizer               │
                                          │    - enumGuard                   │
              shared types/schemas        │    - csvStreamParser             │
              (packages/shared)  ◄────────┴───────────────────────────────────┘
                                                     │
                                                     ▼
                                          ┌─────────────────────┐
                                          │  Google Gemini API   │
                                          │  (structured output, │
                                          │   responseSchema)    │
                                          └─────────────────────┘
```

---

## 2. Data Flow (per import job)

1. **Client-side (no backend involvement):** CSV uploaded → Papaparse parses in-browser → preview table renders → user reviews raw data.
2. **Confirm click:** raw row objects (original column names, untouched) POSTed to `/api/import/start`. Backend immediately returns a `jobId` and processes asynchronously.
3. **Row indexing:** backend assigns a stable `row_index` to every row before anything else happens — this index survives the entire pipeline and is the basis for the reconciliation invariant in `contract.md` §5.
4. **Pre-AI deterministic skip pass:** rows with neither email nor mobile (checked across likely column name variants via light heuristics, not AI) are marked `skipped` immediately — this is a rule, not a judgment call, so it should not cost an LLM call.
5. **Batching:** remaining rows are chunked by **estimated token budget**, not fixed row count, using a rough chars/4 ≈ tokens heuristic per row, packed to stay under a safe context ceiling per batch.
6. **Dispatch:** batches sent to Gemini with `responseSchema` enforcing the `CrmRecord` shape + enum constraints, via a concurrency-limited queue (`p-limit`, max 3–5 concurrent) with exponential backoff + retry on failure.
7. **Post-AI validation:** every returned record is re-validated against the Zod schema (never trust structured-output mode alone). Pass → `imported`. Fail (bad enum, bad date, missing row_index) → `needs_review`.
8. **Progress:** after each batch completes, an SSE `progress` event is pushed to the client.
9. **Completion:** once all batches resolve, a `complete` event is pushed with the full reconciled result set, satisfying the count invariant in `contract.md`.

---

## 3. Layering Rationale

| Layer | Responsibility | Why isolated |
|---|---|---|
| `routes/` | HTTP wiring only | Swappable transport (could become tRPC/GraphQL later without touching logic) |
| `controllers/` | Request parsing, response shaping | Keeps HTTP concerns out of business logic |
| `services/` | Batching, orchestration, validation | The actual "business rules" of this app — most heavily tested layer |
| `providers/` | LLM-specific API calls | Isolates the one component most likely to change (swap Gemini → Claude/OpenAI) or fail (rate limits, outages) — behind a single `LlmProvider` interface |
| `utils/` | Pure functions (date parsing, enum checks, CSV streaming) | No side effects, trivially unit-testable |

**Why a provider interface specifically:** retry/backoff/validation logic lives in `services/`, not inside Gemini-specific code. If we ever swap providers, only `providers/GeminiProvider.ts` changes — everything else is unaffected. This is Dependency Inversion applied pragmatically, not academically.

---

## 4. Architecture Decision Records (ADR Log)

### ADR-001: Gemini as LLM provider
- **Decision:** Use Google Gemini (`flash` tier) via official SDK.
- **Reasoning:** Field-extraction/mapping is a structured-transformation task, not a deep-reasoning task — a fast/cheap model tier is the right trade-off and is defensible as a deliberate engineering choice, not a cost shortcut.
- **Trade-off accepted:** Slightly less reasoning depth than a frontier-tier model on genuinely ambiguous columns; mitigated by the `needs_review` bucket rather than forcing a guess.

### ADR-002: Stateless backend, no database
- **Decision:** No persistence layer. Job state lives in an in-memory `Map` on the API process for the job's lifetime.
- **Reasoning:** Matches assignment's explicit "database optional" framing; simpler to reason about and defend; avoids scope creep into schema design that isn't the point of this evaluation.
- **Trade-off accepted:** Job state is lost on server restart, and this pattern doesn't scale horizontally across multiple server instances. In a real production system, this would move to Redis-backed job state. Documented here explicitly so it reads as a deliberate scope decision, not an oversight.

### ADR-003: Deployment split — Vercel (frontend) + Railway/Render (backend)
- **Decision:** Frontend on Vercel; backend on a persistent-process host (Railway/Render), not Vercel serverless functions.
- **Reasoning:** SSE + in-memory job state (ADR-002) require a long-lived process. Vercel serverless functions are stateless and execution-time-boxed, incompatible with this pattern.

### ADR-004: Provider-agnostic LLM interface
- **Decision:** All LLM calls go through an `LlmProvider` interface; Gemini is one implementation.
- **Reasoning:** Isolates the highest-risk, most-likely-to-change dependency; makes retry/validation logic provider-independent and unit-testable without hitting a real API.

### ADR-005: Deterministic pre-AI skip pass
- **Decision:** Rows with no email and no mobile are filtered out *before* batching, via code, not by asking the LLM to decide.
- **Reasoning:** This is an unambiguous rule from the spec — using an LLM call for it would be wasteful (cost, latency) and introduces unnecessary hallucination risk for a decision that requires zero judgment.

### ADR-006: `needs_review` as a third outcome bucket
- **Decision:** LLM outputs that fail post-validation are not silently dropped or force-coerced — they're bucketed separately from `skipped`.
- **Reasoning:** Conflating "spec says skip" with "AI output was invalid" would hide real failure modes and break the reconciliation invariant's honesty. Auditability > tidiness.

### ADR-007: Token-budgeted batching, not fixed row-count batching
- **Decision:** Batch size determined by estimated token budget per batch, not a fixed row count.
- **Reasoning:** Rows vary wildly in field length (a `description` column can be one word or three sentences); fixed row-count batching risks exceeding context limits on verbose CSVs and under-utilizing budget on sparse ones.

### ADR-008: Testing scope — batching & validation logic only
- **Decision:** Unit tests focus on `services/batchService`, `services/validationService`, and `utils/` (date normalization, enum guards) — not full component/integration coverage.
- **Reasoning:** Highest-risk, highest-complexity logic for the assignment's time window; this is also the code most worth defending line-by-line in an interview.

---

## 5. Open Items (revisit as needed)

- Exact token-per-batch ceiling — to be tuned once we see real Gemini context/pricing behavior during Phase 3.
- Whether row-matching heuristics for the pre-AI skip pass (recognizing "email"-like columns across arbitrary naming) need their own small utility, or can piggyback on the AI mapping pass for column *detection* while keeping the skip *decision* deterministic. Decide during Phase 3.

---

## 6. Change Log

| Date | Change |
|---|---|
| 2026-07-10 | Initial architecture locked, ADR-001 through ADR-008 recorded |
