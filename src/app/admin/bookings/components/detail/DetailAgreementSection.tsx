"use client";

import React from "react";
import { RefreshCw, Link2, FileText, PenLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils/date-helpers";
import { isAllowedExternalHref } from "@/lib/utils/safe-url";
import { isAgreementComplete } from "@/lib/agreement/agreement-complete";
import type { BookingDetailContext } from "./booking-detail-context";

interface DetailAgreementSectionProps {
  ctx: BookingDetailContext;
}

export function DetailAgreementSection({ ctx }: DetailAgreementSectionProps) {
  const {
    booking,
    recurringMeta,
    canSendBookingEmail,
    resendingAgreement,
    handleResendAgreement,
    showInPersonSign,
    onStartInPersonSign,
    canOverrideAgreement,
    overridingAgreement,
    handleOverrideAgreement,
  } = ctx;

  return (
    <div className="space-y-2 border-t border-gray-200 pt-4">
      <h3 className="text-sm font-semibold flex items-center gap-2">
        <FileText className="w-4 h-4" />
        Rental Agreement
      </h3>
      {booking.signed_name ? (
        <div className="space-y-2 text-sm">
          <p className="text-gray-700">
            Signed by: <span className="italic">{booking.signed_name}</span>
          </p>
          {isAgreementComplete(booking) && booking.agreement_signed_at && (
            <p className="text-gray-600 text-xs">
              {formatDate(booking.agreement_signed_at)}
            </p>
          )}
          {booking.rental_agreement_url && (
            <a
              href={isAllowedExternalHref(booking.rental_agreement_url) || "#"}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-700 text-xs flex items-center gap-1"
            >
              <Link2 className="w-3 h-3" />
              View Agreement
            </a>
          )}
          {recurringMeta.isRecurringLongTerm &&
            isAgreementComplete(booking) &&
            booking.rental_agreement_url && (
              <p className="text-xs text-gray-600">
                Signed PDF includes the weekly recurring supplement. For the full
                layout, use Week-to-Week Contract.
              </p>
            )}
          {canSendBookingEmail && (
            <button
              onClick={handleResendAgreement}
              disabled={resendingAgreement}
              className="mt-1 text-xs text-purple-600 hover:text-purple-800 flex items-center gap-1 disabled:opacity-50"
            >
              <RefreshCw className={`w-3 h-3 ${resendingAgreement ? "animate-spin" : ""}`} />
              {resendingAgreement ? "Sending..." : "Reset & Resend Agreement"}
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-sm text-gray-500">Not yet signed</p>
          {showInPersonSign && (
            <Button
              size="sm"
              onClick={onStartInPersonSign}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white text-xs min-h-10"
            >
              <PenLine className="w-3 h-3 mr-1" />
              Sign in person
            </Button>
          )}
          {showInPersonSign && (
            <p className="text-xs text-gray-500">
              Review agreement with customer on this device
            </p>
          )}
          {canOverrideAgreement && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleOverrideAgreement}
              disabled={overridingAgreement}
              className="text-xs border-amber-300 text-amber-700 hover:bg-amber-50"
            >
              <PenLine className="w-3 h-3 mr-1" />
              {overridingAgreement ? "Applying Override..." : "Override Signature (Initials)"}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
