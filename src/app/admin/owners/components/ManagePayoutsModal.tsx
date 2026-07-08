"use client";

import React, { useCallback, useEffect, useState } from "react";
import { DollarSign, Loader2 } from "lucide-react";
import {
  Modal,
  ModalContent,
  ModalDescription,
  ModalHeader,
  ModalTitle,
} from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { adminFetch } from "@/lib/utils/admin-fetch";
import { useNotification } from "@/lib/context/notification-context";
import { formatCurrency, formatDate } from "@/lib/utils/date-helpers";
import {
  PayoutStatusBadge,
  OwnerStatusBadge,
} from "@/components/owner/owner-shared";
import type { OwnerBooking, PayoutStatus } from "@/lib/types";
import { isOwnerTuroBooking } from "@/lib/owner/finance";
import { Badge } from "@/components/ui/badge";

export interface PayoutsOwnerRef {
  id: string;
  name: string;
}

export function ManagePayoutsModal({
  owner,
  onClose,
  onChanged,
}: {
  owner: PayoutsOwnerRef | null;
  onClose: () => void;
  onChanged: () => void;
}) {
  const { showToast } = useNotification();
  const [bookings, setBookings] = useState<OwnerBooking[]>([]);
  const [turoTrips, setTuroTrips] = useState<OwnerBooking[]>([]);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(
    async (ownerId: string) => {
      setLoading(true);
      try {
        const res = await adminFetch(`/api/admin/owner-payouts?ownerId=${encodeURIComponent(ownerId)}`);
        const json = await res.json();
        if (json.success) {
          const rows = (json.data || []) as OwnerBooking[];
          setBookings(rows.filter((b) => !isOwnerTuroBooking(b)));
          setTuroTrips(rows.filter((b) => isOwnerTuroBooking(b)));
        } else {
          showToast("error", "Load failed", json.message || "Could not load payouts.");
        }
      } catch {
        showToast("error", "Load failed", "Could not load payouts.");
      } finally {
        setLoading(false);
      }
    },
    [showToast]
  );

  useEffect(() => {
    if (owner) load(owner.id);
    else {
      setBookings([]);
      setTuroTrips([]);
    }
  }, [owner, load]);

  const updateStatus = async (booking: OwnerBooking, status: PayoutStatus) => {
    if (isOwnerTuroBooking(booking)) {
      showToast("error", "Not supported", "Payouts apply to website bookings only, not Turo trips.");
      return;
    }
    setBusyId(booking.id);
    try {
      const res = await adminFetch("/api/admin/owner-payouts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId: booking.id, status }),
      });
      const json = await res.json();
      if (json.success) {
        showToast("success", "Payout updated", `Marked ${status}.`);
        if (owner) await load(owner.id);
        onChanged();
      } else {
        showToast("error", "Update failed", json.message || "Try again.");
      }
    } catch {
      showToast("error", "Update failed", "Network error.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Modal open={!!owner} onOpenChange={(o) => { if (!o) onClose(); }}>
      <ModalContent className="sm:max-w-2xl">
        <ModalHeader>
          <ModalTitle>{owner ? `Payouts — ${owner.name}` : "Payouts"}</ModalTitle>
          <ModalDescription>
            Website bookings can be marked pending, issued, or paid. Turo trips are listed for reference only — payouts are handled by Turo.
          </ModalDescription>
        </ModalHeader>
        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-7 w-7 animate-spin text-purple-600" />
          </div>
        ) : bookings.length === 0 && turoTrips.length === 0 ? (
          <p className="py-8 text-center text-sm text-gray-500">No bookings for this owner&apos;s vehicles.</p>
        ) : (
          <div className="max-h-[60vh] space-y-4 overflow-y-auto">
            {bookings.length > 0 ? (
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Website bookings ({bookings.length})
                </p>
                {bookings.map((b) => (
                  <div key={b.id} className="rounded-lg border border-gray-200 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-gray-900">{b.vehicleName}</p>
                        <p className="text-xs text-gray-500">
                          {formatDate(b.pickupDate)} → {formatDate(b.returnDate)}
                        </p>
                      </div>
                      <OwnerStatusBadge status={b.status} />
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 text-sm">
                        <DollarSign className="h-4 w-4 text-purple-600" />
                        <span className="font-semibold tabular-nums text-gray-900">
                          {formatCurrency(b.ownerPayout)}
                        </span>
                        <PayoutStatusBadge status={b.payoutStatus} />
                      </div>
                      <div className="flex gap-1">
                        {(["pending", "issued", "paid"] as PayoutStatus[]).map((s) => (
                          <Button
                            key={s}
                            size="sm"
                            variant={b.payoutStatus === s ? "default" : "ghost"}
                            disabled={busyId === b.id}
                            onClick={() => updateStatus(b, s)}
                            className="capitalize"
                          >
                            {s}
                          </Button>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="rounded-lg border border-dashed border-gray-200 px-3 py-4 text-center text-sm text-gray-500">
                No website bookings to manage. Turo trips below are paid through Turo directly.
              </p>
            )}

            {turoTrips.length > 0 ? (
              <div className="space-y-2 border-t border-gray-100 pt-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Turo trips ({turoTrips.length}) — not manageable here
                </p>
                {turoTrips.map((b) => (
                  <div key={b.id} className="rounded-lg border border-teal-100 bg-teal-50/40 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-gray-900">{b.vehicleName}</p>
                        <p className="text-xs text-gray-500">
                          {formatDate(b.pickupDate)} → {formatDate(b.returnDate)} · {b.customerName}
                        </p>
                      </div>
                      <Badge className="border-teal-200 bg-teal-100 text-teal-800">Turo</Badge>
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-2 text-sm">
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-teal-600" />
                        <span className="font-semibold tabular-nums text-gray-900">
                          {formatCurrency(b.ownerPayout)}
                        </span>
                        <span className="text-xs text-gray-500">est. owner share</span>
                      </div>
                      <OwnerStatusBadge status={b.status} />
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        )}
      </ModalContent>
    </Modal>
  );
}
