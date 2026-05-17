"use client";

import React, { useEffect, useLayoutEffect, useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { BookingDbRow, VehicleListItem } from "@/lib/types";
import { getLocalYmd } from "@/lib/utils/date-helpers";
import { statusColors, statusBgColors, statusBorderColors } from "@/lib/utils/status-colors";
import { getStaffVehicleDetailsHref } from "@/lib/admin/staff-vehicle-links";
import { getVisibleEventSpan, type BlockedDateEntry } from "./calendar-model";
import {
  bookingOverlapsDateRange,
  getCalendarPickupDateKey,
  getCalendarReturnDateKey,
} from "./calendar-booking-display";

type BookingRow = BookingDbRow;
type Vehicle = VehicleListItem;

export interface TimelineViewProps {
  bookings: BookingRow[];
  vehicles: Vehicle[];
  blockedDates: BlockedDateEntry[];
  start: Date;
  days: number;
  onToday: () => void;
  onBookingClick: (booking: BookingRow) => void;
  onBlockedDateClick: (blocked: BlockedDateEntry) => void;
}

const TIMELINE_WHEEL_LINE_PX = 18;

/** Convert wheel delta to pixels for DOM_DELTA_LINE / DOM_DELTA_PAGE (trackpads usually send PIXEL). */
function scaleWheelAxis(delta: number, deltaMode: number, pageSize: number): number {
  switch (deltaMode) {
    case WheelEvent.DOM_DELTA_LINE:
      return delta * TIMELINE_WHEEL_LINE_PX;
    case WheelEvent.DOM_DELTA_PAGE:
      return delta * Math.max(pageSize, 1);
    case WheelEvent.DOM_DELTA_PIXEL:
    default:
      return delta;
  }
}

function normalizedWheelDeltas(ev: WheelEvent, el: HTMLElement): { dx: number; dy: number } {
  const w = el.clientWidth;
  const h = el.clientHeight;
  return {
    dx: scaleWheelAxis(ev.deltaX, ev.deltaMode, w),
    dy: scaleWheelAxis(ev.deltaY, ev.deltaMode, h),
  };
}

export function TimelineView({
  bookings,
  vehicles,
  blockedDates,
  start,
  days,
  onToday,
  onBookingClick,
  onBlockedDateClick,
}: TimelineViewProps) {
  const pathname = usePathname();
  const dateRange = Array.from({ length: days }, (_, i) => {
    const date = new Date(start);
    date.setDate(date.getDate() + i);
    return date;
  });

  const toDateKey = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  };

  const dateKeys = dateRange.map(toDateKey);
  /** Set when the scroll container DOM node mounts — guarantees wheel listener attaches (ref alone can be null on first layout). */
  const [timelineScrollEl, setTimelineScrollEl] = useState<HTMLDivElement | null>(null);
  const [visibleRange, setVisibleRange] = useState<{ startIdx: number; endIdx: number }>({
    startIdx: 0,
    endIdx: Math.max(days - 1, 0),
  });

  // Group bookings by vehicle
  const bookingsByVehicle = useMemo(() => {
    const map: Record<string, BookingRow[]> = {};
    vehicles.forEach((v) => {
      map[v.id] = [];
    });
    bookings.forEach((booking) => {
      if (!map[booking.vehicle_id]) {
        map[booking.vehicle_id] = [];
      }
      map[booking.vehicle_id].push(booking);
    });
    return map;
  }, [bookings, vehicles]);

  const getVisibleBookings = (vehicleId: string) => {
    const vehicleBookings = bookingsByVehicle[vehicleId] || [];
    return vehicleBookings
      .map((booking) => {
        const pickupKey = getCalendarPickupDateKey(booking);
        const returnKey = getCalendarReturnDateKey(booking);
        const span = getVisibleEventSpan(
          pickupKey,
          returnKey,
          booking.pickup_time || null,
          booking.return_time || null,
          dateKeys
        );
        if (!span) return null;
        return { booking, ...span };
      })
      .filter(Boolean) as { booking: BookingRow; startIdx: number; endIdx: number; extendsLeft: boolean; extendsRight: boolean; startFraction: number; endFraction: number }[];
  };

  const today = getLocalYmd(new Date());
  const isWeekend = (date: Date) => date.getDay() === 0 || date.getDay() === 6;

  // Calculate time-of-day as a percentage for the "now" marker position
  const [nowPercent, setNowPercent] = useState(() => {
    const n = new Date();
    return ((n.getHours() * 60 + n.getMinutes()) / 1440) * 100;
  });
  useEffect(() => {
    const tick = () => {
      const n = new Date();
      setNowPercent(((n.getHours() * 60 + n.getMinutes()) / 1440) * 100);
    };
    const id = setInterval(tick, 60000); // Update every minute
    return () => clearInterval(id);
  }, []);

  // Count total bookings per vehicle in view
  const vehicleBookingCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    const rangeStart = dateKeys[0];
    const rangeEnd = dateKeys[days - 1];
    vehicles.forEach((v) => {
      const vBookings = bookingsByVehicle[v.id] || [];
      counts[v.id] = vBookings.filter((b) =>
        bookingOverlapsDateRange(b, rangeStart, rangeEnd)
      ).length;
    });
    return counts;
  }, [bookingsByVehicle, vehicles, dateKeys, days]);

  // Native non-passive wheel: React's onWheel is passive so preventDefault does not stop page scroll.
  // Effect depends on timelineScrollEl (ref callback) so we never attach with a null element.
  useLayoutEffect(() => {
    const el = timelineScrollEl;
    if (!el) return undefined;

    const onWheel = (ev: WheelEvent) => {
      ev.preventDefault();
      const { dx, dy } = normalizedWheelDeltas(ev, el);
      const dominantHorizontal = Math.abs(dx) > Math.abs(dy);
      const shouldScrollHorizontally = dominantHorizontal || ev.shiftKey;

      let delta = 0;
      if (shouldScrollHorizontally) {
        delta = dominantHorizontal ? dx : dy;
      } else {
        if (Math.abs(dy) < 0.01) return;
        delta = dy;
      }

      el.scrollLeft += delta;
    };

    const opts: AddEventListenerOptions = { passive: false };
    el.addEventListener("wheel", onWheel, opts);
    return () => {
      el.removeEventListener("wheel", onWheel, opts);
    };
  }, [timelineScrollEl]);

  useEffect(() => {
    setVisibleRange({
      startIdx: 0,
      endIdx: Math.max(days - 1, 0),
    });
  }, [start, days]);

  useLayoutEffect(() => {
    const el = timelineScrollEl;
    if (!el) return undefined;

    const computeVisibleRange = () => {
      const dayHeaders = el.querySelectorAll<HTMLElement>("th[data-day-index]");
      if (!dayHeaders.length) return;

      const viewportLeft = el.scrollLeft;
      const viewportRight = viewportLeft + el.clientWidth;
      let firstVisible = -1;
      let lastVisible = -1;

      dayHeaders.forEach((header) => {
        const idx = Number(header.dataset.dayIndex);
        const left = header.offsetLeft;
        const right = left + header.offsetWidth;
        const intersectsViewport = right > viewportLeft && left < viewportRight;
        if (!intersectsViewport) return;
        if (firstVisible === -1 || idx < firstVisible) firstVisible = idx;
        if (lastVisible === -1 || idx > lastVisible) lastVisible = idx;
      });

      if (firstVisible === -1 || lastVisible === -1) return;
      setVisibleRange((prev) =>
        prev.startIdx === firstVisible && prev.endIdx === lastVisible
          ? prev
          : { startIdx: firstVisible, endIdx: lastVisible }
      );
    };

    computeVisibleRange();
    el.addEventListener("scroll", computeVisibleRange, { passive: true });
    window.addEventListener("resize", computeVisibleRange);
    return () => {
      el.removeEventListener("scroll", computeVisibleRange);
      window.removeEventListener("resize", computeVisibleRange);
    };
  }, [timelineScrollEl, dateRange]);

  const visibleStartDate = dateRange[Math.max(0, Math.min(visibleRange.startIdx, days - 1))] ?? dateRange[0];
  const visibleEndDate = dateRange[Math.max(0, Math.min(visibleRange.endIdx, days - 1))] ?? dateRange[days - 1];

  const handleTodayClick = useCallback(() => {
    onToday();
    timelineScrollEl?.scrollTo({ left: 0, behavior: "smooth" });
  }, [onToday, timelineScrollEl]);

  return (
    <Card className="min-w-0 shadow-sm">
      <CardContent className="min-w-0 p-6">
        {/* Date Navigation */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
              <Button onClick={handleTodayClick} variant="ghost" size="sm" className="h-8 px-3 hover:bg-gray-200 text-xs font-semibold">
                Today
              </Button>
            </div>
            <span className="text-sm font-semibold text-gray-800">
              {visibleStartDate.toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              })}{" "}
              &ndash;{" "}
              {visibleEndDate.toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-red-400" />
              Today
            </div>
            <span className="text-gray-300">|</span>
            <span>{bookings.length} bookings</span>
          </div>
        </div>

        {/* Never pair overflow-x-auto with overflow-hidden here — overflow shorthand wins and can kill horizontal scroll. minWidth max(100%, …) forces scrollWidth > clientWidth on typical admin widths. */}
        <div
          ref={(node) => setTimelineScrollEl(node)}
          className="max-w-full min-w-0 overflow-x-auto overflow-y-hidden border border-gray-200 rounded-xl shadow-sm overscroll-x-contain overscroll-y-none"
        >
          <table
            className="w-full border-collapse"
            style={{
              tableLayout: "fixed",
              minWidth: `max(100%, ${170 + days * 118}px)`,
            }}
          >
            <colgroup>
              <col style={{ width: "170px", minWidth: "170px" }} />
              {dateRange.map((_, i) => (
                <col key={i} style={{ minWidth: "118px" }} />
              ))}
            </colgroup>
            <thead>
              <tr>
                <th className="sticky left-0 z-20 bg-gray-50 border-b-2 border-r border-gray-200 p-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                  Vehicle
                </th>
                {dateRange.map((date, i) => {
                  const isDateToday = toDateKey(date) === today;
                  const weekend = isWeekend(date);
                  return (
                    <th
                      key={i}
                      data-day-index={i}
                      className={`border-b-2 border-r border-gray-200 p-2 text-center text-xs font-medium relative ${
                        isDateToday
                          ? "bg-purple-100 text-purple-900"
                          : weekend
                          ? "bg-gray-100 text-gray-500"
                          : "bg-gray-50 text-gray-600"
                      }`}
                    >
                      <div className={`text-[10px] uppercase tracking-wide ${isDateToday ? "font-bold" : ""}`}>
                        {date.toLocaleDateString("en-US", { weekday: "short" })}
                      </div>
                      <div className={`text-sm ${isDateToday ? "font-extrabold" : "font-semibold"}`}>
                        {date.getDate()}
                      </div>
                      {i === 0 || date.getDate() === 1 ? (
                        <div className="text-[9px] text-gray-400 font-medium">
                          {date.toLocaleDateString("en-US", { month: "short" })}
                        </div>
                      ) : null}
                      {/* Today indicator dot — moves with time of day */}
                      {isDateToday && (
                        <div className="absolute bottom-0 -translate-x-1/2 w-1.5 h-1.5 bg-red-500 rounded-full" style={{ left: `${nowPercent}%` }} />
                      )}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {vehicles.map((vehicle, vehicleIdx) => {
                const visibleBookings = getVisibleBookings(vehicle.id);
                const count = vehicleBookingCounts[vehicle.id] || 0;
                return (
                  <tr
                    key={vehicle.id}
                    className={`group ${vehicleIdx % 2 === 0 ? "" : "bg-gray-50/30"}`}
                  >
                    <td className="sticky left-0 z-10 bg-white border-b border-r border-gray-200 p-3 group-hover:bg-purple-50/50 transition-colors">
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <Link
                            href={getStaffVehicleDetailsHref(vehicle.id, pathname)}
                            className="text-sm font-semibold text-gray-900 truncate hover:text-purple-700 hover:underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {vehicle.make} {vehicle.model}
                          </Link>
                          <p className="text-[11px] text-gray-400">{vehicle.year}</p>
                        </div>
                        {count > 0 && (
                          <span className="flex-shrink-0 inline-flex items-center justify-center w-5 h-5 rounded-full bg-purple-100 text-purple-700 text-[10px] font-bold">
                            {count}
                          </span>
                        )}
                      </div>
                    </td>
                    {dateRange.map((date, dateIdx) => {
                      const isDateToday = toDateKey(date) === today;
                      const weekend = isWeekend(date);
                      const bookingStartingHere = visibleBookings.filter(
                        (vb) => vb.startIdx === dateIdx
                      );

                      return (
                        <td
                          key={dateIdx}
                          className={`border-b border-r border-gray-100 p-0 h-14 relative ${
                            isDateToday
                              ? "bg-purple-50/40"
                              : weekend
                              ? "bg-gray-50/60"
                              : ""
                          }`}
                        >
                          {/* Today vertical line — moves with time of day */}
                          {isDateToday && (
                            <div className="absolute top-0 bottom-0 w-0.5 bg-red-400/60 z-[3] pointer-events-none" style={{ left: `${nowPercent}%` }} />
                          )}
                          {bookingStartingHere.map(({ booking, startIdx, endIdx, extendsLeft, extendsRight, startFraction, endFraction }) => {
                            const fullDaySpan = endIdx - startIdx + 1;
                            // Calculate precise width: subtract the partial start and partial end
                            // Each cell = 100%. Subtract the portion before pickup on first day,
                            // and the portion after return on last day.
                            const trimStart = startFraction; // fraction to trim from the left of the first cell
                            const trimEnd = 1 - endFraction;  // fraction to trim from the right of the last cell
                            const preciseSpan = fullDaySpan - trimStart - trimEnd;

                            // Dynamic rounding: flat edge if booking extends beyond view
                            const roundLeft = extendsLeft ? "rounded-l-none" : "rounded-l-lg";
                            const roundRight = extendsRight ? "rounded-r-none" : "rounded-r-lg";
                            const pickupDate = getCalendarPickupDateKey(booking);
                            const returnDate = getCalendarReturnDateKey(booking);
                            const daysTotal = pickupDate && returnDate ? Math.ceil(
                              (new Date(returnDate).getTime() - new Date(pickupDate).getTime()) / 86400000
                            ) + 1 : 1;

                            return (
                              <div
                                key={booking.id}
                                onClick={() => onBookingClick(booking)}
                                className={`absolute top-1.5 bottom-1.5 ${statusBgColors[booking.status]} border ${statusBorderColors[booking.status]} ${roundLeft} ${roundRight} px-2 flex items-center gap-1.5 overflow-hidden cursor-pointer hover:shadow-md hover:scale-[1.02] hover:z-20 transition-all duration-150 z-[5]`}
                                style={{
                                  left: `calc(${trimStart * 100}%)`,
                                  width: `calc(${preciseSpan * 100}% - 2px)`,
                                }}
                                title={`${booking.customer_name || "Unknown"}\n${pickupDate} → ${returnDate} (${daysTotal} days)\n$${(booking.total_price ?? 0).toFixed(2)} — ${booking.status || "pending"}`}
                              >
                                {/* Left arrow if extends beyond view */}
                                {extendsLeft && (
                                  <ChevronLeft className="w-3 h-3 text-gray-500 flex-shrink-0 -ml-1" />
                                )}
                                <span className="text-xs font-bold text-gray-900 truncate">
                                  {(booking.customer_name || "Unknown").split(" ")[0]}
                                </span>
                                {fullDaySpan >= 2 && (
                                  <span className="text-[10px] text-gray-700 truncate hidden sm:inline">
                                    {daysTotal}d
                                  </span>
                                )}
                                {fullDaySpan >= 3 && (
                                  <span className="text-[10px] font-semibold text-gray-800 truncate hidden md:inline">
                                    ${(booking.total_price ?? 0).toFixed(0)}
                                  </span>
                                )}
                                {/* Right arrow if extends beyond view */}
                                {extendsRight && (
                                  <ChevronRight className="w-3 h-3 text-gray-500 flex-shrink-0 -mr-1 ml-auto" />
                                )}
                              </div>
                            );
                          })}
                          {/* Blocked date bars (Turo/manual) */}
                          {blockedDates
                            .filter((bd) => bd.vehicle_id === vehicle.id)
                            .filter((bd) => {
                              // Only render from the cell where the blocked bar should start
                              const clampedStart = bd.start_date < dateKeys[0] ? dateKeys[0] : bd.start_date;
                              return toDateKey(date) === clampedStart && bd.end_date >= dateKeys[0] && bd.start_date <= dateKeys[dateKeys.length - 1];
                            })
                            .map((bd) => {
                              const visibleSpan = getVisibleEventSpan(
                                bd.start_date,
                                bd.end_date,
                                bd.pickup_time,
                                bd.return_time,
                                dateKeys
                              );
                              if (!visibleSpan) return null;
                              const { endIdx, startIdx, extendsLeft, extendsRight, startFraction, endFraction } = visibleSpan;
                              const fullDaySpan = endIdx - startIdx + 1;
                              const trimStart = startFraction;
                              const trimEnd = 1 - endFraction;
                              const preciseSpan = Math.max(0.05, fullDaySpan - trimStart - trimEnd);
                              const roundLeft = extendsLeft ? "rounded-l-none" : "rounded-l-md";
                              const roundRight = extendsRight ? "rounded-r-none" : "rounded-r-md";
                              return (
                                <div
                                  key={bd.id}
                                  onClick={() => onBlockedDateClick(bd)}
                                  className={`absolute top-1 bottom-1 ${roundLeft} ${roundRight} bg-gray-300/50 border border-dashed border-gray-400 z-[4] flex items-center px-2 cursor-pointer`}
                                  style={{
                                    left: `calc(${trimStart * 100}%)`,
                                    width: `calc(${preciseSpan * 100}% - 2px)`,
                                  }}
                                  title={bd.reason || `Blocked (${bd.source})`}
                                >
                                  <span className="text-[10px] text-gray-500 font-medium truncate">
                                    {bd.source === "turo-email" ? "Turo Trip" : "Blocked"}
                                    {bd.reason ? ` — ${bd.reason}` : ""}
                                  </span>
                                </div>
                              );
                            })}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
              {vehicles.length === 0 && (
                <tr>
                  <td
                    colSpan={days + 1}
                    className="text-center py-16"
                  >
                    <div className="text-gray-400 mb-2">
                      <Calendar className="w-10 h-10 mx-auto opacity-50" />
                    </div>
                    <p className="text-gray-500 text-sm font-medium">No vehicles found</p>
                    <p className="text-gray-400 text-xs mt-1">Add vehicles in the Fleet Management page</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Legend */}
        <div className="mt-5 pt-4 border-t border-gray-100 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs">
          <span className="text-gray-400 font-medium uppercase tracking-wider text-[10px]">Status:</span>
          {Object.entries(statusColors)
            .filter(([status]) => status !== "cancelled")
            .map(([status]) => (
              <div key={status} className="flex items-center gap-1.5">
                <div
                  className={`w-3 h-3 rounded-sm ${statusBgColors[status]} border ${statusBorderColors[status]}`}
                />
                <span className="capitalize text-gray-600">{status}</span>
              </div>
            ))}
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm bg-gray-300/50 border border-dashed border-gray-400" />
            <span className="text-gray-600">Blocks (Turo / manual)</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}