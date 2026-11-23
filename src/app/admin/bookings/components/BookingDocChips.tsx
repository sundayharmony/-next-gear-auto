import React from "react";
import { AlertTriangle, CircleDollarSign, StickyNote } from "lucide-react";
import { isAgreementComplete } from "@/lib/agreement/agreement-complete";
import { cn } from "@/lib/utils/cn";
import type { BookingRow } from "../types";

function Chip({ ok, label, missingLabel }: { ok: boolean; label: string; missingLabel: string }) {
  return (
    <span
      title={ok ? `${label} on file` : missingLabel}
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium leading-4 whitespace-nowrap",
        ok ? "bg-green-50 border-green-200 text-green-700" : "bg-amber-50 border-amber-200 text-amber-700",
      )}
    >
      <span aria-hidden>{ok ? "✓" : "!"}</span>
      <span>{ok ? label : missingLabel}</span>
    </span>
  );
}

/**
 * Labeled paperwork status for a booking row: ID, insurance proof, signed agreement,
 * plus overdue / payment / notes flags. Replaces the unlabeled icon cluster.
 */
export default function BookingDocChips({ booking, turo }: { booking: BookingRow; turo?: boolean }) {
  const closed = booking.status === "cancelled" || booking.status === "completed";
  return (
    <div className="flex flex-wrap items-center gap-1">
      {!turo && (
        <>
          {(!closed || booking.id_document_url) && <Chip ok={Boolean(booking.id_document_url)} label="ID" missingLabel="No ID" />}
          {(!closed || booking.insurance_proof_url) && (
            <Chip ok={Boolean(booking.insurance_proof_url)} label="Insurance" missingLabel="No insurance" />
          )}
          {(!closed || isAgreementComplete(booking)) && (
            <Chip ok={isAgreementComplete(booking)} label="Signed" missingLabel="Unsigned" />
          )}
        </>
      )}
      {booking.is_overdue && (
        <span title="Return overdue" className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-[11px] font-medium text-red-700">
          <AlertTriangle size={11} aria-hidden /> Overdue
        </span>
      )}
      {booking.is_payment_overdue && (
        <span title="Weekly payment due" className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700">
          <CircleDollarSign size={11} aria-hidden /> Pay due
        </span>
      )}
      {booking.admin_notes && (
        <span title="Has admin notes" aria-label="Has admin notes" className="text-yellow-600">
          <StickyNote size={13} />
        </span>
      )}
    </div>
  );
}
