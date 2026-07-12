// apps/web/src/components/steps/Dropzone.tsx
"use client";
import { useCallback, useState } from "react";
import { useImportStore } from "../../store/importStore";
import { guardFileSize } from "../../lib/fileGuard";
import { parseCsvFile } from "../../lib/csvParser";

export function Dropzone() {
  const [isDragging, setIsDragging] = useState(false);
  const [sizeWarning, setSizeWarning] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState<string | null>(null);
  
  const {
    resetForNewFile,
    setIsParsing,
    setRowsParsedSoFar,
    appendRows,
    setParseWarnings,
    setStep,
  } = useImportStore();

  const handleFile = useCallback(
    async (file: File) => {
      setRejectReason(null);
      setSizeWarning(null);
      
      if (!file.name.toLowerCase().endsWith(".csv")) {
        setRejectReason("Please upload a .csv file.");
        return;
      }
      
      const guard = guardFileSize(file);
      if (guard.status === "reject") {
        setRejectReason(guard.message);
        return;
      }
      if (guard.status === "warn") {
        setSizeWarning(guard.message);
      }
      
      resetForNewFile();
      setIsParsing(true);
      
      try {
        const { rows, warnings } = await parseCsvFile(file, {
          onProgress: ({ rowsParsedSoFar }) => setRowsParsedSoFar(rowsParsedSoFar),
          onChunkParsed: (chunk) => appendRows(chunk),
        });
        
        setParseWarnings(warnings);
        setIsParsing(false);
        
        if (rows.length === 0) {
          setRejectReason("No rows found in this file — is it empty?");
          return;
        }
        
        setStep("preview");
      } catch (err) {
        setIsParsing(false);
        setRejectReason(
          err instanceof Error ? err.message : "Failed to parse this file."
        );
      }
    },
    [resetForNewFile, setIsParsing, setRowsParsedSoFar, appendRows, setParseWarnings, setStep]
  );

  const onDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const onFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const { isParsing, rowsParsedSoFar } = useImportStore();

  return (
    <div className="space-y-3">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
        className={`border-2 border-dashed rounded p-4 md:p-10 text-center transition-colors ${
          isDragging ? "border-blue-500 bg-blue-50" : "border-gray-300"
        }`}
      >
        {isParsing ? (
          <p>Parsing… {rowsParsedSoFar.toLocaleString()} rows so far</p>
        ) : (
          <>
            <p className="mb-2">Drag and drop a CSV file here, or</p>
            <label className="inline-block cursor-pointer text-blue-600 underline">
              browse to upload
              <input
                type="file"
                accept=".csv"
                className="hidden"
                onChange={onFileInputChange}
              />
            </label>
          </>
        )}
      </div>
      {sizeWarning && (
        <p className="text-amber-700 text-sm bg-amber-50 border border-amber-200 rounded p-2">
          {sizeWarning}
        </p>
      )}
      {rejectReason && (
        <p className="text-red-700 text-sm bg-red-50 border border-red-200 rounded p-2">
          {rejectReason}
        </p>
      )}
    </div>
  );
}