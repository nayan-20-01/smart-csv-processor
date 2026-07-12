// apps/web/src/app/page.tsx
"use client";
import { ResultsStep } from "@/components/steps/ResultsStep";
import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { StepRail } from "@/components/StepRail";
import { Dropzone } from "@/components/steps/Dropzone";
import { PreviewTable } from "@/components/steps/PreviewTable";
import { ConfirmStep } from "@/components/steps/ConfirmStep";
import { useImportStore } from "@/store/importStore";
import { useImportStream } from "@/lib/useImportStream";

export default function Home() {
  const searchParams = useSearchParams();
  const step = useImportStore((s) => s.step);
  const jobId = useImportStore((s) => s.jobId);
  const setJobId = useImportStore((s) => s.setJobId);
  const setStep = useImportStore((s) => s.setStep);

  useEffect(() => {
    const urlJobId = searchParams.get("jobId");
    if (urlJobId && urlJobId !== jobId) {
      setJobId(urlJobId);
      setStep("results");
    }
  }, [searchParams, jobId, setJobId, setStep]);

  useImportStream(jobId);

  return (
    <main className="p-8 space-y-6">
      <h1 className="text-2xl font-bold">GrowEasy CSV Importer</h1>
      <StepRail />
      <div className="border rounded p-6">
        {step === "upload" && <Dropzone />}
        {step === "preview" && <PreviewTable />}
        {step === "confirm" && <ConfirmStep />}
        {step === "results" && <ResultsStep />}
      </div>
    </main>
  );
}