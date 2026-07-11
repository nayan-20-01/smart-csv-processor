// apps/api/src/utils/csvStreamParser.ts
export interface IndexedRow {
  row_index: number;
  raw: Record<string, string>;
}

export function assignRowIndices(rows: Record<string, string>[]): IndexedRow[] {
  return rows.map((raw, row_index) => ({ row_index, raw }));
}

export const EMAIL_KEY_HINTS = ["email", "e-mail", "mail"];
export const MOBILE_KEY_HINTS = ["mobile", "phone", "contact", "cell"];

export function detectColumnsNaive(
  headers: string[]
): { emailColumns: string[]; mobileColumns: string[] } {
  const emailColumns = headers.filter((h) =>
    EMAIL_KEY_HINTS.some((hint) => h.toLowerCase().includes(hint))
  );
  const mobileColumns = headers.filter((h) =>
    MOBILE_KEY_HINTS.some((hint) => h.toLowerCase().includes(hint))
  );
  return { emailColumns, mobileColumns };
}

export function shouldSkipRow(
  raw: Record<string, string>,
  emailColumns: string[],
  mobileColumns: string[]
): boolean {
  const hasEmailValue = emailColumns.some((col) => raw[col]?.trim());
  const hasMobileValue = mobileColumns.some((col) => raw[col]?.trim());
  return !hasEmailValue && !hasMobileValue;
}