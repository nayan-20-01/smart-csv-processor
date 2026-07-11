# Project Status: GrowEasy CSV Importer

## Phase 1: Scaffolding & Architecture
**Status: COMPLETE**
- [x] Monorepo setup (Turborepo, pnpm)
- [x] Shared Zod schemas (`packages/shared`) locked to contract
- [x] Express backend skeleton with routing, controllers, and validation layer
- [x] `MockProvider` and `providerFactory` implemented for local SSE testing
- [x] Next.js frontend skeleton with Zustand step-rail state management

## Phase 2: Frontend Upload & Preview (Local)
**Status: IN PROGRESS**
- [ ] Dropzone component with file-type/size guard
- [ ] Papaparse integration for zero-backend local CSV parsing
- [ ] Virtualized data grid preview (TanStack Table + Virtual)
- [ ] Wire StepRail to transition upload -> preview on successful parse

## Phase 3: AI Extraction & Batch Processing
**Status: PENDING**
- [ ] Implement `GeminiProvider`
- [ ] Batch processing logic in `jobService`
- [ ] SSE streaming to frontend results UI
- [ ] Final UI polish and error states

## Open Questions & Backlog (For Phase 3)
* How to handle ambiguous real-world CSV date formats (DD/MM/YYYY vs MM/DD/YYYY).
* Decide if we should attempt fuzzy correction for AI-hallucinated enums.
* Implement the pre-AI deterministic skip-pass column detection heuristic for emails/phones.
