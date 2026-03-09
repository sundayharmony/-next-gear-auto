"use client";

import React, { useEffect, useState, useMemo } from "react";
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
import { PageContainer } from "@/components/layout/page-container";
import { adminFetch } from "@/lib/utils/admin-fetch";
import { formatTime, formatDate } from "@/lib/utils/date-helpers";

interface BookingRow {
  id: string;
  customer_name: string;
  customer_email: string;
  customer_phone?: string;
  vehicleName: string;
  vehicle_id: string;
  pickup_date: string;
  return_date: string;
  pickup_time?: string;
  return_time?: string;
  total_price: number;
  deposit: number;
  status: string;
  created_at: string;
  id_document_url?: string;
  insurance_proof_url?: string;
  insurance_opted_out?: boolean;
  signed_name?: string;
  agreement_signed_at?: string;
  rental_agreement_url?: string;
}

interface Vehicle {
  id: string;
  year: number;
  make: string;
  model: string;
}

const statusColors: Record<string, string> = {
  pending: "bg-yellow-200 text-yellow-800",
  confirmed: "bg-green-200 text-green-800",
  active: "bg-blue-200 text-blue-800",
  completed: "bg-gray-200 text-gray-700",
  cancelled: "bg-red-200 text-red-800",
};

const statusBgColors: Record<string, string> = {
  pending: "bg-yellow-100",
  confirmed: "bg-green-100",
  active: "bg-blue-100",
  completed: "bg-gray-100",
  cancelled: "bg-red-100",
};

const statusBorderColors: Record<string, string> = {
  pending: "border-yellow-400",
  confirmed: "border-green-400",
  active: "border-blue-400",
  completed: "border-gray-400",
  cancelled: "border-red-400",
};

