"use client";

import React, { useEffect, useLayoutEffect, useState, useMemo, useCallback, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronLeft, ChevronRight, Calendar, MousePointerClick } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { BookingDbRow, VehicleListItem } from "@/lib/types";
import { getLocalYmd } from "@/lib/utils/date-helpers";
import { statusBgColors, statusBorderColors } from "@/lib/utils/status-colors";
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
  onPrevious?: () => void;
  onNext?: () => void;
  onBookingClick: (booking: BookingRow) => void;
  onBlockedDateClick: (blocked: BlockedDateEntry) => void;
}

const TIMELINE_WHEEL_LINE_PX = 18;
const ROW_HEIGHT_PX = 68;
const DAY_COL_MIN_PX = 112;
const VEHICLE_COL_PX = 168;

const STATUS_ACCENT: Record<string, string> = {
  pending: "border-l-amber-500",
  confirmed: "border-l-emerald-500",
  active: "border-l-blue-500",
  completed: "border-l-slate-400",
  cancelled: "border-l-red-500",
  "no-show": "border-l-orange-500",
};

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

function isTuroBooking(booking: BookingRow): boolean {
  return booking.id.startsWith("turo:");
}

function bookingDisplayName(booking: BookingRow): string {
  const name = booking.customer_name?.trim();
  if (name) return name.split(" ")[0];
  return isTuroBooking(booking) ? "Turo" : "Guest";
}

function bookingBarTitle(booking: BookingRow, pickupDate: string, returnDate: string, daysTotal: number): string {
  const name = booking.customer_name?.trim() || (isTuroBooking(booking) ? "Turo guest" : "Guest");
  return `${name}\n${pickupDate} → ${returnDate} (${daysTotal} day${daysTotal === 1 ? "" : "s"})\n$${(booking.total_price ?? 0).toFixed(2)} — ${booking.status || "pending"}\nClick for details`;
}

