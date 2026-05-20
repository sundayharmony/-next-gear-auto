"use client";

import React, { useCallback, useState } from "react";
import {
  FileText,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Loader2,
  PenLine,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SignaturePad } from "@/components/signature-pad";
import { RentalAgreementInline, getPageForStep } from "@/components/rental-agreement-inline";
import { AGREEMENT_SIGNATURE_FIELDS as SIGNATURE_FIELDS } from "@/data/agreement-fields";

export interface AgreementSigningVehicle {
  make: string;
  model: string;
  year: number;
  licensePlate?: string;
  vin?: string;
  color?: string;
  mileage?: number;
}

export interface AgreementSigningBooking {
  customer_name: string;
  customer_email?: string;
  customer_phone?: string;
  pickup_date: string;
  return_date: string;
  pickup_time?: string;
  return_time?: string;
  total_price: number;
  deposit?: number;
}

export interface AgreementSigningWizardProps {
  booking: AgreementSigningBooking;
  vehicle: AgreementSigningVehicle | null;
  onSubmit: (signatures: Record<string, string>) => Promise<void>;
  onCancel?: () => void;
  headerNote?: string;
  submitLabel?: string;
  agreementFooterNote?: string;
  compact?: boolean;
}

function calculateTotalDays(pickupDate: string, returnDate: string): number {
  try {
    const pickup = new Date(`${pickupDate}T00:00:00`);
    const returnD = new Date(`${returnDate}T00:00:00`);
    if (isNaN(pickup.getTime()) || isNaN(returnD.getTime())) return 1;
    const diff = (returnD.getTime() - pickup.getTime()) / (1000 * 60 * 60 * 24);
    return Math.max(1, Math.ceil(diff));
  } catch {
    return 1;
  }
}

