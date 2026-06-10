"use client";

import React from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatTime, formatDate, getLocalYmd } from "@/lib/utils/date-helpers";
import { statusColors, statusBgColors, statusBorderColors } from "@/lib/utils/status-colors";
import { getStaffVehicleDetailsHref } from "@/lib/admin/staff-vehicle-links";
import { useStaffPanelConfig } from "@/lib/hooks/use-staff-panel-config";
import type { BlockedDateEntry } from "./calendar-model";
import {
  getCalendarPickupDateKey,
  getCalendarReturnDateKey,
} from "./calendar-booking-display";
import type { BookingRow as AdminBookingRow } from "@/app/admin/bookings/types";

type CalendarBookingRow = AdminBookingRow;

export interface MonthGridProps {
  bookings: CalendarBookingRow[];
  blockedDates: BlockedDateEntry[];
  currentMonth: Date;
  onPreviousMonth: () => void;
  onNextMonth: () => void;
  selectedDay: string | null;
  onSelectDay: (day: string | null) => void;
  onBookingClick: (booking: CalendarBookingRow) => void;
  onBlockedDateClick: (blocked: BlockedDateEntry) => void;
  onMonthWheel: (direction: number) => void;
}
export function MonthGrid({
  bookings,
  blockedDates,
  currentMonth,
  onPreviousMonth,
  onNextMonth,
  selectedDay,
  onSelectDay,
  onBookingClick,
  onBlockedDateClick,
  onMonthWheel,
}: MonthGridProps) {
  const panelConfig = useStaffPanelConfig();
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startingDayOfWeek = new Date(year, month, 1).getDay();

  // Create calendar grid
  const calendarDays: (number | null)[] = [];
  for (let i = 0; i < startingDayOfWeek; i++) {
    calendarDays.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    calendarDays.push(i);
  }
  while (calendarDays.length % 7 !== 0) {
    calendarDays.push(null);
  }

  // Get bookings for each day
  const bookingsByDay: Record<string, CalendarBookingRow[]> = {};
  bookings.forEach((booking) => {
    const pickupDate = new Date(getCalendarPickupDateKey(booking) + "T00:00:00");
    const returnDate = new Date(getCalendarReturnDateKey(booking) + "T00:00:00");
    const pickupDateOnly = new Date(
      pickupDate.getFullYear(),
      pickupDate.getMonth(),
      pickupDate.getDate()
    );
    const returnDateOnly = new Date(
      returnDate.getFullYear(),
      returnDate.getMonth(),
      returnDate.getDate()
    );

    const currentDate = new Date(pickupDateOnly);
    while (currentDate <= returnDateOnly) {
      const dateKey = getLocalYmd(currentDate);
      if (!bookingsByDay[dateKey]) {
        bookingsByDay[dateKey] = [];
      }
      bookingsByDay[dateKey].push(booking);
      currentDate.setDate(currentDate.getDate() + 1);
    }
  });

  const blockedByDay: Record<string, BlockedDateEntry[]> = {};
  blockedDates.forEach((block) => {
    const start = new Date(block.start_date + "T00:00:00");
    const end = new Date(block.end_date + "T00:00:00");
    const current = new Date(start.getFullYear(), start.getMonth(), start.getDate());
    const endOnly = new Date(end.getFullYear(), end.getMonth(), end.getDate());
    while (current <= endOnly) {
      const dateKey = getLocalYmd(current);
      if (!blockedByDay[dateKey]) blockedByDay[dateKey] = [];
      blockedByDay[dateKey].push(block);
      current.setDate(current.getDate() + 1);
    }
  });

  const selectedDayBookings = selectedDay ? (bookingsByDay[selectedDay] || []) : [];
  const selectedDayBlocked = selectedDay ? (blockedByDay[selectedDay] || []) : [];

  const handleMonthWheel = (event: React.WheelEvent<HTMLDivElement>) => {
    if (Math.abs(event.deltaY) < 12 || Math.abs(event.deltaX) > Math.abs(event.deltaY)) return;
    event.preventDefault();
    onMonthWheel(event.deltaY > 0 ? 1 : -1);
  };

  return (
    <Card>
      <CardContent className="p-6" onWheel={handleMonthWheel}>
        {/* Month Navigation */}
        <div className="flex items-center justify-between mb-6">
          <Button onClick={onPreviousMonth} variant="outline" size="sm">
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <h2 className="text-lg font-semibold text-gray-900 min-w-48 text-center select-none">
            {currentMonth.toLocaleDateString("en-US", {
              month: "long",
              year: "numeric",
            })}
          </h2>
          <Button onClick={onNextMonth} variant="outline" size="sm">
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        {/* Calendar Grid */}
        <div className="mb-6">
          {/* Day Headers */}
          <div className="grid grid-cols-7 gap-px mb-px bg-gray-200 rounded-lg overflow-hidden">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day, i) => (
              <div
                key={day}
                className="bg-purple-50 p-1.5 sm:p-3 text-center font-semibold text-[10px] sm:text-xs text-gray-700"
              >
                <span className="sm:hidden">{["S","M","T","W","T","F","S"][i]}</span>
                <span className="hidden sm:inline">{day}</span>
              </div>
            ))}
          </div>

          {/* Calendar Days */}
          <div className="grid grid-cols-7 gap-px bg-gray-200 p-px rounded-lg overflow-hidden">
            {calendarDays.map((day, index) => {
              const dateKey =
                day && getLocalYmd(new Date(year, month, day));
              const dayBookings = dateKey ? (bookingsByDay[dateKey] || []) : [];
              const dayBlocked = dateKey ? (blockedByDay[dateKey] || []) : [];
              const isSelected = dateKey === selectedDay;
              const isToday = dateKey === getLocalYmd(new Date());

              return (
                <div
                  key={index}
                  onClick={() => dateKey && onSelectDay(isSelected ? null : dateKey)}
                  className={`min-h-11 sm:min-h-24 p-1 sm:p-2 cursor-pointer transition-colors ${
                    day
                      ? isSelected
                        ? "bg-purple-100 border-2 border-purple-600"
                        : "bg-white hover:bg-gray-50"
                      : "bg-gray-50"
                  }`}
                >
                  {day && (
                    <>
                      <div className={`font-semibold text-xs sm:text-sm mb-0.5 sm:mb-1 text-center sm:text-left ${isToday ? "text-purple-600" : "text-gray-900"}`}>
                        {day}
                      </div>
                      {/* Mobile: dot indicators */}
                      {(dayBookings.length > 0 || dayBlocked.length > 0) && (
                        <div className="flex items-center justify-center gap-0.5 sm:hidden">
                          {dayBookings.length <= 3 ? (
                            dayBookings.map((b) => (
                              <div key={b.id} className={`w-1.5 h-1.5 rounded-full ${
                                b.status === "pending" ? "bg-yellow-400" :
                                b.status === "confirmed" ? "bg-green-400" :
                                b.status === "active" ? "bg-blue-400" :
                                b.status === "completed" ? "bg-gray-400" :
                                "bg-orange-400"
                              }`} />
                            ))
                          ) : (
                            <>
                              <div className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                              <span className="text-[9px] text-purple-600 font-bold ml-0.5">{dayBookings.length}</span>
                            </>
                          )}
                          {dayBlocked.length > 0 && (
                            <div className="w-1.5 h-1.5 rounded-full bg-gray-500" title="Blocked dates present" />
                          )}
                        </div>
                      )}
                      {/* Desktop: booking previews */}
                      <div className="hidden sm:block space-y-1">
                        {dayBookings.slice(0, 2).map((booking) => (
                          <div
                            key={booking.id}
                            className={`text-xs p-1 rounded truncate ${statusColors[booking.status]}`}
                            title={booking.vehicleName || "Unknown Vehicle"}
                          >
                            {(booking.vehicleName || "Vehicle").split(" ").slice(1).join(" ") || booking.vehicleName || "Unknown Vehicle"}
                          </div>
                        ))}
                        {dayBookings.length > 2 && (
                          <div className="text-xs text-gray-600 px-1">
                            +{dayBookings.length - 2} more
                          </div>
                        )}
                        {dayBlocked.length > 0 && (
                          <div className="text-[10px] text-gray-600 px-1 truncate">
                            Blocked ({dayBlocked.length})
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected Day Details */}
        {selectedDay && (selectedDayBookings.length > 0 || selectedDayBlocked.length > 0) && (
          <div className="border-t border-gray-200 pt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Bookings for{" "}
                {new Date(selectedDay + "T00:00:00").toLocaleDateString("en-US", {
                  weekday: "long",
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </h3>
              <button
                onClick={() => onSelectDay(null)}
                aria-label="Clear selected day"
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="w-4 h-4 text-gray-600" />
              </button>
            </div>

            <div className="space-y-2.5">
              {selectedDayBookings.map((booking) => (
                <button
                  key={booking.id}
                  onClick={() => onBookingClick(booking)}
                  className={`w-full text-left rounded-2xl sm:rounded-lg border ${statusBorderColors[booking.status] || "border-gray-200"} ${statusBgColors[booking.status] || "bg-gray-50"} p-4 hover:shadow-sm active:scale-[0.98] transition-all`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="min-w-0">
                      <div className="font-semibold text-gray-900 truncate">
                        {booking.customer_name || "Unknown"}
                      </div>
                      <div className="text-xs sm:text-sm text-gray-500 truncate">
                        <Link
                          href={getStaffVehicleDetailsHref(booking.vehicle_id, panelConfig.panelBase)}
                          onClick={(e) => e.stopPropagation()}
                          className="hover:text-purple-700 hover:underline"
                        >
                          {booking.vehicleName || "Unknown Vehicle"}
                        </Link>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0 ml-3">
                      <span className="text-sm font-bold text-gray-900">
                        ${(booking.total_price ?? 0).toFixed(0)}
                      </span>
                      <Badge className={statusColors[booking.status || "pending"]}>
                        {booking.status || "pending"}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-600 mt-2">
                    <span>{formatDate(getCalendarPickupDateKey(booking))}</span>
                    <span className="font-bold text-purple-600">{formatTime(booking.pickup_time)}</span>
                    <span className="text-gray-400">â†’</span>
                    <span>{formatDate(getCalendarReturnDateKey(booking))}</span>
                    <span className="font-bold text-purple-600">{formatTime(booking.return_time)}</span>
                  </div>
                </button>
              ))}
              {selectedDayBlocked.map((block) => (
                <button
                  key={`blocked-${block.id}`}
                  onClick={() => onBlockedDateClick(block)}
                  className="w-full text-left rounded-2xl sm:rounded-lg border border-dashed border-gray-300 bg-gray-50 p-4"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="min-w-0">
                      <div className="font-semibold text-gray-800 truncate">
                        {block.source === "turo-email" ? "Turo Block" : "Blocked Date"}
                      </div>
                      <div className="text-xs sm:text-sm text-gray-500 truncate">
                        {block.reason || "Unavailable"}
                      </div>
                    </div>
                    <Badge className="bg-gray-200 text-gray-700">
                      blocked
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-600 mt-2">
                    <span>{formatDate(block.start_date)}</span>
                    <span className="text-gray-400">â†’</span>
                    <span>{formatDate(block.end_date)}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {selectedDay && selectedDayBookings.length === 0 && selectedDayBlocked.length === 0 && (
          <div className="border-t border-gray-200 pt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                {new Date(selectedDay + "T00:00:00").toLocaleDateString("en-US", {
                  weekday: "long",
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </h3>
              <button
                onClick={() => onSelectDay(null)}
                aria-label="Clear selected day"
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="w-4 h-4 text-gray-600" />
              </button>
            </div>
            <p className="text-gray-600 text-sm">No bookings for this day.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
