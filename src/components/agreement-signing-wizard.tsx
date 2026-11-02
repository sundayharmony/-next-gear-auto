"use client";

import React, { useCallback, useMemo, useState } from "react";
import {
  FileText,
  CheckCircle2,
  ArrowRight,
  Loader2,
  PenLine,
  X,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SignaturePad } from "@/components/signature-pad";
import { RentalAgreementInline } from "@/components/rental-agreement-inline";
import {
  AGREEMENT_PAGE_COUNT,
  PRIMARY_AGREEMENT_SIGNATURE_ID,
} from "@/data/agreement-fields";
import { AGREEMENT_ESIGN_DISCLOSURE } from "@/lib/agreement/rental-agreement-terms";
import type { AgreementBookingContext } from "@/lib/agreement/agreement-booking-context";

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

export interface AgreementSigningSubmitPayload {
  signatures: Record<string, string>;
  signedName: string;
  ackGpsTracking: boolean;
  ackPaymentAuthorization: boolean;
}

export interface AgreementSigningWizardProps {
  booking: AgreementSigningBooking;
  vehicle: AgreementSigningVehicle | null;
  /** Standalone: submit signature payload to API */
  onSubmit?: (payload: AgreementSigningSubmitPayload) => Promise<void>;
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
  ackGpsTracking?: boolean;
  onAckGpsTrackingChange?: (value: boolean) => void;
  ackPaymentAuthorization?: boolean;
  onAckPaymentAuthorizationChange?: (value: boolean) => void;
  /** Customer checkout / standalone recovery — staff in-person skips acks */
  requireAcknowledgements?: boolean;
  bookingContext?: AgreementBookingContext;
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

export function isAgreementWizardComplete(
  signatures: Record<string, string | null | undefined>,
  signedName: string,
  ackGps: boolean,
  ackPayment: boolean,
  requireAcknowledgements: boolean,
): boolean {
  if (!signatures[PRIMARY_AGREEMENT_SIGNATURE_ID]) return false;
  if (!signedName.trim()) return false;
  if (requireAcknowledgements && (!ackGps || !ackPayment)) return false;
  return true;
}

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
  ackGpsTracking = false,
  onAckGpsTrackingChange,
  ackPaymentAuthorization = false,
  onAckPaymentAuthorizationChange,
  requireAcknowledgements = true,
  bookingContext,
}: AgreementSigningWizardProps) {
  const [internalSignatures, setInternalSignatures] = useState<Record<string, string | null>>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [masterSignature, setMasterSignature] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const signatures = embedded && controlledSignatures !== undefined
    ? controlledSignatures
    : internalSignatures;

  const setSignatures = useCallback(
    (updater: (prev: Record<string, string | null>) => Record<string, string | null>) => {
      const base = embedded && controlledSignatures !== undefined ? controlledSignatures : internalSignatures;
      const normalizedBase: Record<string, string | null> = {};
      for (const [key, val] of Object.entries(base)) {
        normalizedBase[key] = val ?? null;
      }
      const next = updater(normalizedBase);
      if (embedded && onSignaturesChange) {
        onSignaturesChange(next);
      } else {
        setInternalSignatures(next);
      }
    },
    [embedded, controlledSignatures, internalSignatures, onSignaturesChange],
  );

  const totalDays = calculateTotalDays(booking.pickup_date, booking.return_date);
  const primaryApplied = Boolean(signatures[PRIMARY_AGREEMENT_SIGNATURE_ID]);

  const signingComplete = useMemo(
    () =>
      isAgreementWizardComplete(
        signatures,
        legalName,
        ackGpsTracking,
        ackPaymentAuthorization,
        requireAcknowledgements,
      ),
    [signatures, legalName, ackGpsTracking, ackPaymentAuthorization, requireAcknowledgements],
  );

  const applyPrimarySignature = () => {
    if (!masterSignature) {
      setError("Please draw your signature before applying it to the agreement.");
      return;
    }
    setError(null);
    setSignatures((prev) => ({
      ...prev,
      [PRIMARY_AGREEMENT_SIGNATURE_ID]: masterSignature,
    }));
  };

  const handleSubmit = async () => {
    if (!signingComplete || !onSubmit) return;

    const sig = signatures[PRIMARY_AGREEMENT_SIGNATURE_ID];
    if (!sig) {
      setError("Please apply your signature to the agreement.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await onSubmit({
        signatures: { [PRIMARY_AGREEMENT_SIGNATURE_ID]: sig },
        signedName: legalName.trim(),
        ackGpsTracking: requireAcknowledgements ? ackGpsTracking : true,
        ackPaymentAuthorization: requireAcknowledgements ? ackPaymentAuthorization : true,
      });
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

      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium text-gray-700">
          Agreement page {currentPage} of {AGREEMENT_PAGE_COUNT}
        </span>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 w-8 p-0"
            disabled={currentPage <= 1}
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            aria-label="Previous page"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 w-8 p-0"
            disabled={currentPage >= AGREEMENT_PAGE_COUNT}
            onClick={() => setCurrentPage((p) => Math.min(AGREEMENT_PAGE_COUNT, p + 1))}
            aria-label="Next page"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Card className={compact ? "border-0 shadow-none overflow-hidden" : "overflow-hidden"}>
        <CardContent className="p-0">
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
              bookingContext={bookingContext}
              currentPage={currentPage}
            />
          </div>

          {agreementFooterNote && (
            <p className="text-xs text-gray-400 px-4 py-2 border-b border-gray-50">{agreementFooterNote}</p>
          )}
        </CardContent>
      </Card>

      <Card className="border-purple-200">
        <CardContent className={compact ? "p-4 space-y-4" : "p-6 space-y-4"}>
          <p className="text-xs text-gray-600 leading-relaxed">{AGREEMENT_ESIGN_DISCLOSURE}</p>

          {requireAcknowledgements && onAckGpsTrackingChange && onAckPaymentAuthorizationChange && (
            <div className="space-y-2 rounded-lg border border-gray-200 bg-gray-50/80 p-3">
              <label className="flex items-start gap-2 text-sm text-gray-800 cursor-pointer">
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                  checked={ackGpsTracking}
                  onChange={(e) => onAckGpsTrackingChange(e.target.checked)}
                />
                <span>I agree to GPS/telematics tracking during this rental as described in the agreement.</span>
              </label>
              <label className="flex items-start gap-2 text-sm text-gray-800 cursor-pointer">
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                  checked={ackPaymentAuthorization}
                  onChange={(e) => onAckPaymentAuthorizationChange(e.target.checked)}
                />
                <span>I authorize charges to my payment method for rental fees, damages, and other amounts owed under this agreement.</span>
              </label>
            </div>
          )}

          {showLegalName && onLegalNameChange && (
            <div>
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

          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1 flex items-center gap-2">
              <PenLine className="h-5 w-5 text-purple-600" />
              Your signature
            </h3>
            <p className="text-sm text-gray-500 mb-3">
              Draw once below, then apply it to the agreement. One signature covers all required fields on the PDF.
            </p>
            <div className="flex justify-center">
              <SignaturePad
                onSignatureChange={setMasterSignature}
                label="Draw your signature"
                width={padWidth}
                height={150}
              />
            </div>
            <div className="mt-4 flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
              <Button
                type="button"
                variant={primaryApplied ? "outline" : "default"}
                onClick={applyPrimarySignature}
                disabled={!masterSignature}
                className="min-h-11"
              >
                {primaryApplied ? "Re-apply signature" : "Apply signature to agreement"}
              </Button>
              {primaryApplied && (
                <span className="text-sm text-green-700 flex items-center gap-1">
                  <CheckCircle2 className="h-4 w-4" /> Signature applied
                </span>
              )}
            </div>
          </div>

          {embedded && signingComplete && (
            <div className="rounded-lg bg-green-50 border border-green-200 p-3 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
              <span className="text-sm text-green-700">
                Agreement signed — you may proceed to payment.
              </span>
            </div>
          )}

          {!embedded && (
            <div className="flex justify-end pt-2">
              <Button
                type="button"
                onClick={handleSubmit}
                disabled={submitting || !signingComplete}
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

          {embedded && currentPage < AGREEMENT_PAGE_COUNT && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="w-full text-purple-700"
              onClick={() => setCurrentPage((p) => Math.min(AGREEMENT_PAGE_COUNT, p + 1))}
            >
              Continue reading page {currentPage + 1} <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
