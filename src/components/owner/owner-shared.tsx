"use client";

import React from "react";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
} from "@/components/ui/modal";
import { cn } from "@/lib/utils/cn";
import { formatCurrency, formatDate } from "@/lib/utils/date-helpers";
import type {
  OwnerBooking,
  OwnerBookingStatus,
  PayoutStatus,
} from "@/lib/types";

const STATUS_STYLES: Record<OwnerBookingStatus, string> = {
  upcoming: "bg-blue-100 text-blue-700",
  active: "bg-green-100 text-green-700",
  completed: "bg-gray-200 text-gray-700",
  cancelled: "bg-red-100 text-red-700",
};

const STATUS_LABELS: Record<OwnerBookingStatus, string> = {
  upcoming: "Upcoming",
  active: "Active",
  completed: "Completed",
  cancelled: "Cancelled",
};

export function OwnerStatusBadge({ status }: { status: OwnerBookingStatus }) {
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold", STATUS_STYLES[status])}>
      {STATUS_LABELS[status]}
    </span>
  );
}

const PAYOUT_STYLES: Record<PayoutStatus, string> = {
  pending: "bg-amber-100 text-amber-700",
  issued: "bg-indigo-100 text-indigo-700",
  paid: "bg-emerald-100 text-emerald-700",
};

export function PayoutStatusBadge({ status }: { status: PayoutStatus }) {
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize", PAYOUT_STYLES[status])}>
      {status}
    </span>
  );
}

function Row({ label, value, strong, negative }: { label: string; value: string; strong?: boolean; negative?: boolean }) {
  return (
    <div className="flex items-center justify-between py-2">
      <span className={cn("text-sm", strong ? "font-semibold text-gray-900" : "text-gray-500")}>{label}</span>
      <span className={cn("text-sm tabular-nums", strong ? "font-bold text-gray-900" : "text-gray-700", negative && "text-red-600")}>
        {value}
      </span>
    </div>
  );
}

/** Booking detail + payout breakdown shown when an owner clicks a booking. */
export function OwnerBookingDetailModal({
  booking,
  onClose,
}: {
  booking: OwnerBooking | null;
  onClose: () => void;
}) {
  if (!booking) return null;
  return (
    <Modal open={!!booking} onOpenChange={(o) => { if (!o) onClose(); }}>
      <ModalContent className="sm:max-w-md">
        <ModalHeader>
          <ModalTitle>Booking Details</ModalTitle>
        </ModalHeader>

        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate font-semibold text-gray-900">{booking.vehicleName}</p>
              <p className="text-xs text-gray-500">Booking #{booking.id}</p>
            </div>
            <OwnerStatusBadge status={booking.status} />
          </div>

          <div className="rounded-lg bg-gray-50 p-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-gray-500">Rental Dates</span>
              <span className="font-medium text-gray-900">{formatDate(booking.pickupDate)} → {formatDate(booking.returnDate)}</span>
            </div>
            <div className="mt-1 flex items-center justify-between">
              <span className="text-gray-500">Rental Days</span>
              <span className="font-medium text-gray-900">{booking.rentalDays}</span>
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 px-3">
            <p className="pt-3 text-xs font-semibold uppercase tracking-wide text-gray-400">Payout Breakdown</p>
            <Row label="Gross Revenue" value={formatCurrency(booking.grossRevenue)} />
            <Row label="Processing Fees" value={`− ${formatCurrency(booking.processingFees)}`} negative />
            <Row label="Other Expenses" value={`− ${formatCurrency(booking.otherExpenses)}`} negative />
            <div className="border-t border-gray-100">
              <Row label="Net Revenue" value={formatCurrency(booking.netRevenue)} strong />
            </div>
            <Row label={`Platform Fees (${100 - booking.ownerPercentage}%)`} value={`− ${formatCurrency(booking.platformFees)}`} negative />
            <div className="border-t border-gray-100">
              <Row label={`Owner Payout (${booking.ownerPercentage}%)`} value={formatCurrency(booking.ownerPayout)} strong />
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg bg-gray-50 p-3 text-sm">
            <span className="text-gray-500">Payout Status</span>
            <div className="flex items-center gap-2">
              <PayoutStatusBadge status={booking.payoutStatus} />
              {booking.payoutDate && <span className="text-xs text-gray-500">{formatDate(booking.payoutDate)}</span>}
            </div>
          </div>
        </div>
      </ModalContent>
    </Modal>
  );
}
