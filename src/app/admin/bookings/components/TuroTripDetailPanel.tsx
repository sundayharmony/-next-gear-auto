"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { X, Car, MapPin, DollarSign } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate, formatTime } from "@/lib/utils/date-helpers";
import { getTuroDriverFromReason, resolveTuroTripRevenue } from "@/lib/utils/turo-blocked-date";
import type { BookingRow } from "../types";
import { getStaffVehicleDetailsHref } from "@/lib/admin/staff-vehicle-links";

function isTuroRow(b: BookingRow): boolean {
  return b.occupancy_kind === "turo" || (typeof b.id === "string" && b.id.startsWith("turo:"));
}

interface TuroTripDetailPanelProps {
  booking: BookingRow;
  onClose: () => void;
}

export function TuroTripDetailPanel({ booking, onClose }: TuroTripDetailPanelProps) {
  const pathname = usePathname();
  if (!isTuroRow(booking)) return null;

  const driver = getTuroDriverFromReason(booking.turo_reason ?? null) || booking.customer_name || "Turo";
  const revenue =
    typeof booking.total_price === "number" && booking.total_price > 0
      ? booking.total_price
      : resolveTuroTripRevenue({ earnings: null, reason: booking.turo_reason ?? null });
  const showMoney = booking.canViewPricing !== false && revenue > 0;

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/50" onClick={onClose} aria-hidden />
      <div
        className="w-full max-w-[calc(100vw-1rem)] sm:max-w-lg bg-white shadow-xl overflow-y-auto"
        role="dialog"
        aria-modal="true"
        aria-label="Turo trip details"
      >
        <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge className="bg-teal-100 text-teal-800">Turo trip</Badge>
            <h2 className="text-lg font-semibold text-gray-900">Trip details</h2>
          </div>
          <button type="button" onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 -mr-2" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <p className="text-xs text-gray-500">Vehicle</p>
            <Link
              href={getStaffVehicleDetailsHref(booking.vehicle_id, pathname)}
              className="font-semibold text-purple-700 hover:underline inline-flex items-center gap-1"
            >
              <Car className="h-4 w-4 shrink-0" />
              {booking.vehicleName || "Unknown vehicle"}
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-500">Pickup</p>
              <p className="font-medium">{formatDate(booking.pickup_date)}</p>
              <p className="text-sm text-gray-500">
                {booking.pickup_time ? formatTime(booking.pickup_time) : "Time not provided"}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Return</p>
              <p className="font-medium">{formatDate(booking.return_date)}</p>
              <p className="text-sm text-gray-500">
                {booking.return_time ? formatTime(booking.return_time) : "Time not provided"}
              </p>
            </div>
          </div>

          <div>
            <p className="text-xs text-gray-500">Driver</p>
            <p className="font-medium">{driver}</p>
          </div>

          <div>
            <p className="text-xs text-gray-500">Status</p>
            <Badge className={`mt-1 ${booking.status === "cancelled" ? "bg-red-100 text-red-800" : ""}`}>
              {booking.status}
            </Badge>
            {booking.status === "cancelled" && (
              <p className="text-xs text-red-600 mt-1">This Turo trip was cancelled and no longer blocks the calendar.</p>
            )}
          </div>

          <div>
            <p className="text-xs text-gray-500 flex items-center gap-1">
              <MapPin className="h-3 w-3" /> Pickup location
            </p>
            <p className="font-medium">{booking.turo_location || "Not available"}</p>
          </div>

          <div>
            <p className="text-xs text-gray-500 flex items-center gap-1">
              <DollarSign className="h-3 w-3" /> Earnings
            </p>
            <p className="font-medium">{showMoney ? `$${revenue.toFixed(2)}` : "Hidden"}</p>
          </div>

          {booking.turo_is_extension ? (
            <div className="rounded-md border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">
              Extension detected for this Turo trip.
            </div>
          ) : null}

          {booking.turo_reason ? (
            <div>
              <p className="text-xs text-gray-500">Notes</p>
              <p className="text-sm text-gray-800 whitespace-pre-wrap">{booking.turo_reason}</p>
            </div>
          ) : null}

          <div className="pt-4 border-t border-gray-200 flex flex-wrap gap-2">
            <Link href={`${pathname.startsWith("/manager") ? "/manager" : "/admin"}/blocked-dates`}>
              <Button type="button" size="sm" variant="outline">
                Open blocked dates
              </Button>
            </Link>
            <Link href={getStaffVehicleDetailsHref(booking.vehicle_id, pathname)}>
              <Button type="button" size="sm" variant="default">
                Vehicle page
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
