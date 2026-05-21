"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  FileText,
  CheckCircle2,
  ArrowRight,
  Loader2,
  PenLine,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SignaturePad } from "@/components/signature-pad";
import { RentalAgreementInline } from "@/components/rental-agreement-inline";
import { AgreementSignatureSlot } from "@/components/agreement-signature-slot";
import {
  AGREEMENT_PAGE_COUNT,
  AGREEMENT_SIGNATURE_FIELDS,
  getFieldsForPage,
  isPageComplete,
} from "@/data/agreement-fields";

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
  /** Standalone: submit all signatures to API */
  onSubmit?: (signatures: Record<string, string>) => Promise<void>;
  onCancel?: () => void;
  headerNote?: string;
  submitLabel?: string;
  agreementFooterNote?: string;
  compact?: boolean;
  /** Embedded in booking step: parent owns signature state */
  embedded?: boolean;
  signatures?: Record<string, string | null | undefined>;
  onSignaturesChange?: (signatures: Record<string, string | null>) => void;
  legalName?: string;
  onLegalNameChange?: (name: string) => void;
  showLegalName?: boolean;
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

type WizardPhase = "draw-signature" | "sign-pages";

export function AgreementSigningWizard({
  booking,
  vehicle,
  onSubmit,
  onCancel,
  headerNote,
  submitLabel = "Submit Signed Agreement",
  agreementFooterNote,
  compact = false,
  embedded = false,
  signatures: controlledSignatures,
  onSignaturesChange,
  legalName = "",
  onLegalNameChange,
  showLegalName = true,
}: AgreementSigningWizardProps) {
  const [internalSignatures, setInternalSignatures] = useState<Record<string, string | null>>({});
  const [phase, setPhase] = useState<WizardPhase>("draw-signature");
  const [masterSignature, setMasterSignature] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pageTransition, setPageTransition] = useState(false);

  const signatures = embedded && controlledSignatures !== undefined
    ? controlledSignatures
    : internalSignatures;

  useEffect(() => {
    const saved = AGREEMENT_SIGNATURE_FIELDS.map((f) => signatures[f.id]).find(Boolean);
    if (saved && !masterSignature) {
      setMasterSignature(saved);
      setPhase("sign-pages");
    }
  }, [signatures, masterSignature]);

  const setSignatures = useCallback(
    (updater: (prev: Record<string, string | null>) => Record<string, string | null>) => {
      const base = embedded && controlledSignatures !== undefined ? controlledSignatures : internalSignatures;
      const next = updater(base);
      if (embedded && onSignaturesChange) {
        onSignaturesChange(next);
      } else {
        setInternalSignatures(next);
      }
    },
    [embedded, controlledSignatures, internalSignatures, onSignaturesChange],
  );

  const totalDays = calculateTotalDays(booking.pickup_date, booking.return_date);
  const pageFields = useMemo(() => getFieldsForPage(currentPage), [currentPage]);
  const completedCount = AGREEMENT_SIGNATURE_FIELDS.filter((f) => signatures[f.id]).length;
  const allSigned = completedCount === AGREEMENT_SIGNATURE_FIELDS.length;
  const pageComplete = isPageComplete(currentPage, signatures);

  const firstUnsignedOnPage = pageFields.find((f) => !signatures[f.id]);

  useEffect(() => {
    if (phase !== "sign-pages") return;
    for (let p = 1; p <= AGREEMENT_PAGE_COUNT; p++) {
      if (!isPageComplete(p, signatures)) {
        setCurrentPage(p);
        return;
      }
    }
    setCurrentPage(AGREEMENT_PAGE_COUNT);
    // Only when entering sign-pages (e.g. back navigation with saved signatures)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  useEffect(() => {
    if (phase !== "sign-pages" || !pageComplete) return;
    if (currentPage >= AGREEMENT_PAGE_COUNT) return;

    setPageTransition(true);
    const timer = window.setTimeout(() => {
      setCurrentPage((p) => Math.min(AGREEMENT_PAGE_COUNT, p + 1));
      setPageTransition(false);
    }, 700);

    return () => window.clearTimeout(timer);
  }, [phase, pageComplete, currentPage]);

  const applyToField = (fieldId: string) => {
    if (!masterSignature) {
      setError("Draw your signature first, then tap each field to apply it.");
      setPhase("draw-signature");
      return;
    }
    setError(null);
    setSignatures((prev) => ({ ...prev, [fieldId]: masterSignature }));
  };

  const handleBeginSigning = () => {
    if (!masterSignature) {
      setError("Please draw your signature before continuing.");
      return;
    }
    setError(null);
    setPhase("sign-pages");
    setCurrentPage(1);
  };

  const handleSubmit = async () => {
    if (!allSigned || !onSubmit) return;

    const payload: Record<string, string> = {};
    for (const field of AGREEMENT_SIGNATURE_FIELDS) {
      const val = signatures[field.id];
      if (!val) {
        setError("All signature fields are required. Please sign every field on each page.");
        return;
      }
      payload[field.id] = val;
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

  return (
    <div className={`space-y-4 ${compact ? "px-1 pb-[env(safe-area-inset-bottom)]" : ""}`}>
      {headerNote && (
        <p className="text-sm text-purple-800 bg-purple-50 border border-purple-200 rounded-lg px-3 py-2">
          {headerNote}
        </p>
      )}

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 flex items-center justify-between gap-2">
          <span>{error}</span>
          <button
            type="button"
            onClick={() => setError(null)}
            className="text-red-400 hover:text-red-600 shrink-0"
            aria-label="Dismiss error"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {phase === "draw-signature" && (
        <Card className="border-purple-200">
          <CardContent className={compact ? "p-4" : "p-6"}>
            <h3 className="text-lg font-semibold text-gray-900 mb-1 flex items-center gap-2">
              <PenLine className="h-5 w-5 text-purple-600" />
              Create your signature
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              Draw your signature once below. On the next screens you will tap each highlighted box on
              the contract to apply it — no need to sign again.
            </p>
            <div className="flex justify-center">
              <SignaturePad
                onSignatureChange={setMasterSignature}
                label="Draw your signature"
                width={padWidth}
                height={150}
              />
            </div>
            <div className="mt-6 flex justify-end">
              <Button
                type="button"
                onClick={handleBeginSigning}
                disabled={!masterSignature}
                className="min-h-11"
              >
                Continue to agreement <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {phase === "sign-pages" && (
        <>
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-medium text-gray-700">
              Agreement page {currentPage} of {AGREEMENT_PAGE_COUNT}
            </span>
            <span className="text-xs text-gray-500">
              {completedCount} of {AGREEMENT_SIGNATURE_FIELDS.length} signed
            </span>
          </div>

          <Card className={compact ? "border-0 shadow-none overflow-hidden" : "overflow-hidden"}>
            <CardContent className={compact ? "p-0" : "p-0"}>
              <div className="flex items-center justify-between px-4 py-2 border-b border-gray-100 bg-gray-50">
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

              <div
                className={`transition-opacity duration-300 ${pageTransition ? "opacity-40" : "opacity-100"}`}
              >
                <div className="max-h-[min(52vh,520px)] overflow-y-auto overscroll-contain border-b border-gray-100">
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
                    deposit={booking.deposit}
                    currentPage={currentPage}
                  />
                </div>
              </div>

              {agreementFooterNote && (
                <p className="text-xs text-gray-400 px-4 py-2 border-b border-gray-50">{agreementFooterNote}</p>
              )}

              <div className="p-4 bg-purple-50/50 border-t border-purple-100">
                <p className="text-sm font-medium text-purple-900 mb-1">
                  {pageComplete && currentPage < AGREEMENT_PAGE_COUNT
                    ? "Page complete — moving to next page…"
                    : "Tap each box to apply your signature"}
                </p>
                <p className="text-xs text-purple-700/80 mb-3">
                  {firstUnsignedOnPage
                    ? `Next: ${firstUnsignedOnPage.label}`
                    : currentPage < AGREEMENT_PAGE_COUNT
                      ? "All fields on this page are signed."
                      : "All pages signed."}
                </p>

                <div className="flex flex-col gap-3">
                  {pageFields.map((field) => (
                    <div
                      key={field.id}
                      className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-gray-800">{field.label}</p>
                        <p className="text-[11px] text-gray-500 line-clamp-2">{field.description}</p>
                      </div>
                      <AgreementSignatureSlot
                        fieldId={field.id}
                        label={field.label}
                        isInitials={field.isInitials}
                        signature={signatures[field.id]}
                        onClick={applyToField}
                        disabled={!masterSignature}
                        highlighted={field.id === firstUnsignedOnPage?.id}
                      />
                    </div>
                  ))}
                </div>

                {currentPage > 1 && (
                  <div className="mt-4 pt-3 border-t border-purple-100">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    >
                      Previous page
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {showLegalName && onLegalNameChange && (
            <div className="rounded-lg border border-gray-200 bg-white p-4">
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Type your full legal name
              </label>
              <Input
                placeholder="Your full legal name"
                value={legalName}
                onChange={(e) => onLegalNameChange(e.target.value)}
                className="font-serif italic text-lg"
              />
            </div>
          )}

          {embedded && allSigned && legalName.trim() && (
            <div className="rounded-lg bg-green-50 border border-green-200 p-3 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
              <span className="text-sm text-green-700">
                Agreement fully signed — you may proceed to payment.
              </span>
            </div>
          )}

          {!embedded && allSigned && (
            <div className="flex justify-end">
              <Button
                type="button"
                onClick={handleSubmit}
                disabled={submitting}
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
            </div>
          )}
        </>
      )}
    </div>
  );
}
