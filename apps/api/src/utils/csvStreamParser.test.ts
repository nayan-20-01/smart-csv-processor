// apps/api/src/utils/csvStreamParser.test.ts
import { describe, it, expect } from "vitest";
import { assignRowIndices, detectColumnsNaive, shouldSkipRow } from "./csvStreamParser";

describe("assignRowIndices", () => {
  it("assigns sequential indices starting at 0", () => {
    const rows = [{ Name: "A" }, { Name: "B" }, { Name: "C" }];
    const result = assignRowIndices(rows);
    expect(result.map((r) => r.row_index)).toEqual([0, 1, 2]);
  });
  
  it("preserves the raw row data unchanged", () => {
    const rows = [{ Name: "Asha", Email: "asha@example.com" }];
    const result = assignRowIndices(rows);
    expect(result[0].raw).toEqual({ Name: "Asha", Email: "asha@example.com" });
  });
  
  it("returns an empty array for empty input", () => {
    expect(assignRowIndices([])).toEqual([]);
  });
  
  it("index reflects original array position, not any content property", () => {
    const rows = [{ id: "z" }, { id: "a" }, { id: "m" }];
    const result = assignRowIndices(rows);
    expect(result[0].row_index).toBe(0);
    expect(result[0].raw.id).toBe("z");
  });
});

describe("detectColumnsNaive", () => {
  it("matches common email column name variants", () => {
    const { emailColumns } = detectColumnsNaive(["Email", "E-Mail Address", "Contact Mail"]);
    expect(emailColumns).toEqual(["Email", "E-Mail Address", "Contact Mail"]);
  });
  
  it("matches common mobile column name variants", () => {
    const { mobileColumns } = detectColumnsNaive(["Mobile", "Phone Number", "Cell", "Contact No"]);
    expect(mobileColumns).toEqual(["Mobile", "Phone Number", "Cell", "Contact No"]);
  });
  
  it("is case-insensitive", () => {
    const { emailColumns, mobileColumns } = detectColumnsNaive(["EMAIL", "mobile"]);
    expect(emailColumns).toEqual(["EMAIL"]);
    expect(mobileColumns).toEqual(["mobile"]);
  });
  
  it("does not match unrelated column names", () => {
    const { emailColumns, mobileColumns } = detectColumnsNaive(["Name", "City", "Notes", "Company"]);
    expect(emailColumns).toEqual([]);
    expect(mobileColumns).toEqual([]);
  });
  
  it("returns empty arrays for empty headers input", () => {
    const result = detectColumnsNaive([]);
    expect(result).toEqual({ emailColumns: [], mobileColumns: [] });
  });
  
  it("KNOWN LIMITATION: cannot detect semantically-named but non-matching headers", () => {
    const { emailColumns, mobileColumns } = detectColumnsNaive(["Reach Us At"]);
    expect(emailColumns).toEqual([]);
    expect(mobileColumns).toEqual([]);
  });
});

describe("shouldSkipRow", () => {
  it("returns false when the identified email column has a value", () => {
    const raw = { Email: "asha@example.com", Name: "Asha" };
    expect(shouldSkipRow(raw, ["Email"], [])).toBe(false);
  });
  
  it("returns false when the identified mobile column has a value", () => {
    const raw = { Mobile: "9876543210", Name: "Rahul" };
    expect(shouldSkipRow(raw, [], ["Mobile"])).toBe(false);
  });
  
  it("returns true when identified columns are all empty", () => {
    const raw = { Email: "", Mobile: "  ", Name: "No Contact" };
    expect(shouldSkipRow(raw, ["Email"], ["Mobile"])).toBe(true);
  });
  
  it("returns true when no email/mobile columns were identified at all", () => {
    const raw = { Name: "Mystery Row", City: "Bangalore" };
    expect(shouldSkipRow(raw, [], [])).toBe(true);
  });
  
  it("treats whitespace-only values as empty (not a valid contact)", () => {
    const raw = { Email: "   ", Mobile: "\t" };
    expect(shouldSkipRow(raw, ["Email"], ["Mobile"])).toBe(true);
  });
  
  it("does not consult columns that weren't identified, even if they'd naively match", () => {
    const raw = { Email: "asha@example.com" };
    expect(shouldSkipRow(raw, [], [])).toBe(true);
  });
  
  it("handles a row missing the identified columns entirely (undefined, not just empty)", () => {
    const raw = { Name: "Partial Row" };
    expect(shouldSkipRow(raw, ["Email"], ["Mobile"])).toBe(true);
  });
  
  it("returns false if ANY identified email column (of several) has a value", () => {
    const raw = { "Primary Email": "", "Secondary Email": "backup@example.com" };
    expect(shouldSkipRow(raw, ["Primary Email", "Secondary Email"], [])).toBe(false);
  });
});