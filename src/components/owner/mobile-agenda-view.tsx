"use client";

import React, { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import type { OwnerBlockedDate, OwnerBooking, OwnerBookingStatus } from "@/lib/types";
import { formatCurrency, formatDate } from "@/lib/utils/date-helpers";
import { isOwnerTuroBooking } from "@/lib/owner/finance";
import { cn } from "@/lib/utils/cn";
import { AgendaDateStrip } from "@/components/calendar/agenda-date-strip";

function toDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function bookingActiveOnDateKey(booking: OwnerBooking, dateKey: string): boolean {
  const pk = (booking.pickupDate || "").split("T")[0];
  const rk = (booking.returnDate || "").split("T")[0];
  return pk <= dateKey && rk >= dateKey;
}

function blockedActiveOnDateKey(blocked: OwnerBlockedDate, dateKey: string): boolean {
  return blocked.startDate <= dateKey && blocked.endDate >= dateKey;
}

const STATUS_BAR: Record<OwnerBookingStatus, string> = {
  upcoming: "bg-blue-400",
  active: "bg-green-400",
  completed: "bg-gray-400",
  cancelled: "bg-red-400",
};

const STATUS_BADGE: Record<OwnerBookingStatus, string> = {
  upcoming: "bg-blue-100 text-blue-700",
  active: "bg-green-100 text-green-700",
  completed: "bg-gray-100 text-gray-600",
  cancelled: "bg-red-100 text-red-700",
};

interface OwnerMobileAgendaViewProps {
  bookings: OwnerBooking[];
  blockedDates?: OwnerBlockedDate[];
  vehicleId?: string;
  start: Date;
  onPrevious: () => void;
  onNext: () => void;
  onToday: () => void;
  onBookingClick: (booking: OwnerBooking) => void;
  onBlockedDateClick?: (blocked: OwnerBlockedDate) => void;
}

export function OwnerMobileAgendaView({
  bookings,
  blockedDates = [],
  vehicleId,
  start,
  onPrevious,
  onNext,
  onToday,
  onBookingClick,
  onBlockedDateClick,
}: OwnerMobileAgendaViewProps) {
  const [selectedDateKey, setSelectedDateKey] = useState<string>(() => toDateKey(new Date()));

  const days = 7;
  const dateRange = useMemo(
    () =>
      Array.from({ length: days }, (_, i) => {
        const d = new Date(start);
        d.setDate(d.getDate() + i);
        return d;
      }),
    [start]
  );

  const todayKey = useMemo(() => toDateKey(new Date()), []);

  const scopedBookings = useMemo(
    () => bookings.filter((b) => b.status !== "cancelled" && (!vehicleId || b.vehicleId === vehicleId)),
    [bookings, vehicleId]
  );

  const scopedBlocked = useMemo(
    () => blockedDates.filter((b) => !vehicleId || b.vehicleId === vehicleId),
    [blockedDates, vehicleId]
  );

  const bookingsForDate = useMemo(
    () => scopedBookings.filter((b) => bookingActiveOnDateKey(b, selectedDateKey)),
    [scopedBookings, selectedDateKey]
  );

  const blockedForDate = useMemo(
    () => scopedBlocked.filter((b) => blockedActiveOnDateKey(b, selectedDateKey)),
    [scopedBlocked, selectedDateKey]
  );

  const bookingCountByDate = useMemo(() => {
    const counts: Record<string, number> = {};
    dateRange.forEach((d) => {
      const k = toDateKey(d);
      counts[k] = scopedBookings.filter((b) => bookingActiveOnDateKey(b, k)).length;
    });
    return counts;
  }, [scopedBookings, dateRange]);

  useEffect(() => {
    const keys = dateRange.map(toDateKey);
    if (!keys.includes(selectedDateKey)) {
      setSelectedDateKey(keys.includes(todayKey) ? todayKey : keys[0]);
    }
  }, [dateRange, selectedDateKey, todayKey]);

  const stripDays = useMemo(
    () =>
      dateRange.map((date) => {
        const key = toDateKey(date);
        return {
          date: key,
          label: date.toLocaleDateString("en-US", { weekday: "short" }),
          dayNum: date.getDate(),
          isToday: key === todayKey,
          count: bookingCountByDate[key] || 0,
        };
      }),
    [dateRange, todayKey, bookingCountByDate]
  );

  const selectedDate = new Date(`${selectedDateKey}T00:00:00`);

  return (
    <div>
      <div className="mb-4 overflow-hidden rounded-2xl border border-gray-200/60 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-gray-100 px-3 py-2.5">
          <button
            type="button"
            onClick={onPrevious}
            className="rounded-lg p-1.5 transition-colors hover:bg-gray-100 active:bg-gray-200"
            aria-label="Previous week"
          >
            <ChevronLeft className="h-5 w-5 text-gray-600" />
          </button>
          <button
            type="button"
            onClick={onToday}
            className="rounded-full bg-purple-50 px-3 py-1 text-xs font-semibold text-purple-600 transition-colors active:bg-purple-100"
          >
            Today
          </button>
          <button
            type="button"
            onClick={onNext}
            className="rounded-lg p-1.5 transition-colors hover:bg-gray-100 active:bg-gray-200"
            aria-label="Next week"
          >
            <ChevronRight className="h-5 w-5 text-gray-600" />
          </button>
        </div>

        <AgendaDateStrip
          days={stripDays}
          selectedDate={selectedDateKey}
          onSelectDate={setSelectedDateKey}
          className="items-stretch gap-1 px-1.5 py-2"
        />
      </div>

      <div className="mb-3 flex items-center justify-between px-1">
        <h3 className="text-sm font-semibold text-gray-900">
          {selectedDate.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}
        </h3>
        <span className="text-xs font-medium text-gray-400">
          {bookingsForDate.length} booking{bookingsForDate.length !== 1 ? "s" : ""}
        </span>
      </div>

      {bookingsForDate.length === 0 && blockedForDate.length === 0 && (
        <div className="rounded-2xl border border-gray-200/60 bg-white px-6 py-10 text-center">
          <Calendar className="mx-auto mb-2 h-8 w-8 text-gray-300" />
          <p className="text-sm font-medium text-gray-500">No bookings</p>
          <p className="mt-0.5 text-xs text-gray-400">This day is free</p>
        </div>
      )}

      <div className="space-y-2.5">
        {bookingsForDate.map((booking) => {
          const isPickupDay = booking.pickupDate.split("T")[0] === selectedDateKey;
          const isReturnDay = booking.returnDate.split("T")[0] === selectedDateKey;
          const isTuro = isOwnerTuroBooking(booking);

          return (
            <button
              key={booking.id}
              type="button"
              onClick={() => onBookingClick(booking)}
              className="w-full rounded-2xl border border-gray-200 bg-white p-4 text-left transition-all active:scale-[0.98] hover:border-purple-200"
            >
              <div className="flex items-start gap-3">
                <div
                  className={cn(
                    "w-1 shrink-0 self-stretch rounded-full",
                    isTuro ? "bg-teal-400" : STATUS_BAR[booking.status]
                  )}
                />
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <p className="truncate text-[15px] font-semibold text-gray-900">
                      {isTuro ? booking.customerName : booking.vehicleName}
                    </p>
                    {booking.ownerPayout > 0 && (
                      <span className="shrink-0 text-sm font-bold text-gray-900">
                        {formatCurrency(booking.ownerPayout)}
                      </span>
                    )}
                  </div>
                  <p className="mb-2 truncate text-xs text-gray-500">
                    {isTuro ? `${booking.vehicleName} · Turo` : booking.customerName}
                  </p>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="text-gray-500">
                      {isPickupDay && isReturnDay
                        ? "Same-day trip"
                        : isPickupDay
                          ? `Pickup ${formatDate(booking.pickupDate)}`
                          : isReturnDay
                            ? `Return ${formatDate(booking.returnDate)}`
                            : "In rental"}
                    </span>
                    <span className="text-gray-300">·</span>
                    <span className="text-gray-500">{booking.rentalDays}d</span>
                    <span
                      className={cn(
                        "ml-auto rounded-full px-2 py-0.5 text-[10px] font-bold capitalize",
                        isTuro ? "bg-teal-100 text-teal-800" : STATUS_BADGE[booking.status]
                      )}
                    >
                      {isTuro ? "Turo" : booking.status}
                    </span>
                  </div>
                </div>
              </div>
            </button>
          );
        })}

        {blockedForDate.map((bd) => {
          const Wrapper = onBlockedDateClick ? "button" : "div";
          return (
            <Wrapper
              key={bd.id}
              type={onBlockedDateClick ? "button" : undefined}
              onClick={onBlockedDateClick ? () => onBlockedDateClick(bd) : undefined}
              className={cn(
                "rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-4 text-left",
                onBlockedDateClick && "active:scale-[0.98]"
              )}
            >
              <div className="flex items-center gap-3">
                <div className="w-1 shrink-0 self-stretch rounded-full bg-amber-400" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-600">
                    {bd.source === "turo-email" || bd.source === "turo" ? "Turo trip" : "Blocked"}
                    {bd.reason ? ` — ${bd.reason}` : ""}
                  </p>
                  <p className="truncate text-xs text-gray-400">
                    {formatDate(bd.startDate)} → {formatDate(bd.endDate)}
                  </p>
                </div>
              </div>
            </Wrapper>
          );
        })}
      </div>
    </div>
  );
}
