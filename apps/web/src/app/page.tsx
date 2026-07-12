// apps/web/src/app/page.tsx
"use client";

import { Suspense, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { StepRail } from "@/components/StepRail";
import { Dropzone } from "@/components/steps/Dropzone";
import { PreviewTable } from "@/components/steps/PreviewTable";
import { ConfirmStep } from "@/components/steps/ConfirmStep";
import { ResultsStep } from "@/components/steps/ResultsStep";
import { useImportStore } from "@/store/importStore";
import { useImportStream } from "@/lib/useImportStream";

function MainContent() {
  const searchParams = useSearchParams();
  const step = useImportStore((s) => s.step);
  const jobId = useImportStore((s) => s.jobId);
  const setJobId = useImportStore((s) => s.setJobId);
  const setStep = useImportStore((s) => s.setStep);
  
  // Bring in our new reset function!
  const resetAll = useImportStore((s) => s.resetAll);

  useEffect(() => {
    const urlJobId = searchParams.get("jobId");
    
    if (urlJobId) {
      // 1. If they are loading a shared results link, show the results!
      if (urlJobId !== jobId) {
        setJobId(urlJobId);
        setStep("results");
      }
    } else {
      // 2. If it is a normal visit or page refresh, wipe the memory clean!
      resetAll();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // The empty array ensures this only fires exactly once on page load

  useImportStream(jobId);

  return (
    <main className="p-4 md:p-8 space-y-6">
      <StepRail />
      {/* Added responsive padding and dark mode background fixes here! */}
      <div className="border border-gray-200 dark:border-gray-800 rounded p-4 md:p-6 bg-white dark:bg-[#0a0a0a]">
        {step === "upload" && <Dropzone />}
        {step === "preview" && <PreviewTable />}
        {step === "confirm" && <ConfirmStep />}
        {step === "results" && <ResultsStep />}
      </div>
    </main>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-gray-500">Loading application...</div>}>
      <MainContent />
    </Suspense>
  );
}