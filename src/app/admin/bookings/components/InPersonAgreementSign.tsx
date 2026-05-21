"use client";

import React, { useMemo, useState } from "react";
import { CheckCircle2, PenLine, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AgreementSigningWizard,
  type AgreementSigningVehicle,
} from "@/components/agreement-signing-wizard";
import { vehicleForSigningFromDisplayName } from "@/lib/agreement/vehicle-for-signing";
import { adminFetch } from "@/lib/utils/admin-fetch";
import type { BookingRow, Vehicle } from "../types";

interface InPersonAgreementSignProps {
  booking: BookingRow;
  vehicles: Vehicle[];
  onClose: () => void;
  onSigned: (updated: Pick<BookingRow, "agreement_signed_at" | "rental_agreement_url" | "signed_name">) => void;
}

function mapVehicle(v: Vehicle | undefined, vehicleName: string): AgreementSigningVehicle {
  if (v) {
    return {
      make: v.make,
      model: v.model,
      year: v.year,
    };
  }
  return vehicleForSigningFromDisplayName(vehicleName);
}

export function InPersonAgreementSign({
  booking,
  vehicles,
  onClose,
  onSigned,
}: InPersonAgreementSignProps) {
  const [done, setDone] = useState(false);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [signedFields, setSignedFields] = useState<
    Pick<BookingRow, "agreement_signed_at" | "rental_agreement_url" | "signed_name"> | null
  >(null);

  const vehicle = useMemo(
    () => mapVehicle(vehicles.find((v) => v.id === booking.vehicle_id), booking.vehicleName),
    [vehicles, booking.vehicle_id, booking.vehicleName],
  );

  const handleSubmit = async (signatures: Record<string, string>) => {
    const res = await adminFetch("/api/admin/bookings/sign-agreement", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bookingId: booking.id, signatures }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.message || "Failed to sign agreement");
    }

    const signedAt = data.data?.signedAt || data.data?.agreement_signed_at;
    const url = data.data?.url || data.data?.rental_agreement_url;
    setSignedUrl(url ?? null);
    setSignedFields({
      agreement_signed_at: signedAt,
      rental_agreement_url: url,
      signed_name: data.data?.signed_name || booking.customer_name,
    });
    setDone(true);
  };

  const handleDone = () => {
    if (signedFields) onSigned(signedFields);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[110] flex flex-col bg-white">
      <div className="shrink-0 border-b border-purple-500/20 page-hero page-hero--compact text-white px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <PenLine className="h-5 w-5 shrink-0 page-hero-subtitle" />
              <h2 className="text-lg font-semibold truncate">Sign in person</h2>
            </div>
            <p className="text-sm page-hero-subtitle mt-0.5 truncate">
              {booking.customer_name} — {booking.vehicleName}
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-white hover:bg-white/10 shrink-0"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto overscroll-contain px-3 py-4">
        {done ? (
          <div className="max-w-md mx-auto text-center py-12 space-y-4">
            <CheckCircle2 className="mx-auto h-14 w-14 text-green-500" />
            <h3 className="text-xl font-semibold text-gray-900">Agreement signed</h3>
            <p className="text-sm text-gray-600">
              The rental agreement was saved. The customer will receive a copy by email.
            </p>
            {signedUrl && (
              <a
                href={signedUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block text-sm text-purple-600 hover:underline"
              >
                View signed PDF
              </a>
            )}
            <Button type="button" onClick={handleDone} className="w-full max-w-xs">
              Done
            </Button>
          </div>
        ) : (
          <AgreementSigningWizard
            compact
            booking={{
              customer_name: booking.customer_name,
              customer_email: booking.customer_email,
              customer_phone: booking.customer_phone,
              pickup_date: booking.pickup_date,
              return_date: booking.return_date,
              pickup_time: booking.pickup_time,
              return_time: booking.return_time,
              total_price: booking.total_price ?? 0,
              deposit: booking.deposit ?? undefined,
            }}
            vehicle={vehicle}
            headerNote="Hand device to customer to review and sign each section."
            submitLabel="Complete in-person signature"
            onCancel={onClose}
            onSubmit={handleSubmit}
          />
        )}
      </div>
    </div>
  );
}
