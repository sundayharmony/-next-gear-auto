"use client";

import React from "react";
import { Check, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { WIZARD_STEPS } from "@/app/booking/booking-constants";
import type { WizardStep } from "@/lib/booking/wizard-validation";

export function WizardProgress({
  currentStep,
  onStepClick,
}: {
  currentStep: WizardStep;
  onStepClick: (step: WizardStep) => void;
}) {
  return (
    <div className="border-b border-gray-200 bg-white sticky top-[92px] z-30">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-1 overflow-x-auto py-3">
          {WIZARD_STEPS.map((step, i) => (
            <React.Fragment key={step.num}>
              {i > 0 && <ChevronRight className="h-4 w-4 shrink-0 text-gray-300" />}
              <button
                onClick={() => step.num < currentStep && onStepClick(step.num as WizardStep)}
                className={cn(
                  "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-all duration-300",
                  currentStep === step.num
                    ? "bg-purple-600 text-white"
                    : step.num < currentStep
                    ? "bg-purple-100 text-purple-700 cursor-pointer hover:bg-purple-200"
                    : "bg-gray-100 text-gray-400"
                )}
                disabled={step.num > currentStep}
                aria-current={currentStep === step.num ? "step" : undefined}
              >
                {step.num < currentStep ? (
                  <Check className="h-3.5 w-3.5" />
                ) : (
                  <step.icon className="h-3.5 w-3.5" />
                )}
                <span className="hidden sm:inline">{step.label}</span>
              </button>
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
}
