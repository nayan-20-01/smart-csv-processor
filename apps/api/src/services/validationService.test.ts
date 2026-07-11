// apps/api/src/services/validationService.test.ts
import { describe, it, expect } from "vitest";
import { CrmRecord } from "@groweasy/shared";
import { validateExtractedRecord, validateBatch } from "./validationService";

function validRecord(overrides: Partial<CrmRecord> = {}): CrmRecord {
  return {
    row_index: 0,
    created_at: "2026-07-11T00:00:00.000Z",
    name: "Asha Rao",
    email: "asha@example.com",
    country_code: "+91",
    mobile_without_country_code: "9876543210",
    company: null,
    city: "Bangalore",
    state: "Karnataka",
    country: "India",
    lead_owner: null,
    crm_status: "GOOD_LEAD_FOLLOW_UP",
    crm_note: null,
    data_source: "leads_on_demand",
    possession_time: null,
    description: null,
    ...overrides,
  };
}

describe("validateExtractedRecord", () => {
  it("returns an 'imported' outcome for a fully valid record", () => {
    const candidate = validRecord();
    const outcome = validateExtractedRecord(candidate, { Name: "Asha Rao" });
    expect(outcome.status).toBe("imported");
    if (outcome.status === "imported") {
      expect(outcome.record.row_index).toBe(0);
      expect(outcome.record.email).toBe("asha@example.com");
    }
  });
  it("accepts a record with all nullable fields set to null", () => {
    const candidate = validRecord({
      created_at: null,
      name: null,
      email: null,
      crm_status: null,
      data_source: null,
    });
    const outcome = validateExtractedRecord(candidate, {});
    expect(outcome.status).toBe("imported");
  });
  it("routes an invalid crm_status enum value to needs_review", () => {
    const candidate = { ...validRecord(), crm_status: "NOT_A_REAL_STATUS" };
    const outcome = validateExtractedRecord(candidate, { Name: "Test" });
    expect(outcome.status).toBe("needs_review");
    if (outcome.status === "needs_review") {
      expect(outcome.reason).toContain("crm_status");
    }
  });
  it("routes an invalid data_source enum value to needs_review", () => {
    const candidate = { ...validRecord(), data_source: "not_a_real_source" };
    const outcome = validateExtractedRecord(candidate, {});
    expect(outcome.status).toBe("needs_review");
    if (outcome.status === "needs_review") {
      expect(outcome.reason).toContain("data_source");
    }
  });
  it("routes an unparseable created_at to needs_review", () => {
    const candidate = { ...validRecord(), created_at: "not-a-real-date" };
    const outcome = validateExtractedRecord(candidate, {});
    expect(outcome.status).toBe("needs_review");
    if (outcome.status === "needs_review") {
      expect(outcome.reason).toContain("created_at");
    }
  });
  it("routes a record missing row_index to needs_review with the -1 sentinel", () => {
    const { row_index, ...withoutRowIndex } = validRecord();
    const outcome = validateExtractedRecord(withoutRowIndex, { Name: "No Index" });
    expect(outcome.status).toBe("needs_review");
    if (outcome.status === "needs_review") {
      expect(outcome.row_index).toBe(-1);
    }
  });
  it("routes a record with a non-numeric row_index to needs_review", () => {
    const candidate = { ...validRecord(), row_index: "zero" };
    const outcome = validateExtractedRecord(candidate, {});
    expect(outcome.status).toBe("needs_review");
    if (outcome.status === "needs_review") {
      expect(outcome.row_index).toBe(-1);
    }
  });
  it("attaches the original raw row data to needs_review outcomes", () => {
    const candidate = { ...validRecord(), crm_status: "BOGUS" };
    const raw = { Name: "Original Data", Email: "orig@example.com" };
    const outcome = validateExtractedRecord(candidate, raw);
    expect(outcome.status).toBe("needs_review");
    if (outcome.status === "needs_review") {
      expect(outcome.raw).toEqual(raw);
    }
  });
  it("routes a completely malformed candidate to needs_review, not a throw", () => {
    expect(() => validateExtractedRecord("garbage string", {})).not.toThrow();
    const outcome = validateExtractedRecord("garbage string", {});
    expect(outcome.status).toBe("needs_review");
  });
  it("routes null candidate to needs_review, not a throw", () => {
    expect(() => validateExtractedRecord(null, {})).not.toThrow();
    expect(validateExtractedRecord(null, {}).status).toBe("needs_review");
  });
});

describe("validateBatch", () => {
  it("validates multiple candidates and returns matching outcomes in order", () => {
    const candidates = [validRecord({ row_index: 0 }), validRecord({ row_index: 1 })];
    const rawByIndex = new Map([
      [0, { Name: "Row Zero" }],
      [1, { Name: "Row One" }],
    ]);
    const outcomes = validateBatch(candidates, rawByIndex);
    expect(outcomes).toHaveLength(2);
    expect(outcomes.every((o) => o.status === "imported")).toBe(true);
  });
  it("mixes imported and needs_review outcomes correctly within one batch", () => {
    const candidates = [
      validRecord({ row_index: 0 }),
      { ...validRecord({ row_index: 1 }), crm_status: "INVALID" },
    ];
    const rawByIndex = new Map([
      [0, { Name: "Good Row" }],
      [1, { Name: "Bad Row" }],
    ]);
    const outcomes = validateBatch(candidates, rawByIndex);
    expect(outcomes[0].status).toBe("imported");
    expect(outcomes[1].status).toBe("needs_review");
  });
  it("falls back to an empty object when a row_index has no matching raw data", () => {
    const candidates = [{ ...validRecord({ row_index: 99 }), crm_status: "INVALID" }];
    const rawByIndex = new Map<number, Record<string, string>>();
    const outcomes = validateBatch(candidates, rawByIndex);
    expect(outcomes[0].status).toBe("needs_review");
    if (outcomes[0].status === "needs_review") {
      expect(outcomes[0].raw).toEqual({});
    }
  });
  it("handles an empty candidates array", () => {
    expect(validateBatch([], new Map())).toEqual([]);
  });
  it("does not lose a record when its row_index is 0 (falsy-but-valid edge case)", () => {
    const candidates = [validRecord({ row_index: 0 })];
    const rawByIndex = new Map([[0, { Name: "First Row" }]]);
    const outcomes = validateBatch(candidates, rawByIndex);
    expect(outcomes[0].status).toBe("imported");
  });
});