export default function AdminCalendarPage() {
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

  const openBookingDetail = (booking: BookingRow) => {
    setSelectedBooking(booking);
    setShowBookingDetail(true);
  };

  const closeBookingDetail = () => {
    setShowBookingDetail(false);
    setSelectedBooking(null);
  };

  // Build date range for API filtering (3 months window around current view)
  const getDateRange = () => {
    const from = new Date(view === "timeline" ? timelineStart : calendarMonth);
    from.setMonth(from.getMonth() - 1);
    const to = new Date(view === "timeline" ? timelineStart : calendarMonth);
    to.setMonth(to.getMonth() + 2);
    const pad = (n: number) => String(n).padStart(2, "0");
    return {
      from: `${from.getFullYear()}-${pad(from.getMonth() + 1)}-${pad(from.getDate())}`,
      to: `${to.getFullYear()}-${pad(to.getMonth() + 1)}-${pad(to.getDate())}`,
    };
  };

  const fetchBookings = async () => {
    const { from, to } = getDateRange();
    try {
      const res = await fetch(`/api/bookings?from=${from}&to=${to}`);
      if (res.ok) {
        const data = await res.json();
        setBookings((data.data || []).filter((b: BookingRow) => b.status !== "cancelled"));
      }
    } catch (error) {
      console.error("Failed to fetch bookings:", error);
    }
  };

  // Fetch data on mount and when view/date range changes
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [, vehiclesRes] = await Promise.all([
          fetchBookings(),
          adminFetch("/api/admin/vehicles"),
        ]);

        if (vehiclesRes.ok) {
          const data = await vehiclesRes.json();
          setVehicles(data.data || []);
        }
      } catch (error) {
        console.error("Failed to fetch calendar data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Re-fetch bookings when navigating timeline or calendar
  useEffect(() => {
    fetchBookings();
  }, [timelineStart, calendarMonth]);

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
      const [, vehiclesRes] = await Promise.all([
        fetchBookings(),
        adminFetch("/api/admin/vehicles"),
      ]);

      if (vehiclesRes.ok) {
        const data = await vehiclesRes.json();
        setVehicles(data.data || []);
      }
    } catch (error) {
      console.error("Failed to refresh calendar data:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <PageContainer>
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">Booking Calendar</h1>
              <p className="text-gray-600">Manage all vehicle reservations</p>
            </div>
            <Button
              onClick={handleRefresh}
              disabled={loading}
              variant="outline"
              size="sm"
              className="gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </Button>
          </div>

          {/* Controls */}
          <div className="flex flex-col gap-4 mb-6">
            {/* View Toggle */}
            <div className="flex gap-2">
              <Button
                onClick={() => setView("timeline")}
                variant={view === "timeline" ? "default" : "outline"}
                size="sm"
                className="gap-2"
              >
                <LayoutList className="w-4 h-4" />
                Timeline
              </Button>
              <Button
                onClick={() => setView("calendar")}
                variant={view === "calendar" ? "default" : "outline"}
                size="sm"
                className="gap-2"
              >
                <Calendar className="w-4 h-4" />
                Calendar
              </Button>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-2 items-center">
              <span className="text-sm font-medium text-gray-700">Status:</span>
              <div className="flex flex-wrap gap-2">
                {["all", "pending", "confirmed", "active", "completed"].map((status) => (
                  <Button
                    key={status}
                    onClick={() => setStatusFilter(status)}
                    variant={statusFilter === status ? "default" : "outline"}
                    size="sm"
                    className="capitalize"
                  >
                    {status === "all" ? "All" : status}
                  </Button>
                ))}
              </div>
            </div>

            {/* Vehicle Filter */}
            <div className="flex gap-2 items-center">
              <span className="text-sm font-medium text-gray-700">Vehicle:</span>
              <select
                value={vehicleFilter}
                onChange={(e) => setVehicleFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="all">All Vehicles</option>
                {vehicles.map((vehicle) => (
                  <option key={vehicle.id} value={vehicle.id}>
                    {vehicle.year} {vehicle.make} {vehicle.model}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
            </div>
          )}

          {!loading && view === "timeline" && (
            <TimelineView
              bookings={filteredBookings}
              vehicles={vehicles}
              start={timelineStart}
              onPrevious={() => {
                const newStart = new Date(timelineStart);
                newStart.setDate(newStart.getDate() - 14);
                setTimelineStart(newStart);
              }}
              onNext={() => {
                const newStart = new Date(timelineStart);
                newStart.setDate(newStart.getDate() + 14);
                setTimelineStart(newStart);
              }}
              onToday={() => {
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                setTimelineStart(today);
              }}
              onBookingClick={openBookingDetail}
            />
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
          <div className="w-full max-w-lg bg-white shadow-xl overflow-y-auto">
            <div className="sticky top-0 bg-white border-b p-4 flex items-center justify-between z-10">
              <h2 className="text-lg font-semibold">Booking Details</h2>
              <button onClick={closeBookingDetail} className="text-gray-400 hover:text-gray-600">
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
                      className="rounded-lg border max-h-48 object-contain"
                    />
                    <p className="text-xs text-purple-600 mt-1">Click to view full size</p>
                  </a>
                </div>
              )}

              {/* Vehicle */}
              <div>
                <h3 className="font-semibold text-sm text-gray-500 uppercase mb-2">Vehicle</h3>
                <p className="font-medium">{selectedBooking.vehicleName || selectedBooking.vehicle_id}</p>
              </div>

              {/* Dates and Times */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500">Pickup Date</p>
                  <p className="text-lg font-bold text-gray-900">{formatDate(selectedBooking.pickup_date)}</p>
                  <p className="text-xs text-gray-500 mt-1">Time</p>
                  <p className="text-xl font-bold text-purple-600">{formatTime(selectedBooking.pickup_time)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Return Date</p>
                  <p className="text-lg font-bold text-gray-900">{formatDate(selectedBooking.return_date)}</p>
                  <p className="text-xs text-gray-500 mt-1">Time</p>
                  <p className="text-xl font-bold text-purple-600">{formatTime(selectedBooking.return_time)}</p>
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
                <div className="flex justify-between py-2 border-b">
                  <span className="text-gray-500">Total</span>
                  <span className="font-bold text-lg">${selectedBooking.total_price?.toFixed(2)}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-gray-500">Paid</span>
                  <span className="text-green-600 font-semibold">${selectedBooking.deposit?.toFixed(2)}</span>
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
              <div className="pt-4 border-t">
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

interface TimelineViewProps {
  bookings: BookingRow[];
  vehicles: Vehicle[];
  start: Date;
  onPrevious: () => void;
  onNext: () => void;
  onToday: () => void;
  onBookingClick: (booking: BookingRow) => void;
}

function TimelineView({
  bookings,
  vehicles,
  start,
  onPrevious,
  onNext,
  onToday,
  onBookingClick,
}: TimelineViewProps) {
  const days = 14;
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

        return { booking, startIdx, endIdx };
      })
      .filter(Boolean) as { booking: BookingRow; startIdx: number; endIdx: number }[];
  };

  const today = toDateKey(new Date());

  return (
    <Card>
      <CardContent className="p-6">
        {/* Date Navigation */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex gap-2">
            <Button onClick={onPrevious} variant="outline" size="sm">
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button onClick={onToday} variant="outline" size="sm">
              Today
            </Button>
            <Button onClick={onNext} variant="outline" size="sm">
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
          <div className="text-sm font-medium text-gray-600">
            {dateRange[0].toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}{" "}
            -{" "}
            {dateRange[days - 1].toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </div>
        </div>

        {/* Timeline Table */}
        <div className="overflow-x-auto border border-gray-200 rounded-lg">
          <table className="w-full border-collapse" style={{ tableLayout: "fixed" }}>
            <colgroup>
              <col style={{ width: "180px", minWidth: "180px" }} />
              {dateRange.map((_, i) => (
                <col key={i} style={{ minWidth: "70px" }} />
              ))}
            </colgroup>
            <thead>
              <tr>
                <th className="sticky left-0 z-10 bg-purple-50 border-b border-r border-gray-200 p-3 text-left text-sm font-semibold text-gray-900">
                  Vehicles
                </th>
                {dateRange.map((date, i) => (
                  <th
                    key={i}
                    className={`border-b border-r border-gray-200 p-2 text-center text-xs font-medium ${
                      toDateKey(date) === today
                        ? "bg-purple-100 text-purple-800"
                        : "bg-purple-50 text-gray-700"
                    }`}
                  >
                    <div>{date.toLocaleDateString("en-US", { weekday: "short" })}</div>
                    <div className="font-semibold">{date.getDate()}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {vehicles.map((vehicle) => {
                const visibleBookings = getVisibleBookings(vehicle.id);
                return (
                  <tr key={vehicle.id} className="group">
                    <td className="sticky left-0 z-10 bg-white border-b border-r border-gray-200 p-3 text-sm font-medium text-gray-900 whitespace-nowrap">
                      {vehicle.year} {vehicle.make} {vehicle.model}
                    </td>
                    {dateRange.map((date, dateIdx) => {
                      const isToday = toDateKey(date) === today;
                      const bookingStartingHere = visibleBookings.filter(
                        (vb) => vb.startIdx === dateIdx
                      );

                      return (
                        <td
                          key={dateIdx}
                          className={`border-b border-r border-gray-200 p-0 h-14 relative ${
                            isToday ? "bg-purple-50/50" : "bg-white"
                          }`}
                        >
                          {bookingStartingHere.map(({ booking, startIdx, endIdx }) => {
                            const span = endIdx - startIdx + 1;
                            return (
                              <div
                                key={booking.id}
                                onClick={() => onBookingClick(booking)}
                                className={`absolute top-1 bottom-1 left-0.5 ${statusBgColors[booking.status]} border-2 ${statusBorderColors[booking.status]} rounded-md px-2 flex items-center overflow-hidden cursor-pointer hover:shadow-lg hover:brightness-95 transition-all z-[5]`}
                                style={{
                                  width: `calc(${span * 100}% - 4px)`,
                                }}
                                title={`${booking.customer_name} — Click to view details`}
                              >
                                <span className="text-xs font-bold text-gray-800 truncate">
                                  {booking.customer_name}
                                </span>
                                {span >= 3 && (
                                  <span className="text-xs text-gray-600 ml-1 truncate hidden sm:inline">
                                    · ${booking.total_price.toFixed(0)}
                                  </span>
                                )}
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
                    className="text-center text-gray-500 py-12 text-sm"
                  >
                    No vehicles found. Add vehicles in the Fleet Management page.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Legend */}
        <div className="mt-6 pt-4 border-t border-gray-200 flex flex-wrap gap-4 text-xs">
          {Object.entries(statusColors).map(([status]) => (
            <div key={status} className="flex items-center gap-2">
              <div
                className={`w-4 h-4 rounded ${statusBgColors[status]} border-2 ${statusBorderColors[status]}`}
              ></div>
              <span className="capitalize">{status}</span>
            </div>
          ))}
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
    const pickupDate = new Date(booking.pickup_date);
    const returnDate = new Date(booking.return_date);
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
          <h2 className="text-lg font-semibold text-gray-900 min-w-48 text-center">
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
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
              <div
                key={day}
                className="bg-purple-50 p-3 text-center font-semibold text-xs text-gray-700"
              >
                {day}
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

              return (
                <div
                  key={index}
                  onClick={() => dateKey && onSelectDay(isSelected ? null : dateKey)}
                  className={`min-h-24 p-2 cursor-pointer transition-colors ${
                    day
                      ? isSelected
                        ? "bg-purple-100 border-2 border-purple-600"
                        : "bg-white hover:bg-gray-50"
                      : "bg-gray-50"
                  }`}
                >
                  {day && (
                    <>
                      <div className="font-semibold text-gray-900 text-sm mb-1">
                        {day}
                      </div>
                      <div className="space-y-1">
                        {dayBookings.slice(0, 2).map((booking) => (
                          <div
                            key={booking.id}
                            className={`text-xs p-1 rounded truncate ${statusColors[booking.status]}`}
                            title={booking.vehicleName}
                          >
                            {booking.vehicleName.split(" ").slice(1).join(" ")}
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
                {new Date(selectedDay).toLocaleDateString("en-US", {
                  weekday: "long",
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </h3>
              <button
                onClick={() => onSelectDay(null)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="w-4 h-4 text-gray-600" />
              </button>
            </div>

            <div className="space-y-3">
              {selectedDayBookings.map((booking) => (
                <div
                  key={booking.id}
                  onClick={() => onBookingClick(booking)}
                  className="border border-gray-200 rounded-lg p-4 bg-gray-50 cursor-pointer hover:bg-gray-100 hover:border-purple-300 transition-colors"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="font-semibold text-gray-900">
                        {booking.customer_name}
                      </div>
                      <div className="text-sm text-gray-600">
                        {booking.customer_email}
                      </div>
                    </div>
                    <Badge className={statusColors[booking.status]}>
                      {booking.status}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm mt-3">
                    <div>
                      <span className="text-gray-600">Vehicle:</span>
                      <div className="font-medium text-gray-900">
                        {booking.vehicleName}
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-600">Price:</span>
                      <div className="font-medium text-gray-900">
                        ${booking.total_price.toFixed(2)}
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-600">Pickup:</span>
                      <div>
                        <span className="text-base font-bold text-black">{new Date(booking.pickup_date).toLocaleDateString()}</span> at <span className="text-lg font-bold text-purple-600">{formatTime(booking.pickup_time)}</span>
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-600">Return:</span>
                      <div>
                        <span className="text-base font-bold text-black">{new Date(booking.return_date).toLocaleDateString()}</span> at <span className="text-lg font-bold text-purple-600">{formatTime(booking.return_time)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {selectedDay && selectedDayBookings.length === 0 && (
          <div className="border-t border-gray-200 pt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                {new Date(selectedDay).toLocaleDateString("en-US", {
                  weekday: "long",
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </h3>
              <button
                onClick={() => onSelectDay(null)}
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
