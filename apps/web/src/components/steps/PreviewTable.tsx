// apps/web/src/components/steps/PreviewTable.tsx
"use client";
import { useMemo, useRef } from "react";
import {
  useReactTable,
  getCoreRowModel,
  createColumnHelper,
  flexRender,
} from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useImportStore } from "../../store/importStore";

const ROW_HEIGHT_PX = 36;

export function PreviewTable() {
  const rawRows = useImportStore((s) => s.rawRows);
  const parseWarnings = useImportStore((s) => s.parseWarnings);
  const warningsAcknowledged = useImportStore((s) => s.warningsAcknowledged);
  const acknowledgeWarnings = useImportStore((s) => s.acknowledgeWarnings);
  const setStep = useImportStore((s) => s.setStep);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const columnHelper = createColumnHelper<Record<string, string>>();
  const columns = useMemo(() => {
    if (rawRows.length === 0) return [];
    const headers = Object.keys(rawRows[0]);
    return headers.map((header) =>
      columnHelper.accessor(header, {
        header,
        cell: (info) => info.getValue() ?? "",
      })
    );
  }, [rawRows, columnHelper]);

  const table = useReactTable({
    data: rawRows,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  const { rows } = table.getRowModel();

  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollContainerRef.current,
    estimateSize: () => ROW_HEIGHT_PX,
    overscan: 12,
  });

  const virtualRows = rowVirtualizer.getVirtualItems();
  const totalSize = rowVirtualizer.getTotalSize();
  const paddingTop = virtualRows.length > 0 ? virtualRows[0].start : 0;
  const paddingBottom =
    virtualRows.length > 0 ? totalSize - virtualRows[virtualRows.length - 1].end : 0;

  const warningsByRowIndex = useMemo(() => {
    const map = new Map<number, string[]>();
    for (const w of parseWarnings) {
      const existing = map.get(w.row_index) ?? [];
      existing.push(w.message);
      map.set(w.row_index, existing);
    }
    return map;
  }, [parseWarnings]);

  const hasWarnings = parseWarnings.length > 0;
  const canProceed = !hasWarnings || warningsAcknowledged;
  const affectedRowCount = warningsByRowIndex.size;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600">
          {rawRows.length.toLocaleString()} rows parsed
        </p>
      </div>

      {hasWarnings && (
        <div className="border border-amber-300 bg-amber-50 rounded p-3 space-y-2">
          <p className="text-sm text-amber-800">
            <strong>{affectedRowCount.toLocaleString()}</strong> row
            {affectedRowCount === 1 ? "" : "s"} had parsing issues (e.g. mismatched
            field counts). These rows are still included and will be sent for
            processing — the backend's skip/review logic will handle them, but
            double-check them below before continuing.
          </p>
          <label className="flex items-center gap-2 text-sm text-amber-900">
            <input
              type="checkbox"
              checked={warningsAcknowledged}
              onChange={() => acknowledgeWarnings()}
            />
            I've reviewed the flagged rows and want to proceed anyway
          </label>
        </div>
      )}

      <div
        ref={scrollContainerRef}
        className="border rounded overflow-auto"
        style={{ height: "480px" }}
      >
        <table className="w-full text-sm border-collapse">
          <thead className="sticky top-0 bg-gray-100 z-10">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                <th className="text-left px-2 py-1 border-b w-8" />
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className="text-left px-2 py-1 border-b font-medium whitespace-nowrap"
                  >
                    {flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {paddingTop > 0 && (
              <tr>
                <td style={{ height: `${paddingTop}px` }} colSpan={columns.length + 1} />
              </tr>
            )}
            {virtualRows.map((virtualRow) => {
              const row = rows[virtualRow.index];
              const rowWarnings = warningsByRowIndex.get(virtualRow.index);
              return (
                <tr
                  key={row.id}
                  className={rowWarnings ? "bg-amber-50" : undefined}
                  style={{ height: `${ROW_HEIGHT_PX}px` }}
                >
                  <td className="px-2 py-1 border-b text-center" title={rowWarnings?.join("; ")}>
                    {rowWarnings ? (
                      <span className="text-amber-600" aria-label="Parse warning">
                        ⚠
                      </span>
                    ) : null}
                  </td>
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-2 py-1 border-b whitespace-nowrap">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              );
            })}
            {paddingBottom > 0 && (
              <tr>
                <td style={{ height: `${paddingBottom}px` }} colSpan={columns.length + 1} />
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex justify-between items-center">
        <button
          className="text-sm text-gray-600 underline"
          onClick={() => setStep("upload")}
        >
          ← Upload a different file
        </button>
        <button
          disabled={!canProceed}
          onClick={() => setStep("confirm")}
          className={`px-4 py-2 rounded text-white ${
            canProceed ? "bg-blue-600 hover:bg-blue-700" : "bg-gray-300 cursor-not-allowed"
          }`}
        >
          Continue to Confirm
        </button>
      </div>
    </div>
  );
}