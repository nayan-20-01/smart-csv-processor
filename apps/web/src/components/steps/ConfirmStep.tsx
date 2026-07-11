// apps/web/src/components/steps/ConfirmStep.tsx
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useImportStore } from "@/store/importStore";
import { ImportStartResponseSchema } from "@groweasy/shared";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";

export function ConfirmStep() {
  const router = useRouter();
  const rawRows = useImportStore((s) => s.rawRows);
  const setJobId = useImportStore((s) => s.setJobId);
  const setStep = useImportStore((s) => s.setStep);
  const resetJob = useImportStore((s) => s.resetJob);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleStartImport = async () => {
    setIsSubmitting(true);
    setSubmitError(null);
    resetJob();

    try {
      const response = await fetch(`${API_BASE}/api/import/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: rawRows }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.error?.message ?? `Request failed with status ${response.status}`);
      }

      const parsed = ImportStartResponseSchema.safeParse(await response.json());
      if (!parsed.success) {
        throw new Error("Server response didn't match the expected shape.");
      }

      setJobId(parsed.data.jobId);
      setStep("results");
      router.replace(`/?jobId=${parsed.data.jobId}`, { scroll: false });
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Failed to start the import.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <p>
        Ready to import <strong>{rawRows.length.toLocaleString()}</strong> rows. This will send
        the data to the backend for AI-assisted processing.
      </p>
      {submitError && (
        <p className="text-red-700 text-sm bg-red-50 border border-red-200 rounded p-2">
          {submitError}
        </p>
      )}
      <div className="flex justify-between items-center">
        <button className="text-sm text-gray-600 underline" onClick={() => setStep("preview")}>
          ← Back to preview
        </button>
        <button
          onClick={handleStartImport}
          disabled={isSubmitting || rawRows.length === 0}
          className={`px-4 py-2 rounded text-white ${
            isSubmitting || rawRows.length === 0
              ? "bg-gray-300 cursor-not-allowed"
              : "bg-blue-600 hover:bg-blue-700"
          }`}
        >
          {isSubmitting ? "Starting…" : "Start Import"}
        </button>
      </div>
    </div>
  );
}