export function AgreementSigningWizard({
  booking,
  vehicle,
  onSubmit,
  onCancel,
  headerNote,
  submitLabel = "Submit Signed Agreement",
  agreementFooterNote = "Vehicle and booking information has been pre-filled. Review the agreement above, then sign below.",
  compact = false,
}: AgreementSigningWizardProps) {
  const [signatures, setSignatures] = useState<Record<string, string | null>>({});
  const [currentStep, setCurrentStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignatureChange = useCallback((fieldId: string, dataUrl: string | null) => {
    setSignatures((prev) => ({ ...prev, [fieldId]: dataUrl }));
  }, []);

  const completedCount = SIGNATURE_FIELDS.filter((f) => signatures[f.id]).length;
  const allSigned = completedCount === SIGNATURE_FIELDS.length;
  const currentField = SIGNATURE_FIELDS[currentStep];
  const totalDays = calculateTotalDays(booking.pickup_date, booking.return_date);

  const handleSubmit = async () => {
    if (!allSigned) return;

    const hasNullSignatures = SIGNATURE_FIELDS.some((f) => !signatures[f.id]);
    if (hasNullSignatures) {
      setError("All signature fields are required. Please sign all sections.");
      return;
    }

    const payload: Record<string, string> = {};
    for (const field of SIGNATURE_FIELDS) {
      const val = signatures[field.id];
      if (val) payload[field.id] = val;
    }

    setSubmitting(true);
    setError(null);
    try {
      await onSubmit(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit signed agreement.");
    } finally {
      setSubmitting(false);
    }
  };

  const padWidth = compact
    ? Math.min(340, typeof window !== "undefined" ? window.innerWidth - 48 : 340)
    : 400;
  const initialsWidth = compact ? 160 : 200;

  return (
    <div className={`space-y-4 ${compact ? "px-1 pb-[env(safe-area-inset-bottom)]" : ""}`}>
      {headerNote && (
        <p className="text-sm text-purple-800 bg-purple-50 border border-purple-200 rounded-lg px-3 py-2">
          {headerNote}
        </p>
      )}

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 flex items-center justify-between">
          <span>{error}</span>
          <button
            type="button"
            onClick={() => setError(null)}
            className="ml-3 text-red-400 hover:text-red-600 shrink-0"
            aria-label="Dismiss error"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {vehicle && (
        <Card className={compact ? "border-0 shadow-none" : "mb-2"}>
          <CardContent className={compact ? "p-2" : "p-4"}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <FileText className="h-4 w-4 text-purple-500" />
                Rental Agreement
              </h3>
              {onCancel && (
                <Button type="button" variant="ghost" size="sm" onClick={onCancel} className="h-8 px-2">
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
            <RentalAgreementInline
              vehicle={vehicle}
              customerName={booking.customer_name}
              customerEmail={booking.customer_email}
              customerPhone={booking.customer_phone}
              pickupDate={booking.pickup_date}
              returnDate={booking.return_date}
              pickupTime={booking.pickup_time}
              returnTime={booking.return_time}
              totalPrice={booking.total_price}
              totalDays={totalDays}
              currentPage={getPageForStep(currentStep)}
            />
            <p className="text-xs text-gray-400 mt-2">{agreementFooterNote}</p>
          </CardContent>
        </Card>
      )}

      <div aria-live="polite" aria-label="Signature progress">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">
            Signatures: {completedCount} of {SIGNATURE_FIELDS.length}
          </span>
          <span className="text-xs text-gray-400">
            Step {currentStep + 1} of {SIGNATURE_FIELDS.length}
          </span>
        </div>
        <div className="flex gap-1">
          {SIGNATURE_FIELDS.map((field, i) => (
            <button
              key={field.id}
              type="button"
              onClick={() => setCurrentStep(i)}
              className={`h-10 min-w-[2rem] flex-1 rounded-full transition-colors flex items-center justify-center ${
                signatures[field.id]
                  ? "bg-green-500"
                  : i === currentStep
                    ? "bg-purple-500"
                    : "bg-gray-200"
              }`}
              title={`${field.label}: ${signatures[field.id] ? "Signed" : "Pending"}`}
              aria-label={`${field.label}: ${signatures[field.id] ? "Signed" : "Pending"}`}
            >
              {signatures[field.id] ? (
                <CheckCircle2 className="h-5 w-5 text-white" />
              ) : i === currentStep ? (
                <PenLine className="h-5 w-5 text-white" />
              ) : null}
            </button>
          ))}
        </div>
      </div>

      <Card className="border-purple-200">
        <CardContent className={compact ? "p-4" : "p-6"}>
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-1">
              {signatures[currentField.id] ? (
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              ) : (
                <PenLine className="h-5 w-5 text-purple-500" />
              )}
              <h3 className="text-lg font-semibold text-gray-900">{currentField.label}</h3>
            </div>
            <p className="text-sm text-gray-500 ml-7">{currentField.description}</p>
          </div>

          <div className="flex justify-center">
            <SignaturePad
              key={currentField.id}
              onSignatureChange={(data) => handleSignatureChange(currentField.id, data)}
              isInitials={currentField.isInitials}
              label={currentField.isInitials ? "Initial here" : "Sign here"}
              width={currentField.isInitials ? initialsWidth : padWidth}
              height={currentField.isInitials ? 80 : 150}
            />
          </div>

          <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-100 gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setCurrentStep((s) => Math.max(0, s - 1))}
              disabled={currentStep === 0}
              className="min-h-11"
            >
              <ArrowLeft className="h-4 w-4 mr-1" /> Previous
            </Button>

            {currentStep < SIGNATURE_FIELDS.length - 1 ? (
              <Button
                type="button"
                onClick={() => setCurrentStep((s) => s + 1)}
                disabled={!signatures[currentField.id]}
                className="min-h-11"
              >
                Next <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            ) : (
              <Button
                type="button"
                onClick={handleSubmit}
                disabled={!allSigned || submitting}
                className="bg-green-600 hover:bg-green-700 min-h-11"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Submitting...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4 mr-2" /> {submitLabel}
                  </>
                )}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {!compact && (
        <Card>
          <CardContent className="p-4">
            <h4 className="text-sm font-semibold text-gray-700 mb-3">All Signatures</h4>
            <div className="space-y-2">
              {SIGNATURE_FIELDS.map((field, i) => (
                <button
                  key={field.id}
                  type="button"
                  onClick={() => setCurrentStep(i)}
                  className={`w-full flex items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors min-h-11 ${
                    i === currentStep
                      ? "bg-purple-50 border border-purple-200"
                      : "hover:bg-gray-50"
                  }`}
                >
                  {signatures[field.id] ? (
                    <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                  ) : (
                    <div className="h-4 w-4 rounded-full border-2 border-gray-300 shrink-0" />
                  )}
                  <span className="text-sm text-gray-700 truncate">{field.label}</span>
                  {signatures[field.id] && (
                    <span className="ml-auto text-xs text-green-600 shrink-0">Signed</span>
                  )}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
