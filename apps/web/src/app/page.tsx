// apps/web/src/app/page.tsx
"use client";
// Note: We are using a simple header instead of StepRail for testing Phase 2
import { Dropzone } from "../components/steps/Dropzone";
import { PreviewTable } from "../components/steps/PreviewTable";
import { useImportStore } from "../store/importStore";

export default function Home() {
  const step = useImportStore((s) => s.step);

  return (
    <main className="p-8 space-y-6 max-w-5xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-800">GrowEasy CSV Importer</h1>
      
      {/* Temporary simplified Step Rail for testing */}
      <div className="flex gap-4 text-sm font-medium text-gray-500 mb-8 border-b pb-4">
        <span className={step === "upload" ? "text-blue-600 font-bold" : ""}>1. Upload</span>
        <span>→</span>
        <span className={step === "preview" ? "text-blue-600 font-bold" : ""}>2. Preview</span>
        <span>→</span>
        <span className={step === "confirm" ? "text-blue-600 font-bold" : ""}>3. Confirm</span>
        <span>→</span>
        <span className={step === "results" ? "text-blue-600 font-bold" : ""}>4. Results</span>
      </div>

      <div className="border rounded-lg shadow-sm p-6 bg-white">
        {step === "upload" && <Dropzone />}
        {step === "preview" && <PreviewTable />}
        {step === "confirm" && <p>Confirm step — Phase 4</p>}
        {step === "results" && <p>Results step — Phase 4</p>}
      </div>
    </main>
  );
}