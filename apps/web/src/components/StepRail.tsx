"use client";
import { Check } from "lucide-react";
import { useImportStore, Step } from "@/store/importStore";

const STEPS: { key: Step; label: string }[] = [
  { key: "upload", label: "Upload" },
  { key: "preview", label: "Preview" },
  { key: "confirm", label: "Confirm" },
  { key: "results", label: "Results" },
];

export function StepRail() {
  const currentStep = useImportStore((s) => s.step);
  const currentIndex = STEPS.findIndex((s) => s.key === currentStep);
  
  return (
    <ol className="flex items-center w-full overflow-x-auto">
      {STEPS.map((s, i) => {
        const isComplete = i < currentIndex;
        const isActive = i === currentIndex;
        const isLast = i === STEPS.length - 1;
        return (
          <li key={s.key} className="flex items-center flex-1 last:flex-none min-w-fit">
            <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
              <div
                className={`flex items-center justify-center w-6 h-6 sm:w-8 sm:h-8 rounded-full text-xs sm:text-sm font-semibold shrink-0 transition-colors ${
                  isComplete
                    ? "bg-blue-600 dark:bg-blue-500 text-white"
                    : isActive
                    ? "bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 ring-2 ring-blue-600 dark:ring-blue-500"
                    : "bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500"
                }`}
              >
                {isComplete ? <Check size={14} /> : i + 1}
              </div>
              {/* Active step always visible, inactive steps hide below 'sm' screens */}
              <span
                className={`text-xs sm:text-sm whitespace-nowrap ${isActive ? "inline" : "hidden sm:inline"} ${
                  isActive
                    ? "font-semibold text-gray-900 dark:text-gray-100"
                    : isComplete
                    ? "text-gray-600 dark:text-gray-400"
                    : "text-gray-400 dark:text-gray-600"
                }`}
              >
                {s.label}
              </span>
            </div>
            {!isLast && (
              <div
                className={`flex-1 h-px mx-2 sm:mx-4 min-w-[8px] transition-colors ${
                  isComplete ? "bg-blue-600 dark:bg-blue-500" : "bg-gray-200 dark:bg-gray-800"
                }`}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}