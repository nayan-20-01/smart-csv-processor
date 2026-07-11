// apps/api/src/utils/dateNormalizer.test.ts
import { describe, it, expect } from "vitest";
import { normalizeDate, isValidDateString } from "./dateNormalizer";

describe("normalizeDate", () => {
  it("returns an ISO string for a valid date input", () => {
    const result = normalizeDate("2026-01-15");
    expect(result).not.toBeNull();
    expect(new Date(result!).getTime()).not.toBeNaN();
  });

  it("normalizes a common human-readable date format", () => {
    const result = normalizeDate("January 15, 2026");
    expect(result).not.toBeNull();
    expect(new Date(result!).getFullYear()).toBe(2026);
  });

  it("returns null for an unparseable string", () => {
    expect(normalizeDate("not a date")).toBeNull();
  });

  it("returns null for an empty string", () => {
    expect(normalizeDate("")).toBeNull();
  });

  it("returns null for a whitespace-only string", () => {
    expect(normalizeDate("   ")).toBeNull();
  });

  it("returns null for null input", () => {
    expect(normalizeDate(null)).toBeNull();
  });

  it("returns null for undefined input", () => {
    expect(normalizeDate(undefined)).toBeNull();
  });

  it("returned value satisfies contract.md invariant #4 (new Date() parseability)", () => {
    const result = normalizeDate("2026-07-11T10:30:00Z");
    expect(result).not.toBeNull();
    expect(new Date(result!).toString()).not.toBe("Invalid Date");
  });

  it("handles a date-only string without a time component", () => {
    const result = normalizeDate("2026-12-25");
    expect(result).not.toBeNull();
    expect(new Date(result!).getUTCMonth()).toBe(11); // December = index 11
  });

  it("returns null for non-date word-salad garbage", () => {
    expect(normalizeDate("row 42 of the CSV")).toBeNull();
  });

  it("KNOWN LIMITATION: bare numeric strings are accepted as years by JS Date parsing", () => {
    // Documents existing behavior rather than asserting it's correct.
    // normalizeDate relies on `new Date(string)`, which happily parses
    // "123" as year 123 AD and "2026" as Jan 1 2026. A stray numeric ID
    // or row number in a CSV cell could silently become a "valid"
    // created_at. Not fixed here — flagged as a real edge case for
    // Phase 3's dateNormalizer TODO (real-world CSV date formats) to
    // address later, e.g. via a minimum plausible-year check or requiring
    // date-like structure (separators) before accepting.
    expect(normalizeDate("123")).not.toBeNull();
    expect(new Date(normalizeDate("123")!).getFullYear()).toBe(123);
  });
});

describe("isValidDateString", () => {
  it("returns true for a valid ISO date string", () => {
    expect(isValidDateString("2026-07-11T00:00:00Z")).toBe(true);
  });

  it("returns false for an invalid date string", () => {
    expect(isValidDateString("not a date")).toBe(false);
  });

  it("returns false for an empty string", () => {
    expect(isValidDateString("")).toBe(false);
  });
});