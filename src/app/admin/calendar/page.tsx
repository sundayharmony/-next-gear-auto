"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import { usePathname } from "next/navigation";
import type { BookingDbRow, VehicleListItem } from "@/lib/types";
import {
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  LayoutList,
  Calendar,
  X,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import { PageContainer } from "@/components/layout/page-container";
import { adminFetch } from "@/lib/utils/admin-fetch";
import { formatTime, formatDate } from "@/lib/utils/date-helpers";
import { statusColors, statusBgColors, statusBorderColors } from "@/lib/utils/status-colors";
import { logger } from "@/lib/utils/logger";

type BookingRow = BookingDbRow;
type Vehicle = VehicleListItem;

export default function AdminCalendarPage() {
  const pathname = usePathname();
  const bookingsEndpoint = pathname.startsWith("/manager") ? "/api/manager/bookings" : "/api/bookings";
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"timeline" | "calendar">("timeline");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [vehicleFilter, setVehicleFilter] = useState<string>("all");

  // Timeline state
  const [timelineStart, setTimelineStart] = useState<Date>(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
  });

  // Calendar state
  const [calendarMonth, setCalendarMonth] = useState<Date>(() => {
    const today = new Date();
    today.setDate(1);
    return today;
  });
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  // Booking detail panel state
  const [selectedBooking, setSelectedBooking] = useState<BookingRow | null>(null);
  const [showBookingDetail, setShowBookingDetail] = useState(false);

  // Blocked dates state
  const [blockedDates, setBlockedDates] = useState<{ id: string; vehicle_id: string; start_date: string; end_date: string; source: string; reason: string | null }[]>([]);

  // Track abort controller for fetch cancellation
  const bookingsAbortControllerRef = React.useRef<AbortController | null>(null);

  const openBookingDetail = (booking: BookingRow) => {
    setSelectedBooking(booking);
    setShowBookingDetail(true);
  };

  const closeBookingDetail = useCallback(() => {
    setShowBookingDetail(false);
    setSelectedBooking(null);
  }, []);

  // Escape key handler for booking detail panel
  useEffect(() => {
    const handleEscapeKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && showBookingDetail) {
        closeBookingDetail();
      }
    };

    if (showBookingDetail) {
      window.addEventListener("keydown", handleEscapeKey);
      return () => window.removeEventListener("keydown", handleEscapeKey);
    }
  }, [showBookingDetail, closeBookingDetail]);

  const fetchBookings = useCallback(async () => {
    // Abort previous request if it's still pending
    if (bookingsAbortControllerRef.current) {
      bookingsAbortControllerRef.current.abort();
    }

    // Create new abort controller for this fetch
    bookingsAbortControllerRef.current = new AbortController();
    // Build date range for API filtering (3 months window around current view)
    const pad = (n: number) => String(n).padStart(2, "0");
    const from = new Date(view === "timeline" ? timelineStart : calendarMonth);
    from.setMonth(from.getMonth() - 1);
    const to = new Date(view === "timeline" ? timelineStart : calendarMonth);
    to.setMonth(to.getMonth() + 2);
    const fromStr = `${from.getFullYear()}-${pad(from.getMonth() + 1)}-${pad(from.getDate())}`;
    const toStr = `${to.getFullYear()}-${pad(to.getMonth() + 1)}-${pad(to.getDate())}`;

    try {
      const query = bookingsEndpoint === "/api/manager/bookings"
        ? `${bookingsEndpoint}?status=all`
        : `${bookingsEndpoint}?from=${fromStr}&to=${toStr}`;
      const res = await adminFetch(query, {
        signal: bookingsAbortControllerRef.current?.signal,
      });
      if (res.ok) {
        const data = await res.json();
        setBookings((data.data || []).filter((b: BookingRow) => b.status !== "cancelled"));
      }
    } catch (error) {
      // Ignore abort errors
      if (error instanceof Error && error.name === "AbortError") return;
      logger.error("Failed to fetch bookings:", error);
    }
  }, [view, timelineStart, calendarMonth, bookingsEndpoint]);

  // Fetch data on mount and when view/date range changes
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [, vehiclesRes, blockedRes] = await Promise.all([
          fetchBookings(),
          adminFetch("/api/admin/vehicles"),
          adminFetch("/api/admin/blocked-dates"),
        ]);

        if (vehiclesRes.ok) {
          const data = await vehiclesRes.json();
          setVehicles(data.data || []);
        }
        if (blockedRes.ok) {
          const data = await blockedRes.json();
          setBlockedDates(data.data || []);
        }
      } catch (error) {
        logger.error("Failed to fetch calendar data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    return () => {
      // Abort fetch on unmount
      if (bookingsAbortControllerRef.current) {
        bookingsAbortControllerRef.current.abort();
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-fetch bookings when navigating timeline or calendar
  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  // Filter bookings
  const filteredBookings = useMemo(() => {
    return bookings.filter((booking) => {
      const statusMatch = statusFilter === "all" || booking.status === statusFilter;
      const vehicleMatch = vehicleFilter === "all" || booking.vehicle_id === vehicleFilter;
      return statusMatch && vehicleMatch;
    });
  }, [bookings, statusFilter, vehicleFilter]);

  const handleRefresh = async () => {
    setLoading(true);
    try {
      const [, vehiclesRes, blockedRes] = await Promise.all([
        fetchBookings(),
        adminFetch("/api/admin/vehicles"),
        adminFetch("/api/admin/blocked-dates"),
      ]);

      if (vehiclesRes.ok) {
        const data = await vehiclesRes.json();
        setVehicles(data.data || []);
      }
      if (blockedRes.ok) {
        const data = await blockedRes.json();
        setBlockedDates(data.data || []);
      }
    } catch (error) {
      logger.error("Failed to refresh calendar data:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Desktop header */}
      <section className="hidden sm:block bg-gradient-to-br from-gray-900 to-purple-900 py-6 sm:py-8 text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold">Booking Calendar</h1>
              <p className="mt-1 text-purple-200">Manage all vehicle reservations</p>
            </div>
            <Button
              onClick={handleRefresh}
              disabled={loading}
              variant="outline"
              size="sm"
              aria-label="Refresh calendar"
              className="gap-2 border-purple-400 text-purple-200 hover:bg-purple-800 hover:text-white"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </div>
      </section>

      <PageContainer className="py-4 sm:py-8">
        <div className="mb-8">

          {/* Controls */}
          <div className="flex flex-col gap-3 sm:gap-4 mb-4 sm:mb-6">
            {/* View Toggle + Refresh (mobile) */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex gap-1.5">
                <Button
                  onClick={() => setView("timeline")}
                  variant={view === "timeline" ? "default" : "outline"}
                  size="sm"
                  className="gap-1.5 h-8 text-xs sm:text-sm sm:h-9"
                >
                  <LayoutList className="w-3.5 h-3.5" />
                  Timeline
                </Button>
                <Button
                  onClick={() => setView("calendar")}
                  variant={view === "calendar" ? "default" : "outline"}
                  size="sm"
                  className="gap-1.5 h-8 text-xs sm:text-sm sm:h-9"
                >
                  <Calendar className="w-3.5 h-3.5" />
                  Calendar
                </Button>
              </div>
              <button
                onClick={handleRefresh}
                disabled={loading}
                aria-label="Refresh calendar"
                className="sm:hidden p-2 rounded-lg hover:bg-gray-100 active:bg-gray-200 disabled:opacity-50 transition-colors"
              >
                <RefreshCw className={`w-4 h-4 text-gray-500 ${loading ? "animate-spin" : ""}`} />
              </button>
            </div>

            {/* Filters — horizontal scroll on mobile */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 -mx-4 px-4 sm:mx-0 sm:px-0 sm:overflow-visible sm:flex-wrap scrollbar-hide">
              <span className="text-xs sm:text-sm font-medium text-gray-700 shrink-0">Status:</span>
              {["all", "pending", "confirmed", "active", "completed"].map((status) => (
                <Button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  variant={statusFilter === status ? "default" : "outline"}
                  size="sm"
                  className="capitalize h-7 text-[11px] sm:text-sm sm:h-9 shrink-0 px-2.5 sm:px-3"
                >
                  {status === "all" ? "All" : status}
                </Button>
              ))}
            </div>

            {/* Vehicle Filter */}
            <div className="flex gap-2 items-center">
              <span className="text-xs sm:text-sm font-medium text-gray-700 shrink-0">Vehicle:</span>
              <Select
                value={vehicleFilter}
                onChange={(e) => setVehicleFilter(e.target.value)}
              >
                <option value="all">All Vehicles</option>
                {vehicles.map((vehicle) => (
                  <option key={vehicle.id} value={vehicle.id}>
                    {vehicle.year} {vehicle.make} {vehicle.model}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          {loading && (
            <div className="text-center py-12">
              <div role="status" aria-label="Loading calendar" aria-live="polite" className="animate-spin h-8 w-8 border-4 border-purple-600 border-t-transparent rounded-full mx-auto" />
              <p className="mt-4 text-gray-500">Loading calendar...</p>
            </div>
          )}

          {!loading && view === "timeline" && (
            <>
              {/* Mobile: Agenda-style day view */}
              <div className="sm:hidden">
                <MobileAgendaView
                  bookings={filteredBookings}
                  vehicles={vehicles}
                  blockedDates={blockedDates}
                  start={timelineStart}
                  onPrevious={() => {
                    const newStart = new Date(timelineStart);
                    newStart.setDate(newStart.getDate() - 7);
                    setTimelineStart(newStart);
                  }}
                  onNext={() => {
                    const newStart = new Date(timelineStart);
                    newStart.setDate(newStart.getDate() + 7);
                    setTimelineStart(newStart);
                  }}
                  onToday={() => {
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    setTimelineStart(today);
                  }}
                  onBookingClick={openBookingDetail}
                />
              </div>
              {/* Desktop: Timeline table */}
              <div className="hidden sm:block">
                <TimelineView
                  bookings={filteredBookings}
                  vehicles={vehicles}
                  blockedDates={blockedDates}
                  start={timelineStart}
                  onPrevious={() => {
                    const newStart = new Date(timelineStart);
                    newStart.setDate(newStart.getDate() - 9);
                    setTimelineStart(newStart);
                  }}
                  onNext={() => {
                    const newStart = new Date(timelineStart);
                    newStart.setDate(newStart.getDate() + 9);
                    setTimelineStart(newStart);
                  }}
                  onToday={() => {
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    setTimelineStart(today);
                  }}
                  onBookingClick={openBookingDetail}
                />
              </div>
            </>
          )}

          {!loading && view === "calendar" && (
            <CalendarView
              bookings={filteredBookings}
              currentMonth={calendarMonth}
              onPreviousMonth={() => {
                const newMonth = new Date(calendarMonth);
                newMonth.setMonth(newMonth.getMonth() - 1);
                setCalendarMonth(newMonth);
                setSelectedDay(null);
              }}
              onNextMonth={() => {
                const newMonth = new Date(calendarMonth);
                newMonth.setMonth(newMonth.getMonth() + 1);
                setCalendarMonth(newMonth);
                setSelectedDay(null);
              }}
              selectedDay={selectedDay}
              onSelectDay={setSelectedDay}
              onBookingClick={openBookingDetail}
            />
          )}
        </div>
      </PageContainer>

      {/* Booking Detail Panel */}
      {showBookingDetail && selectedBooking && (
        <div className="fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div className="flex-1 bg-black/50" onClick={closeBookingDetail} />
          {/* Panel */}
          <div className="w-full max-w-[calc(100vw-1rem)] sm:max-w-lg bg-white shadow-xl overflow-y-auto" tabIndex={0} autoFocus role="dialog" aria-modal="true" aria-label="Booking details">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between z-10">
              <h2 className="text-lg font-semibold text-gray-900">Booking Details</h2>
              <button onClick={closeBookingDetail} aria-label="Close booking details" className="p-2 text-gray-400 hover:text-gray-600 -mr-2">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 space-y-6">
              {/* Booking ID & Status */}
              <div>
                <p className="text-xs text-gray-500">Booking ID</p>
                <p className="font-mono text-purple-600 font-bold">{selectedBooking.id}</p>
                <Badge className={`mt-1 ${statusColors[selectedBooking.status] || "bg-gray-100"}`}>
                  {selectedBooking.status}
                </Badge>
              </div>

              {/* Customer Info */}
              <div>
                <h3 className="font-semibold text-sm text-gray-500 uppercase mb-2">Customer</h3>
                <p className="font-medium">{selectedBooking.customer_name}</p>
                <p className="text-sm text-gray-500">{selectedBooking.customer_email}</p>
                {selectedBooking.customer_phone && (
                  <p className="text-sm text-gray-500">{selectedBooking.customer_phone}</p>
                )}
              </div>

              {/* ID Document */}
              {selectedBooking.id_document_url && (
                <div>
                  <h3 className="font-semibold text-sm text-gray-500 uppercase mb-2">ID Document</h3>
                  <a
                    href={selectedBooking.id_document_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block"
                  >
                    <img
                      src={selectedBooking.id_document_url}
                      alt="Customer ID"
                      loading="lazy"
                      className="rounded-lg border max-h-48 object-contain"
                    />
                    <p className="text-xs text-purple-600 mt-1">Click to view full size</p>
                  </a>
                </div>
              )}

              {/* Vehicle */}
              <div>
                <h3 className="font-semibold text-sm text-gray-500 uppercase mb-2">Vehicle</h3>
                <p className="font-medium">{selectedBooking.vehicleName || "Unknown Vehicle"}</p>
              </div>

              {/* Dates and Times */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500">Pickup Date</p>
                  <p className="text-lg font-bold text-gray-900">{formatDate(selectedBooking.pickup_date)}</p>
                  <p className="text-xs text-gray-500 mt-1">Time</p>
                  <p className="text-xl font-bold text-purple-500">{formatTime(selectedBooking.pickup_time)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Return Date</p>
                  <p className="text-lg font-bold text-gray-900">{formatDate(selectedBooking.return_date)}</p>
                  <p className="text-xs text-gray-500 mt-1">Time</p>
                  <p className="text-xl font-bold text-purple-500">{formatTime(selectedBooking.return_time)}</p>
                </div>
              </div>

              {/* Insurance Status */}
              <div>
                <h3 className="font-semibold text-sm text-gray-500 uppercase mb-2">Insurance</h3>
                {selectedBooking.insurance_opted_out ? (
                  <div>
                    <Badge className="bg-yellow-100 text-yellow-700">Opted Out (Own Coverage)</Badge>
                    {selectedBooking.insurance_proof_url && (
                      <a
                        href={selectedBooking.insurance_proof_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block mt-2"
                      >
                        <img
                          src={selectedBooking.insurance_proof_url}
                          alt="Insurance Proof"
                          loading="lazy"
                          className="rounded-lg border max-h-48 object-contain"
                        />
                        <p className="text-xs text-purple-600 mt-1">Click to view full size</p>
                      </a>
                    )}
                  </div>
                ) : (
                  <Badge className="bg-green-100 text-green-700">NextGearAuto Insurance Included</Badge>
                )}
              </div>

              {/* Payment */}
              <div>
                <h3 className="font-semibold text-sm text-gray-500 uppercase mb-2">Payment</h3>
                <div className="flex justify-between py-2 border-b border-gray-200">
                  <span className="text-gray-500">Total</span>
                  <span className="font-bold text-lg text-gray-900">${(selectedBooking.total_price ?? 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-200">
                  <span className="text-gray-500">Paid</span>
                  <span className="text-green-600 font-semibold">${(selectedBooking.deposit ?? 0).toFixed(2)}</span>
                </div>
              </div>

              {/* Agreement */}
              <div>
                <h3 className="font-semibold text-sm text-gray-500 uppercase mb-2">Agreement</h3>
                {selectedBooking.signed_name || selectedBooking.rental_agreement_url ? (
                  <>
                    {selectedBooking.signed_name && (
                      <p className="font-serif italic">{selectedBooking.signed_name}</p>
                    )}
                    <p className="text-xs text-gray-400">
                      {selectedBooking.agreement_signed_at
                        ? new Date(selectedBooking.agreement_signed_at).toLocaleString()
                        : ""}
                    </p>
                    {selectedBooking.rental_agreement_url && (
                      <a
                        href={selectedBooking.rental_agreement_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2 inline-flex items-center gap-1.5 text-sm text-purple-600 hover:text-purple-800 font-medium"
                      >
                        View Signed Agreement &rarr;
                      </a>
                    )}
                  </>
                ) : (
                  <p className="text-xs text-gray-400">Not yet signed</p>
                )}
              </div>

              {/* Created at */}
              <div className="pt-4 border-t border-gray-200">
                <p className="text-xs text-gray-400">
                  Created {new Date(selectedBooking.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

interface BlockedDateEntry {
  id: string;
  vehicle_id: string;
  start_date: string;
  end_date: string;
  source: string;
  reason: string | null;
}

/* ═══════════════════════════════════════════════════
   MOBILE AGENDA VIEW — day-by-day card layout
   ═══════════════════════════════════════════════════ */

interface MobileAgendaViewProps {
  bookings: BookingRow[];
  vehicles: Vehicle[];
  blockedDates: BlockedDateEntry[];
  start: Date;
  onPrevious: () => void;
  onNext: () => void;
  onToday: () => void;
  onBookingClick: (booking: BookingRow) => void;
}

function MobileAgendaView({
  bookings,
  vehicles,
  blockedDates,
  start,
  onPrevious,
  onNext,
  onToday,
  onBookingClick,
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
    return bookings.filter((b) => {
      const pk = (b.pickup_date || "").split("T")[0];
      const rk = (b.return_date || "").split("T")[0];
      return pk <= selectedDateKey && rk >= selectedDateKey;
    });
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
      counts[k] = bookings.filter((b) => {
        const pk = (b.pickup_date || "").split("T")[0];
        const rk = (b.return_date || "").split("T")[0];
        return pk <= k && rk >= k;
      }).length;
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
        <div className="flex items-stretch px-1.5 py-2 gap-1 overflow-x-auto scrollbar-hide">
          {dateRange.map((date) => {
            const key = toKey(date);
            const isToday = key === todayKey;
            const isSelected = key === selectedDateKey;
            const count = bookingCountByDate[key] || 0;

            return (
              <button
                key={key}
                onClick={() => setSelectedDateKey(key)}
                className={`flex flex-col items-center min-w-[46px] flex-1 py-2 px-1 rounded-xl transition-all active:scale-95 ${
                  isSelected
                    ? "bg-purple-600 text-white shadow-md shadow-purple-200"
                    : isToday
                    ? "bg-purple-50 text-purple-700"
                    : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                <span className={`text-[10px] font-medium uppercase leading-none ${isSelected ? "text-purple-200" : isToday ? "text-purple-500" : "text-gray-400"}`}>
                  {date.toLocaleDateString("en-US", { weekday: "short" })}
                </span>
                <span className={`text-lg font-bold leading-tight mt-0.5 ${isSelected ? "text-white" : ""}`}>
                  {date.getDate()}
                </span>
                {count > 0 && (
                  <div className={`w-1.5 h-1.5 rounded-full mt-0.5 ${isSelected ? "bg-white" : "bg-purple-400"}`} />
                )}
              </button>
            );
          })}
        </div>
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
          const pickupKey = (booking.pickup_date || "").split("T")[0];
          const returnKey = (booking.return_date || "").split("T")[0];
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
                          <span className="text-gray-400 mx-0.5">→</span>
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
            <div
              key={bd.id}
              className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-4"
            >
              <div className="flex items-center gap-3">
                <div className="w-1 self-stretch rounded-full bg-gray-300 shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-500">
                    {bd.source === "turo-email" ? "Turo Block" : "Blocked"}
                    {bd.reason ? ` — ${bd.reason}` : ""}
                  </p>
                  <p className="text-xs text-gray-400 truncate">
                    {vehicle ? `${vehicle.year} ${vehicle.make} ${vehicle.model}` : "Unknown vehicle"}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   DESKTOP TIMELINE VIEW — horizontal table
   ═══════════════════════════════════════════════════ */

interface TimelineViewProps {
  bookings: BookingRow[];
  vehicles: Vehicle[];
  blockedDates: BlockedDateEntry[];
  start: Date;
  onPrevious: () => void;
  onNext: () => void;
  onToday: () => void;
  onBookingClick: (booking: BookingRow) => void;
}

function TimelineView({
  bookings,
  vehicles,
  blockedDates,
  start,
  onPrevious,
  onNext,
  onToday,
  onBookingClick,
}: TimelineViewProps) {
  const days = 9;
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
    const rangeStart = dateKeys[0];
    const rangeEnd = dateKeys[days - 1];

    return vehicleBookings
      .map((booking) => {
        const pickupKey = booking.pickup_date.split("T")[0];
        const returnKey = booking.return_date.split("T")[0];

        if (returnKey < rangeStart || pickupKey > rangeEnd) return null;

        const clampedStart = pickupKey < rangeStart ? rangeStart : pickupKey;
        const clampedEnd = returnKey > rangeEnd ? rangeEnd : returnKey;

        const startIdx = dateKeys.indexOf(clampedStart);
        const endIdx = dateKeys.indexOf(clampedEnd);

        if (startIdx === -1 || endIdx === -1) return null;

        // Track if booking extends beyond visible range
        const extendsLeft = pickupKey < rangeStart;
        const extendsRight = returnKey > rangeEnd;

        // Calculate fractional offsets based on pickup/return times
        // startFraction: how far into the first day the booking starts (0 = midnight, 0.5 = noon)
        // endFraction: how far into the last day the booking ends (0.5 = noon, 1 = end of day)
        let startFraction = 0;
        let endFraction = 1;

        if (!extendsLeft && booking.pickup_time) {
          const [h, m] = booking.pickup_time.split(":").map(Number);
          if (!isNaN(h)) startFraction = (h + (m || 0) / 60) / 24;
        }
        if (!extendsRight && booking.return_time) {
          const [h, m] = booking.return_time.split(":").map(Number);
          if (!isNaN(h)) endFraction = (h + (m || 0) / 60) / 24;
        }

        return { booking, startIdx, endIdx, extendsLeft, extendsRight, startFraction, endFraction };
      })
      .filter(Boolean) as { booking: BookingRow; startIdx: number; endIdx: number; extendsLeft: boolean; extendsRight: boolean; startFraction: number; endFraction: number }[];
  };

  const today = toDateKey(new Date());
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
      counts[v.id] = vBookings.filter((b) => {
        const pk = (b.pickup_date || "").split("T")[0];
        const rk = (b.return_date || "").split("T")[0];
        return !(rk < rangeStart || pk > rangeEnd);
      }).length;
    });
    return counts;
  }, [bookingsByVehicle, vehicles, dateKeys]);

  return (
    <Card className="shadow-sm">
      <CardContent className="p-6">
        {/* Date Navigation */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
              <Button onClick={onPrevious} variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-gray-200">
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button onClick={onToday} variant="ghost" size="sm" className="h-8 px-3 hover:bg-gray-200 text-xs font-semibold">
                Today
              </Button>
              <Button onClick={onNext} variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-gray-200">
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
            <span className="text-sm font-semibold text-gray-800">
              {dateRange[0].toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              })}{" "}
              &ndash;{" "}
              {dateRange[days - 1].toLocaleDateString("en-US", {
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

        {/* Timeline Table */}
        <div className="overflow-x-auto border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <table className="w-full border-collapse" style={{ tableLayout: "fixed" }}>
            <colgroup>
              <col style={{ width: "170px", minWidth: "170px" }} />
              {dateRange.map((_, i) => (
                <col key={i} style={{ minWidth: "72px" }} />
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
                          <p className="text-sm font-semibold text-gray-900 truncate">
                            {vehicle.make} {vehicle.model}
                          </p>
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
                            const pickupDate = booking.pickup_date ? booking.pickup_date.split("T")[0] : "";
                            const returnDate = booking.return_date ? booking.return_date.split("T")[0] : "";
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
                              const clampedStartKey = bd.start_date < dateKeys[0] ? dateKeys[0] : bd.start_date;
                              const clampedEndKey = bd.end_date > dateKeys[dateKeys.length - 1] ? dateKeys[dateKeys.length - 1] : bd.end_date;
                              const startIdx = dateKeys.indexOf(clampedStartKey);
                              const endIdx = dateKeys.indexOf(clampedEndKey);
                              const span = endIdx - startIdx + 1;
                              return (
                                <div
                                  key={bd.id}
                                  className="absolute top-1 bottom-1 rounded-md bg-gray-300/50 border border-dashed border-gray-400 z-[1] flex items-center px-2 pointer-events-none"
                                  style={{ left: "0%", width: `${span * 100}%` }}
                                  title={bd.reason || `Blocked (${bd.source})`}
                                >
                                  <span className="text-[10px] text-gray-500 font-medium truncate">
                                    {bd.source === "turo-email" ? "Turo" : "Blocked"}
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
            <span className="text-gray-600">Blocked</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface CalendarViewProps {
  bookings: BookingRow[];
  currentMonth: Date;
  onPreviousMonth: () => void;
  onNextMonth: () => void;
  selectedDay: string | null;
  onSelectDay: (day: string | null) => void;
  onBookingClick: (booking: BookingRow) => void;
}

function CalendarView({
  bookings,
  currentMonth,
  onPreviousMonth,
  onNextMonth,
  selectedDay,
  onSelectDay,
  onBookingClick,
}: CalendarViewProps) {
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
  const bookingsByDay: Record<string, BookingRow[]> = {};
  bookings.forEach((booking) => {
    const pickupDate = new Date(booking.pickup_date + "T00:00:00");
    const returnDate = new Date(booking.return_date + "T00:00:00");
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
      const dateKey = currentDate.toISOString().split("T")[0];
      if (!bookingsByDay[dateKey]) {
        bookingsByDay[dateKey] = [];
      }
      bookingsByDay[dateKey].push(booking);
      currentDate.setDate(currentDate.getDate() + 1);
    }
  });

  const selectedDayBookings = selectedDay ? (bookingsByDay[selectedDay] || []) : [];

  return (
    <Card>
      <CardContent className="p-6">
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
                day && new Date(year, month, day).toISOString().split("T")[0];
              const dayBookings = dateKey ? (bookingsByDay[dateKey] || []) : [];
              const isSelected = dateKey === selectedDay;
              const isToday = dateKey === new Date().toISOString().split("T")[0];

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
                      {dayBookings.length > 0 && (
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
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected Day Details */}
        {selectedDay && selectedDayBookings.length > 0 && (
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
                        {booking.vehicleName || "Unknown Vehicle"}
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
                    <span>{formatDate(booking.pickup_date)}</span>
                    <span className="font-bold text-purple-600">{formatTime(booking.pickup_time)}</span>
                    <span className="text-gray-400">→</span>
                    <span>{formatDate(booking.return_date)}</span>
                    <span className="font-bold text-purple-600">{formatTime(booking.return_time)}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {selectedDay && selectedDayBookings.length === 0 && (
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
