// apps/api/src/utils/enumGuard.test.ts
import { describe, it, expect } from "vitest";
import { guardCrmStatus, guardDataSource } from "./enumGuard";

describe("guardCrmStatus", () => {
  it("returns the exact value for a valid CRM status", () => {
    expect(guardCrmStatus("GOOD_LEAD_FOLLOW_UP")).toBe("GOOD_LEAD_FOLLOW_UP");
    expect(guardCrmStatus("BAD_LEAD")).toBe("BAD_LEAD");
  });

  it("returns null for an invalid string", () => {
    expect(guardCrmStatus("RANDOM_STATUS")).toBeNull();
  });

  it("returns null for an empty string, null, or undefined", () => {
    expect(guardCrmStatus("")).toBeNull();
    expect(guardCrmStatus(null)).toBeNull();
    expect(guardCrmStatus(undefined)).toBeNull();
  });

  it("is strictly case-sensitive (documents current stub behavior)", () => {
    // Per your TODO comment, this documents that it is currently strict-only
    // and will reject lowercase versions until fuzzy matching is implemented.
    expect(guardCrmStatus("good_lead_follow_up")).toBeNull();
  });
});

describe("guardDataSource", () => {
  it("returns the exact value for a valid data source", () => {
    expect(guardDataSource("leads_on_demand")).toBe("leads_on_demand");
    expect(guardDataSource("meridian_tower")).toBe("meridian_tower");
  });

  it("returns null for an invalid string", () => {
    expect(guardDataSource("google_ads")).toBeNull();
  });

  it("returns null for non-string garbage", () => {
    expect(guardDataSource(123)).toBeNull();
    expect(guardDataSource({ foo: "bar" })).toBeNull();
  });
});