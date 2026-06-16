"use client";

import React, { useEffect, useState, useMemo } from "react";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import type { VehicleListItem } from "@/lib/types";
import { formatTime } from "@/lib/utils/date-helpers";
import { statusBgColors, statusBorderColors } from "@/lib/utils/status-colors";
import type { BlockedDateEntry } from "./calendar-model";
import {
  bookingActiveOnDateKey,
  getCalendarPickupDateKey,
  getCalendarReturnDateKey,
} from "./calendar-booking-display";
import type { BookingRow as AdminBookingRow } from "@/app/admin/bookings/types";
import { AgendaDateStrip } from "@/components/calendar/agenda-date-strip";

type CalendarBookingRow = AdminBookingRow;
type Vehicle = VehicleListItem;
interface MobileAgendaViewProps {
  bookings: CalendarBookingRow[];
  vehicles: Vehicle[];
  blockedDates: BlockedDateEntry[];
  start: Date;
  onPrevious: () => void;
  onNext: () => void;
  onToday: () => void;
  onBookingClick: (booking: CalendarBookingRow) => void;
  onBlockedDateClick: (blocked: BlockedDateEntry) => void;
}

export function MobileAgendaView({
  bookings,
  vehicles,
  blockedDates,
  start,
  onPrevious,
  onNext,
  onToday,
  onBookingClick,
  onBlockedDateClick,
}: MobileAgendaViewProps) {
  const [selectedDateKey, setSelectedDateKey] = useState<string>(() => {
    const t = new Date();
    return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`;
  });

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

  const toKey = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${dd}`;
  };

  const todayKey = useMemo(() => toKey(new Date()), []);

  // Build a vehicle lookup
  const vehicleMap = useMemo(() => {
    const m: Record<string, Vehicle> = {};
    vehicles.forEach((v) => { m[v.id] = v; });
    return m;
  }, [vehicles]);

  // Bookings active on a specific date
  const bookingsForDate = useMemo(() => {
    return bookings.filter((b) => bookingActiveOnDateKey(b, selectedDateKey));
  }, [bookings, selectedDateKey]);

  // Blocked dates for selected day
  const blockedForDate = useMemo(() => {
    return blockedDates.filter((bd) => bd.start_date <= selectedDateKey && bd.end_date >= selectedDateKey);
  }, [blockedDates, selectedDateKey]);

  // Count bookings touching each date in the strip
  const bookingCountByDate = useMemo(() => {
    const counts: Record<string, number> = {};
    dateRange.forEach((d) => {
      const k = toKey(d);
      counts[k] = bookings.filter((b) => bookingActiveOnDateKey(b, k)).length;
    });
    return counts;
  }, [bookings, dateRange]);

  // Ensure selected date stays within range when navigating
  useEffect(() => {
    const keys = dateRange.map(toKey);
    if (!keys.includes(selectedDateKey)) {
      setSelectedDateKey(keys.includes(todayKey) ? todayKey : keys[0]);
    }
  }, [dateRange, selectedDateKey, todayKey]);

  const stripDays = useMemo(
    () =>
      dateRange.map((date) => {
        const key = toKey(date);
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

  const selectedDate = new Date(selectedDateKey + "T00:00:00");

  return (
    <div>
      {/* Date navigation + date strip */}
      <div className="bg-white rounded-2xl border border-gray-200/60 shadow-sm overflow-hidden mb-4">
        {/* Nav row */}
        <div className="flex items-center justify-between px-3 py-2.5 border-b border-gray-100">
          <button
            onClick={onPrevious}
            className="p-1.5 rounded-lg hover:bg-gray-100 active:bg-gray-200 transition-colors"
            aria-label="Previous week"
          >
            <ChevronLeft className="w-5 h-5 text-gray-600" />
          </button>
          <button
            onClick={onToday}
            className="text-xs font-semibold text-purple-600 px-3 py-1 rounded-full bg-purple-50 active:bg-purple-100 transition-colors"
          >
            Today
          </button>
          <button
            onClick={onNext}
            className="p-1.5 rounded-lg hover:bg-gray-100 active:bg-gray-200 transition-colors"
            aria-label="Next week"
          >
            <ChevronRight className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Scrollable date strip */}
        <AgendaDateStrip
          days={stripDays}
          selectedDate={selectedDateKey}
          onSelectDate={setSelectedDateKey}
          className="items-stretch px-1.5 py-2 gap-1"
        />
      </div>

      {/* Selected date label */}
      <div className="flex items-center justify-between mb-3 px-1">
        <h3 className="text-sm font-semibold text-gray-900">
          {selectedDate.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}
        </h3>
        <span className="text-xs text-gray-400 font-medium">
          {bookingsForDate.length} booking{bookingsForDate.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Booking cards */}
      {bookingsForDate.length === 0 && blockedForDate.length === 0 && (
        <div className="bg-white rounded-2xl border border-gray-200/60 px-6 py-10 text-center">
          <Calendar className="w-8 h-8 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-500 font-medium">No bookings</p>
          <p className="text-xs text-gray-400 mt-0.5">This day is free</p>
        </div>
      )}

      <div className="space-y-2.5">
        {bookingsForDate.map((booking) => {
          const vehicle = vehicleMap[booking.vehicle_id];
          const pickupKey = getCalendarPickupDateKey(booking);
          const returnKey = getCalendarReturnDateKey(booking);
          const totalDays = pickupKey && returnKey
            ? Math.ceil((new Date(returnKey).getTime() - new Date(pickupKey).getTime()) / 86400000) + 1
            : 1;
          const isPickupDay = pickupKey === selectedDateKey;
          const isReturnDay = returnKey === selectedDateKey;

          return (
            <button
              key={booking.id}
              onClick={() => onBookingClick(booking)}
              className={`w-full text-left rounded-2xl border ${statusBorderColors[booking.status] || "border-gray-200"} ${statusBgColors[booking.status] || "bg-white"} p-4 active:scale-[0.98] transition-all`}
            >
              <div className="flex items-start gap-3">
                {/* Status bar */}
                <div className={`w-1 self-stretch rounded-full shrink-0 ${
                  booking.status === "pending" ? "bg-yellow-400" :
                  booking.status === "confirmed" ? "bg-green-400" :
                  booking.status === "active" ? "bg-blue-400" :
                  booking.status === "completed" ? "bg-gray-400" :
                  booking.status === "no-show" ? "bg-orange-400" : "bg-gray-300"
                }`} />

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <p className="text-[15px] font-semibold text-gray-900 truncate">
                      {booking.customer_name || "Unknown"}
                    </p>
                    <span className="text-sm font-bold text-gray-900 shrink-0">
                      ${(booking.total_price ?? 0).toFixed(0)}
                    </span>
                  </div>

                  <p className="text-xs text-gray-500 truncate mb-2">
                    {vehicle ? `${vehicle.year} ${vehicle.make} ${vehicle.model}` : booking.vehicleName || "Unknown Vehicle"}
                  </p>

                  <div className="flex items-center gap-3 text-xs">
                    {/* Time info */}
                    <div className="flex items-center gap-1.5 text-gray-600">
                      {isPickupDay && booking.pickup_time && (
                        <span className="font-semibold text-green-700">
                          Pickup {formatTime(booking.pickup_time)}
                        </span>
                      )}
                      {isReturnDay && !isPickupDay && booking.return_time && (
                        <span className="font-semibold text-blue-700">
                          Return {formatTime(booking.return_time)}
                        </span>
                      )}
                      {isPickupDay && isReturnDay && booking.return_time && (
                        <>
                          <span className="text-gray-400 mx-0.5" aria-hidden>→</span>
                          <span className="font-semibold text-blue-700">
                            {formatTime(booking.return_time)}
                          </span>
                        </>
                      )}
                      {!isPickupDay && !isReturnDay && (
                        <span className="text-gray-500">In rental</span>
                      )}
                    </div>

                    <span className="text-gray-300">·</span>
                    <span className="text-gray-500">{totalDays}d</span>

                    {/* Status badge */}
                    <span className={`ml-auto capitalize text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      booking.status === "pending" ? "bg-yellow-100 text-yellow-700" :
                      booking.status === "confirmed" ? "bg-green-100 text-green-700" :
                      booking.status === "active" ? "bg-blue-100 text-blue-700" :
                      booking.status === "completed" ? "bg-gray-100 text-gray-600" :
                      booking.status === "no-show" ? "bg-orange-100 text-orange-700" :
                      "bg-gray-100 text-gray-600"
                    }`}>
                      {booking.status}
                    </span>
                  </div>
                </div>
              </div>
            </button>
          );
        })}

        {/* Blocked date indicators */}
        {blockedForDate.map((bd) => {
          const vehicle = vehicleMap[bd.vehicle_id];
          return (
            <button
              key={bd.id}
              onClick={() => onBlockedDateClick(bd)}
              className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-4"
            >
              <div className="flex items-center gap-3">
                <div className="w-1 self-stretch rounded-full bg-gray-300 shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-500">
                    {bd.source === "turo-email" ? "Turo Trip" : "Manual block"}
                    {bd.reason ? ` — ${bd.reason}` : ""}
                  </p>
                  <p className="text-xs text-gray-400 truncate">
                    {vehicle ? `${vehicle.year} ${vehicle.make} ${vehicle.model}` : "Unknown vehicle"}
                  </p>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
