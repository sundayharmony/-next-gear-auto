"use client";

import { ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";
import type { WizardStep } from "@/lib/booking/wizard-validation";

export function WizardNav({
  currentStep,
  canProceed,
  isSubmitting,
  checkoutTotal,
  showBarTotal,
  onBack,
  onNext,
}: {
  currentStep: WizardStep;
  canProceed: boolean;
  isSubmitting: boolean;
  checkoutTotal: number;
  showBarTotal: boolean;
  onBack: () => void;
  onNext: () => void;
}) {
  if (currentStep > 7) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-gray-200 bg-white/95 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-4px_20px_-8px_rgba(124,58,237,0.25)] backdrop-blur-md sm:static sm:z-auto sm:mt-6 sm:border-0 sm:bg-transparent sm:p-0 sm:shadow-none sm:backdrop-blur-none">
      <div className="mx-auto flex max-w-3xl items-center gap-3">
        <Button
          variant="outline"
          onClick={currentStep === 1 ? undefined : onBack}
          disabled={currentStep === 1 || isSubmitting}
          className="shrink-0"
        >
          <ArrowLeft className="h-4 w-4 sm:mr-1" />
          <span className="hidden sm:inline">Back</span>
        </Button>

        {showBarTotal && (
          <div className="flex flex-1 flex-col leading-tight sm:hidden">
            <span className="text-[10px] font-medium uppercase tracking-wide text-gray-400">Total</span>
            <span className="text-base font-bold text-purple-700">${checkoutTotal.toFixed(2)}</span>
          </div>
        )}

        {currentStep < 7 && (
          <Button
            onClick={onNext}
            disabled={!canProceed || isSubmitting}
            className={cn("sm:ml-auto", !showBarTotal && "flex-1 sm:flex-none")}
          >
            {currentStep === 6 ? "Proceed to Payment" : "Continue"}
            <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        )}
      </div>
    </div>
  );
}
