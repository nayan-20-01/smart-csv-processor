// apps/web/src/lib/fileGuard.ts
export const SOFT_WARN_BYTES = 10 * 1024 * 1024; // 10MB
export const HARD_CAP_BYTES = 18 * 1024 * 1024;  // 18MB — matches apps/api's express.json 20MB limit with headroom

export type FileGuardResult =
  | { status: "ok" }
  | { status: "warn"; message: string }
  | { status: "reject"; message: string };

export function guardFileSize(file: File): FileGuardResult {
  if (file.size > HARD_CAP_BYTES) {
    return {
      status: "reject",
      message: `This file is ${formatBytes(file.size)}, which exceeds the ${formatBytes(
        HARD_CAP_BYTES
      )} limit. Try trimming unused columns or splitting the file.`,
    };
  }
  if (file.size > SOFT_WARN_BYTES) {
    return {
      status: "warn",
      message: `This file is ${formatBytes(
        file.size
      )}. Parsing may take a moment — the tab will stay responsive, but larger files take longer.`,
    };
  }
  return { status: "ok" };
}

function formatBytes(bytes: number): string {
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(1)}MB`;
}