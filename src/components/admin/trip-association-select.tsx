"use client";

import { Select } from "@/components/ui/select";
import type { BookingDbRow } from "@/lib/types";
import type { TripAssociation } from "@/lib/documents/trip-association";

export type TuroTripOption = {
  id: string;
  label: string;
  vehicleId?: string | null;
};

type TripAssociationSelectProps = {
  value: TripAssociation;
  onChange: (next: TripAssociation) => void;
  bookings: BookingDbRow[];
  turoTrips: TuroTripOption[];
  className?: string;
};

function tripSelectValue(value: TripAssociation): string {
  if (value.bookingId) return `booking:${value.bookingId}`;
  if (value.blockedDateId) return `turo:${value.blockedDateId}`;
  return "";
}

export function TripAssociationSelect({
  value,
  onChange,
  bookings,
  turoTrips,
  className,
}: TripAssociationSelectProps) {
  const handleChange = (raw: string) => {
    if (!raw) {
      onChange({ bookingId: null, blockedDateId: null });
      return;
    }
    if (raw.startsWith("booking:")) {
      onChange({ bookingId: raw.slice("booking:".length), blockedDateId: null });
      return;
    }
    if (raw.startsWith("turo:")) {
      onChange({ bookingId: null, blockedDateId: raw.slice("turo:".length) });
    }
  };

  return (
    <Select value={tripSelectValue(value)} onChange={(e) => handleChange(e.target.value)} className={className}>
      <option value="">No trip linked</option>
      <optgroup label="Website / manager bookings">
        {bookings
          .filter((b) => ["pending_approval", "pending", "confirmed", "active", "completed"].includes(b.status))
          .sort(
            (a, b) =>
              new Date(b.pickup_date + "T00:00:00").getTime() -
              new Date(a.pickup_date + "T00:00:00").getTime()
          )
          .map((b) => (
            <option key={b.id} value={`booking:${b.id}`}>
              {b.customer_name} — {b.vehicleName || "Vehicle"} ({b.pickup_date})
            </option>
          ))}
      </optgroup>
      {turoTrips.length > 0 ? (
        <optgroup label="Turo trips">
          {turoTrips.map((t) => (
            <option key={t.id} value={`turo:${t.id}`}>
              {t.label}
            </option>
          ))}
        </optgroup>
      ) : null}
    </Select>
  );
}
