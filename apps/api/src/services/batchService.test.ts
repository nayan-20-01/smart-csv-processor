// apps/api/src/services/batchService.test.ts
import { describe, it, expect } from "vitest";
import { estimateRowTokens, createTokenBudgetedBatches } from "./batchService";
import { IndexedRow } from "../utils/csvStreamParser";

function makeRow(row_index: number, raw: Record<string, string>): IndexedRow {
  return { row_index, raw };
}

describe("estimateRowTokens", () => {
  it("estimates tokens as chars/4 rounded up", () => {
    const row = makeRow(0, { Name: "hello" });
    expect(estimateRowTokens(row)).toBe(2);
  });
  it("sums across all column values in the row", () => {
    const row = makeRow(0, { Name: "AAAA", Email: "BBBB" }); 
    expect(estimateRowTokens(row)).toBe(2);
  });
  it("returns 0 for a row with all-empty values", () => {
    const row = makeRow(0, { Name: "", Email: "" });
    expect(estimateRowTokens(row)).toBe(0);
  });
  it("handles a row with no columns at all", () => {
    const row = makeRow(0, {});
    expect(estimateRowTokens(row)).toBe(0);
  });
  it("scales up correctly for a long value", () => {
    const longText = "x".repeat(400); 
    const row = makeRow(0, { description: longText });
    expect(estimateRowTokens(row)).toBe(100);
  });
});

describe("createTokenBudgetedBatches", () => {
  it("returns an empty array for empty input", () => {
    expect(createTokenBudgetedBatches([])).toEqual([]);
  });
  it("packs multiple small rows into a single batch when well under budget", () => {
    const rows = [
      makeRow(0, { Name: "AB" }),
      makeRow(1, { Name: "CD" }),
      makeRow(2, { Name: "EF" }),
    ];
    const batches = createTokenBudgetedBatches(rows, 100);
    expect(batches).toHaveLength(1);
    expect(batches[0].rows).toHaveLength(3);
  });
  it("preserves row order within a batch", () => {
    const rows = [
      makeRow(0, { Name: "A" }),
      makeRow(1, { Name: "B" }),
      makeRow(2, { Name: "C" }),
    ];
    const batches = createTokenBudgetedBatches(rows, 1000);
    expect(batches[0].rows.map((r) => r.row_index)).toEqual([0, 1, 2]);
  });
  it("splits into a new batch when adding a row would exceed the budget", () => {
    const rowOf25Tokens = () => "x".repeat(100);
    const rows = [
      makeRow(0, { d: rowOf25Tokens() }),
      makeRow(1, { d: rowOf25Tokens() }),
      makeRow(2, { d: rowOf25Tokens() }),
    ];
    const batches = createTokenBudgetedBatches(rows, 50);
    expect(batches).toHaveLength(2);
    expect(batches[0].rows).toHaveLength(2);
    expect(batches[1].rows).toHaveLength(1);
  });
  it("never drops a row, regardless of how batches are split", () => {
    const rows = Array.from({ length: 37 }, (_, i) =>
      makeRow(i, { d: "x".repeat(Math.floor(Math.random() * 200)) })
    );
    const batches = createTokenBudgetedBatches(rows, 30);
    const totalRowsAcrossBatches = batches.reduce((sum, b) => sum + b.rows.length, 0);
    expect(totalRowsAcrossBatches).toBe(37);
    const allIndices = batches.flatMap((b) => b.rows.map((r) => r.row_index)).sort((a, b) => a - b);
    expect(allIndices).toEqual(Array.from({ length: 37 }, (_, i) => i));
  });
  it("gives a single oversized row its own batch rather than looping or dropping it", () => {
    const hugeRow = makeRow(0, { description: "x".repeat(1000) }); 
    const normalRow = makeRow(1, { Name: "small" });
    const batches = createTokenBudgetedBatches([hugeRow, normalRow], 50);
    const hugeRowBatch = batches.find((b) => b.rows.some((r) => r.row_index === 0));
    expect(hugeRowBatch?.rows).toHaveLength(1);
    const totalRows = batches.reduce((sum, b) => sum + b.rows.length, 0);
    expect(totalRows).toBe(2);
  });
  it("does not start a new batch prematurely when the current batch is still empty", () => {
    const hugeRow = makeRow(0, { d: "x".repeat(1000) });
    const batches = createTokenBudgetedBatches([hugeRow], 50);
    expect(batches).toHaveLength(1);
    expect(batches[0].rows).toHaveLength(1);
  });
  it("uses the default token ceiling when none is passed", () => {
    const rows = [makeRow(0, { Name: "test" })];
    expect(() => createTokenBudgetedBatches(rows)).not.toThrow();
  });
});