export function TimelineView({
  bookings,
  vehicles,
  blockedDates,
  start,
  days,
  onToday,
  onPrevious,
  onNext,
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
  const [timelineScrollEl, setTimelineScrollEl] = useState<HTMLDivElement | null>(null);
  const initialScrollDone = useRef(false);
  const [visibleRange, setVisibleRange] = useState<{ startIdx: number; endIdx: number }>({
    startIdx: 0,
    endIdx: Math.max(days - 1, 0),
  });

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
      .filter(Boolean) as {
      booking: BookingRow;
      startIdx: number;
      endIdx: number;
      extendsLeft: boolean;
      extendsRight: boolean;
      startFraction: number;
      endFraction: number;
    }[];
  };

  const today = getLocalYmd(new Date());
  const isWeekend = (date: Date) => date.getDay() === 0 || date.getDay() === 6;

  const [nowPercent, setNowPercent] = useState(() => {
    const n = new Date();
    return ((n.getHours() * 60 + n.getMinutes()) / 1440) * 100;
  });
  useEffect(() => {
    const tick = () => {
      const n = new Date();
      setNowPercent(((n.getHours() * 60 + n.getMinutes()) / 1440) * 100);
    };
    const id = setInterval(tick, 60000);
    return () => clearInterval(id);
  }, []);

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

  const scrollToTodayColumn = useCallback(
    (behavior: ScrollBehavior = "smooth") => {
      const el = timelineScrollEl;
      if (!el) return;
      const todayIdx = dateKeys.indexOf(today);
      if (todayIdx < 0) return;
      const header = el.querySelector<HTMLElement>(`th[data-day-index="${todayIdx}"]`);
      if (!header) return;
      const target = header.offsetLeft - Math.min(el.clientWidth * 0.12, 80);
      el.scrollTo({ left: Math.max(0, target), behavior });
    },
    [timelineScrollEl, dateKeys, today]
  );

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

  useLayoutEffect(() => {
    if (!timelineScrollEl || initialScrollDone.current) return;
    scrollToTodayColumn("auto");
    initialScrollDone.current = true;
  }, [timelineScrollEl, scrollToTodayColumn]);

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
    requestAnimationFrame(() => scrollToTodayColumn("smooth"));
  }, [onToday, scrollToTodayColumn]);

  const rangeLabel = `${visibleStartDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  })} – ${visibleEndDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })}`;

  const activeVehicleCount = vehicles.filter((v) => (vehicleBookingCounts[v.id] || 0) > 0).length;

  return (
    <Card className="min-w-0 shadow-sm overflow-hidden">
      <CardContent className="min-w-0 p-0">
        {/* Toolbar */}
        <div className="flex flex-col gap-3 border-b border-gray-200 bg-gray-50/80 px-4 py-3 sm:px-5 sm:py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex items-center rounded-lg border border-gray-200 bg-white p-0.5 shadow-sm">
                {onPrevious && (
                  <Button
                    type="button"
                    onClick={onPrevious}
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 hover:bg-gray-100"
                    aria-label="Previous two weeks"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                )}
                <Button
                  type="button"
                  onClick={handleTodayClick}
                  variant="ghost"
                  size="sm"
                  className="h-8 px-3 text-xs font-semibold hover:bg-purple-50 hover:text-purple-700"
                >
                  Today
                </Button>
                {onNext && (
                  <Button
                    type="button"
                    onClick={onNext}
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 hover:bg-gray-100"
                    aria-label="Next two weeks"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                )}
              </div>
              <span className="text-sm font-semibold text-gray-900 tabular-nums">{rangeLabel}</span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="font-normal text-xs">
                {bookings.length} booking{bookings.length === 1 ? "" : "s"}
              </Badge>
              <Badge variant="secondary" className="font-normal text-xs">
                {activeVehicleCount}/{vehicles.length} vehicles in view
              </Badge>
              <div className="hidden md:flex items-center gap-1.5 text-[11px] text-gray-500">
                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                Now
              </div>
            </div>
          </div>

          <p className="flex items-center gap-1.5 text-[11px] text-gray-500">
            <MousePointerClick className="h-3.5 w-3.5 shrink-0" />
            Scroll horizontally to pan dates · click any bar to open booking details
          </p>
        </div>

        <div
          ref={(node) => setTimelineScrollEl(node)}
          className="timeline-scroll max-w-full min-w-0 overflow-x-auto overflow-y-hidden overscroll-x-contain overscroll-y-none"
          style={{ minHeight: `${Math.max(vehicles.length * ROW_HEIGHT_PX + 52, 280)}px` }}
        >
          <table
            className="w-full border-collapse"
            style={{
              tableLayout: "fixed",
              minWidth: `max(100%, ${VEHICLE_COL_PX + days * DAY_COL_MIN_PX}px)`,
            }}
          >
            <colgroup>
              <col style={{ width: `${VEHICLE_COL_PX}px`, minWidth: `${VEHICLE_COL_PX}px` }} />
              {dateRange.map((_, i) => (
                <col key={i} style={{ minWidth: `${DAY_COL_MIN_PX}px` }} />
              ))}
            </colgroup>
            <thead>
              <tr>
                <th className="timeline-sticky-col sticky left-0 z-20 border-b-2 border-r border-gray-200 bg-gray-50 p-3 text-left text-[10px] font-bold uppercase tracking-wider text-gray-500">
                  Vehicle
                </th>
                {dateRange.map((date, i) => {
                  const isDateToday = toDateKey(date) === today;
                  const weekend = isWeekend(date);
                  return (
                    <th
                      key={i}
                      data-day-index={i}
                      className={`border-b-2 border-r border-gray-200 px-1 py-2 text-center text-xs font-medium relative ${
                        isDateToday
                          ? "bg-purple-100/90 text-purple-900"
                          : weekend
                          ? "bg-gray-100/80 text-gray-500"
                          : "bg-gray-50 text-gray-600"
                      }`}
                    >
                      <div className={`text-[10px] uppercase tracking-wide ${isDateToday ? "font-bold text-purple-700" : ""}`}>
                        {date.toLocaleDateString("en-US", { weekday: "short" })}
                      </div>
                      <div className={`text-base leading-tight ${isDateToday ? "font-extrabold text-purple-900" : "font-semibold"}`}>
                        {date.getDate()}
                      </div>
                      {(i === 0 || date.getDate() === 1 || date.getDay() === 0) && (
                        <div className="text-[9px] font-medium text-gray-400">
                          {date.toLocaleDateString("en-US", { month: "short" })}
                        </div>
                      )}
                      {isDateToday && (
                        <div
                          className="absolute bottom-0 -translate-x-1/2 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white z-10"
                          style={{ left: `${nowPercent}%` }}
                        />
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
                    className={`group ${vehicleIdx % 2 === 0 ? "" : "bg-gray-50/40"}`}
                  >
                    <td
                      className="timeline-sticky-col sticky left-0 z-10 border-b border-r border-gray-200 bg-white p-2.5 group-hover:bg-purple-50/40 transition-colors"
                      style={{ height: ROW_HEIGHT_PX }}
                    >
                      <div className="flex items-center justify-between gap-2 h-full">
                        <div className="min-w-0">
                          <Link
                            href={getStaffVehicleDetailsHref(vehicle.id, pathname)}
                            className="text-sm font-semibold text-gray-900 truncate block hover:text-purple-700 hover:underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {vehicle.make} {vehicle.model}
                          </Link>
                          <p className="text-[11px] text-gray-400">{vehicle.year}</p>
                        </div>
                        {count > 0 && (
                          <span className="flex-shrink-0 inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1 rounded-full bg-purple-100 text-purple-700 text-[10px] font-bold">
                            {count}
                          </span>
                        )}
                      </div>
                    </td>
                    {dateRange.map((date, dateIdx) => {
                      const isDateToday = toDateKey(date) === today;
                      const weekend = isWeekend(date);
                      const bookingStartingHere = visibleBookings.filter((vb) => vb.startIdx === dateIdx);

                      return (
                        <td
                          key={dateIdx}
                          className={`border-b border-r border-gray-100 p-0 relative ${
                            isDateToday
                              ? "bg-purple-50/30"
                              : weekend
                              ? "bg-gray-50/50"
                              : ""
                          }`}
                          style={{ height: ROW_HEIGHT_PX }}
                        >
                          {isDateToday && (
                            <div
                              className="absolute top-0 bottom-0 w-px bg-red-500/70 z-[3] pointer-events-none"
                              style={{ left: `${nowPercent}%` }}
                            />
                          )}
                          {bookingStartingHere.map(({ booking, startIdx, endIdx, extendsLeft, extendsRight, startFraction, endFraction }) => {
                            const fullDaySpan = endIdx - startIdx + 1;
                            const trimStart = startFraction;
                            const trimEnd = 1 - endFraction;
                            const preciseSpan = fullDaySpan - trimStart - trimEnd;
                            const roundLeft = extendsLeft ? "rounded-l-sm" : "rounded-l-lg";
                            const roundRight = extendsRight ? "rounded-r-sm" : "rounded-r-lg";
                            const pickupDate = getCalendarPickupDateKey(booking);
                            const returnDate = getCalendarReturnDateKey(booking);
                            const daysTotal =
                              pickupDate && returnDate
                                ? Math.ceil(
                                    (new Date(returnDate).getTime() - new Date(pickupDate).getTime()) / 86400000
                                  ) + 1
                                : 1;
                            const status = booking.status || "pending";
                            const accent = STATUS_ACCENT[status] || "border-l-gray-400";
                            const showMeta = preciseSpan >= 0.85;

                            return (
                              <div
                                key={booking.id}
                                role="button"
                                tabIndex={0}
                                onClick={() => onBookingClick(booking)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter" || e.key === " ") {
                                    e.preventDefault();
                                    onBookingClick(booking);
                                  }
                                }}
                                className={`timeline-booking-bar absolute top-2 bottom-2 border-l-4 ${accent} ${statusBgColors[status]} border ${statusBorderColors[status]} ${roundLeft} ${roundRight} px-2 flex items-center gap-1.5 overflow-hidden cursor-pointer hover:brightness-[0.97] hover:shadow-lg hover:z-20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-1 transition-all duration-150 z-[5]`}
                                style={{
                                  left: `calc(${trimStart * 100}%)`,
                                  width: `calc(${preciseSpan * 100}% - 4px)`,
                                }}
                                title={bookingBarTitle(booking, pickupDate, returnDate, daysTotal)}
                              >
                                {extendsLeft && (
                                  <ChevronLeft className="w-3 h-3 text-gray-600 flex-shrink-0 -ml-0.5" aria-hidden />
                                )}
                                <span className="text-xs font-bold text-gray-900 truncate min-w-0">
                                  {bookingDisplayName(booking)}
                                </span>
                                {showMeta && (
                                  <>
                                    <span className="text-[10px] font-medium text-gray-700 truncate hidden sm:inline capitalize">
                                      {status}
                                    </span>
                                    {fullDaySpan >= 1 && (
                                      <span className="text-[10px] text-gray-600 shrink-0">{daysTotal}d</span>
                                    )}
                                    {preciseSpan >= 1.4 && (
                                      <span className="text-[10px] font-semibold text-gray-800 shrink-0 hidden md:inline">
                                        ${(booking.total_price ?? 0).toFixed(0)}
                                      </span>
                                    )}
                                  </>
                                )}
                                {extendsRight && (
                                  <ChevronRight className="w-3 h-3 text-gray-600 flex-shrink-0 ml-auto" aria-hidden />
                                )}
                              </div>
                            );
                          })}
                          {blockedDates
                            .filter((bd) => bd.vehicle_id === vehicle.id)
                            .filter((bd) => {
                              const clampedStart = bd.start_date < dateKeys[0] ? dateKeys[0] : bd.start_date;
                              return (
                                toDateKey(date) === clampedStart &&
                                bd.end_date >= dateKeys[0] &&
                                bd.start_date <= dateKeys[dateKeys.length - 1]
                              );
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
                              const { endIdx, startIdx, extendsLeft, extendsRight, startFraction, endFraction } =
                                visibleSpan;
                              const fullDaySpan = endIdx - startIdx + 1;
                              const trimStart = startFraction;
                              const trimEnd = 1 - endFraction;
                              const preciseSpan = Math.max(0.05, fullDaySpan - trimStart - trimEnd);
                              const roundLeft = extendsLeft ? "rounded-l-sm" : "rounded-l-md";
                              const roundRight = extendsRight ? "rounded-r-sm" : "rounded-r-md";
                              return (
                                <div
                                  key={bd.id}
                                  role="button"
                                  tabIndex={0}
                                  onClick={() => onBlockedDateClick(bd)}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter" || e.key === " ") {
                                      e.preventDefault();
                                      onBlockedDateClick(bd);
                                    }
                                  }}
                                  className={`absolute top-2.5 bottom-2.5 ${roundLeft} ${roundRight} bg-gray-200/70 border border-dashed border-gray-400 z-[4] flex items-center px-2 cursor-pointer hover:bg-gray-300/80 transition-colors`}
                                  style={{
                                    left: `calc(${trimStart * 100}%)`,
                                    width: `calc(${preciseSpan * 100}% - 4px)`,
                                  }}
                                  title={bd.reason || `Blocked (${bd.source}) — click for details`}
                                >
                                  <span className="text-[10px] text-gray-600 font-semibold truncate">
                                    {bd.source === "turo-email" ? "Turo" : "Blocked"}
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
                  <td colSpan={days + 1} className="text-center py-16">
                    <div className="text-gray-400 mb-2">
                      <Calendar className="w-10 h-10 mx-auto opacity-50" />
                    </div>
                    <p className="text-gray-500 text-sm font-medium">No vehicles found</p>
                    <p className="text-gray-400 text-xs mt-1">Add vehicles in Fleet Management</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="border-t border-gray-200 bg-gray-50/60 px-4 py-3 sm:px-5 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
          <span className="text-gray-400 font-semibold uppercase tracking-wider text-[10px]">Legend</span>
          {(["pending", "confirmed", "active", "completed", "no-show"] as const).map((status) => (
            <div key={status} className="flex items-center gap-1.5">
              <div
                className={`w-3 h-3 rounded-sm border-l-2 ${STATUS_ACCENT[status]} ${statusBgColors[status]} border ${statusBorderColors[status]}`}
              />
              <span className="capitalize text-gray-600">{status === "no-show" ? "No-show" : status}</span>
            </div>
          ))}
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm bg-gray-200/80 border border-dashed border-gray-400" />
            <span className="text-gray-600">Manual block</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
