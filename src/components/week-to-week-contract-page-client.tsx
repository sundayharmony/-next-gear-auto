"use client";

import React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AlertCircle, FileText } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageContainer } from "@/components/layout/page-container";
import { WeekToWeekContractViewer } from "@/components/week-to-week-contract-viewer";
import { adminFetch } from "@/lib/utils/admin-fetch";
import type { BookingDbRow } from "@/lib/types";
import {
  parseRecurringBookingMeta,
  WEEKLY_DUE_DAY_OPTIONS,
  type WeeklyDueDay,
} from "@/lib/utils/recurring-booking";

interface VehicleContractInfo {
  make: string;
  model: string;
  year: number;
  licensePlate?: string;
  vin?: string;
  color?: string;
  mileage?: number;
}

const toVehicleContractInfo = (raw: Record<string, unknown> | null): VehicleContractInfo | null => {
  if (!raw) return null;
  const make = String(raw.make || "").trim();
  const model = String(raw.model || "").trim();
  const year = Number(raw.year || 0);
  if (!make || !model || !Number.isFinite(year) || year <= 0) return null;

  return {
    make,
    model,
    year,
    licensePlate: (raw.licensePlate as string) || (raw.license_plate as string) || undefined,
    vin: (raw.vin as string) || undefined,
    color: (raw.color as string) || undefined,
    mileage: Number.isFinite(Number(raw.mileage)) ? Number(raw.mileage) : undefined,
  };
};

const resolveWeeklyDueDay = (raw: string | null): WeeklyDueDay | undefined => {
  if (!raw) return undefined;
  return WEEKLY_DUE_DAY_OPTIONS.find((day) => day.toLowerCase() === raw.toLowerCase());
};

export function WeekToWeekContractPageClient() {
  const searchParams = useSearchParams();
  const bookingId = searchParams.get("bookingId");
  const dueDayOverride = resolveWeeklyDueDay(searchParams.get("weeklyDueDay"));

  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [booking, setBooking] = React.useState<BookingDbRow | null>(null);
  const [vehicle, setVehicle] = React.useState<VehicleContractInfo | null>(null);
  const [weeklyDueDay, setWeeklyDueDay] = React.useState<WeeklyDueDay | undefined>(dueDayOverride);

  React.useEffect(() => {
    let cancelled = false;

    const loadContractContext = async () => {
      if (!bookingId) {
        setError("Missing bookingId. Open this contract from the booking list or booking detail panel.");
        setLoading(false);
        return;
      }

      try {
        const bookingRes = await adminFetch(`/api/bookings?id=${encodeURIComponent(bookingId)}`);
        if (!bookingRes.ok) {
          setError("Booking not found or access denied.");
          setLoading(false);
          return;
        }
        const bookingData = await bookingRes.json();
        const bookingRow = (bookingData?.data || null) as BookingDbRow | null;
        if (!bookingRow) {
          setError("Booking data could not be loaded.");
          setLoading(false);
          return;
        }

        const recurringMeta = parseRecurringBookingMeta(bookingRow.admin_notes);
        if (!recurringMeta.isRecurringLongTerm) {
          setError("This booking is not marked as Recurring Long-Term.");
          setLoading(false);
          return;
        }

        const vehicleRes = await adminFetch(
          `/api/admin/vehicles/${encodeURIComponent(bookingRow.vehicle_id)}`
        );
        if (!vehicleRes.ok) {
          setError("Vehicle details could not be loaded for this booking.");
          setLoading(false);
          return;
        }
        const vehicleData = await vehicleRes.json();
        const vehicleRow = toVehicleContractInfo(
          (vehicleData?.data || null) as Record<string, unknown> | null
        );

        if (!cancelled) {
          setBooking(bookingRow);
          setVehicle(vehicleRow);
          setWeeklyDueDay(dueDayOverride || recurringMeta.weeklyDueDay);
          setError(null);
          setLoading(false);
        }
      } catch {
        if (!cancelled) {
          setError("Failed to load week-to-week contract context.");
          setLoading(false);
        }
      }
    };

    void loadContractContext();

    return () => {
      cancelled = true;
    };
  }, [bookingId, dueDayOverride]);

  if (loading) {
    return (
      <PageContainer className="py-16">
        <div className="mx-auto max-w-xl text-center text-gray-500">Loading contract...</div>
      </PageContainer>
    );
  }

  if (error || !booking || !vehicle) {
    return (
      <PageContainer className="py-16">
        <div className="mx-auto max-w-xl rounded-xl border border-red-200 bg-red-50 p-6 text-center">
          <AlertCircle className="mx-auto mb-3 h-8 w-8 text-red-500" />
          <p className="text-sm text-red-700">{error || "Unable to open contract."}</p>
          <Link href="/admin/bookings" className="mt-4 inline-block">
            <Button variant="outline">Back to Bookings</Button>
          </Link>
        </div>
      </PageContainer>
    );
  }

  return (
    <>
      <section className="bg-gradient-to-br from-purple-900 to-gray-900 py-14 text-white">
        <div className="mx-auto max-w-5xl px-4 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-purple-500/20">
            <FileText className="h-6 w-6 text-purple-200" />
          </div>
          <h1 className="text-3xl font-bold sm:text-4xl">Week-to-Week Long-Term Contract</h1>
          <p className="mx-auto mt-3 max-w-3xl text-purple-100">
            Generated from booking <span className="font-semibold">{booking.id}</span> for recurring long-term rental terms.
          </p>
        </div>
      </section>

      <PageContainer className="py-8">
        <div className="mx-auto max-w-4xl space-y-4">
          <Card>
            <CardContent className="p-4 sm:p-6">
              <p className="mb-4 text-sm text-gray-600">
                This contract is prefilled from the selected booking and stays aligned with the booking schedule.
              </p>
              <WeekToWeekContractViewer
                vehicle={vehicle}
                weeklyPrice={booking.total_price || 0}
                customerName={booking.customer_name}
                customerEmail={booking.customer_email}
                customerPhone={booking.customer_phone}
                pickupDate={booking.pickup_date}
                returnDate={booking.return_date}
                pickupTime={booking.pickup_time}
                returnTime={booking.return_time}
                weeklyDueDay={weeklyDueDay}
              />
            </CardContent>
          </Card>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link href={`/admin/bookings?booking=${encodeURIComponent(booking.id)}`}>
              <Button>Back to Booking</Button>
            </Link>
            <Link href="/admin/bookings">
              <Button variant="outline">All Bookings</Button>
            </Link>
          </div>
        </div>
      </PageContainer>
    </>
  );
}
