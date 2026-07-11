// apps/web/src/lib/csvParser.ts
import Papa from "papaparse";

export interface ParseWarning {
  row_index: number;
  message: string;
}

export interface ParseProgress {
  rowsParsedSoFar: number;
}

export interface ParseResult {
  rows: Record<string, string>[];
  warnings: ParseWarning[];
}

interface ParseCsvOptions {
  batchSize?: number; // default 500
  onProgress?: (progress: ParseProgress) => void;
  onChunkParsed?: (chunkRows: Record<string, string>[]) => void;
}

const DEFAULT_BATCH_SIZE = 500;

export function parseCsvFile(
  file: File,
  { batchSize = DEFAULT_BATCH_SIZE, onProgress, onChunkParsed }: ParseCsvOptions = {}
): Promise<ParseResult> {
  return new Promise((resolve, reject) => {
    const rows: Record<string, string>[] = [];
    const warnings: ParseWarning[] = [];
    let batchBuffer: Record<string, string>[] = [];
    let rowsParsedSoFar = 0;

    const flushBatch = () => {
      if (batchBuffer.length === 0) return;
      rows.push(...batchBuffer);
      onChunkParsed?.(batchBuffer);
      onProgress?.({ rowsParsedSoFar });
      batchBuffer = [];
    };

    Papa.parse<Record<string, string>>(file, {
      header: true,
      dynamicTyping: false, 
      skipEmptyLines: "greedy",
      worker: true, 
      step: (results, parser) => {
        for (const err of results.errors) {
          warnings.push({
            row_index: rowsParsedSoFar,
            message: describeParseError(err),
          });
        }
        batchBuffer.push(results.data);
        rowsParsedSoFar += 1;

        if (batchBuffer.length >= batchSize) {
          flushBatch();
        }
      },
      complete: () => {
        flushBatch(); 
        resolve({ rows, warnings });
      },
      error: (err) => {
        reject(err);
      },
    });
  });
}

function describeParseError(err: Papa.ParseError): string {
  switch (err.type) {
    case "FieldMismatch":
      return `Field count mismatch: ${err.message}`;
    case "Delimiter":
      return `Delimiter detection issue: ${err.message}`;
    case "Quotes":
      return `Malformed quoting: ${err.message}`;
    default:
      return err.message;
  }
}