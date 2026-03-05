"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Filter,
  LayoutList,
  Calendar,
  X,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageContainer } from "@/components/layout/page-container";
import { adminFetch } from "@/lib/utils/admin-fetch";

interface BookingRow {
  id: string;
  customer_name: string;
  customer_email: string;
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

const formatTime = (t?: string) => {
  if (!t) return "";
  const [h, m] = t.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${ampm}`;
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

  // Fetch data
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [bookingsRes, vehiclesRes] = await Promise.all([
          fetch("/api/bookings"),
          adminFetch("/api/admin/vehicles"),
        ]);

        if (bookingsRes.ok) {
          const data = await bookingsRes.json();
          // Exclude cancelled bookings from calendar
          setBookings((data.data || []).filter((b: BookingRow) => b.status !== "cancelled"));
        }

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

  // Filter bookings
  const filteredBookings = useMemo(() => {
    return bookings.filter((booking) => {
      const statusMatch =
        statusFilter === "all" || booking.status === statusFilter;
      const vehicleMatch =
        vehicleFilter === "all" || booking.vehicle_id === vehicleFilter;
      return statusMatch && vehicleMatch;
    });
  }, [bookings, statusFilter, vehicleFilter]);

  const handleRefresh = async () => {
    setLoading(true);
    try {
      const [bookingsRes, vehiclesRes] = await Promise.all([
        fetch("/api/bookings"),
        adminFetch("/api/admin/vehicles"),
      ]);

      if (bookingsRes.ok) {
        const data = await bookingsRes.json();
        setBookings(data.data || []);
      }

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
    <PageContainer>
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              Booking Calendar
            </h1>
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
              {["all", "pending", "confirmed", "active", "completed"].map(
                (status) => (
                  <Button
                    key={status}
                    onClick={() => setStatusFilter(status)}
                    variant={statusFilter === status ? "default" : "outline"}
                    size="sm"
                    className="capitalize"
                  >
                    {status === "all" ? "All" : status}
                  </Button>
                )
              )}
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
          />
        )}
      </div>
    </PageContainer>
  );
}

interface TimelineViewProps {
  bookings: BookingRow[];
  vehicles: Vehicle[];
  start: Date;
  onPrevious: () => void;
  onNext: () => void;
  onToday: () => void;
}

function TimelineView({
  bookings,
  vehicles,
  start,
  onPrevious,
  onNext,
  onToday,
}: TimelineViewProps) {
  const days = 14;
  const dateRange = Array.from({ length: days }, (_, i) => {
    const date = new Date(start);
    date.setDate(date.getDate() + i);
    return date;
  });

  // Helper: parse "YYYY-MM-DD" as local date (no timezone shift)
  const parseLocalDate = (dateStr: string) => {
    const [y, m, d] = dateStr.split("-").map(Number);
    return new Date(y, m - 1, d);
  };

  // Helper: format date as "YYYY-MM-DD" in local time
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

  // Get visible bookings for a vehicle (only those overlapping the visible range)
  const getVisibleBookings = (vehicleId: string) => {
    const vehicleBookings = bookingsByVehicle[vehicleId] || [];
    const rangeStart = dateKeys[0];
    const rangeEnd = dateKeys[days - 1];

    return vehicleBookings
      .map((booking) => {
        const pickupKey = booking.pickup_date.split("T")[0];
        const returnKey = booking.return_date.split("T")[0];

        // Skip bookings entirely outside the visible range
        if (returnKey < rangeStart || pickupKey > rangeEnd) return null;

        // Clamp to visible range
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
                    {/* Render cells with booking bars */}
                    {dateRange.map((date, dateIdx) => {
                      const isToday = toDateKey(date) === today;

                      // Check if any booking starts on this cell
                      const bookingStartingHere = visibleBookings.filter(
                        (vb) => vb.startIdx === dateIdx
                      );

                      // Check if this cell is covered by a booking (but not the start)
                      const coveredByBooking = visibleBookings.some(
                        (vb) => dateIdx > vb.startIdx && dateIdx <= vb.endIdx
                      );

                      // If covered by a booking bar (not start), skip rendering (colSpan handles it)
                      // We can't use colSpan in a simple way, so use relative positioning instead
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
                                className={`absolute top-1 bottom-1 left-0.5 ${statusBgColors[booking.status]} border-2 ${statusBorderColors[booking.status]} rounded-md px-2 flex items-center overflow-hidden cursor-pointer hover:shadow-lg hover:brightness-95 transition-all z-[5]`}
                                style={{
                                  width: `calc(${span * 100}% - 4px)`,
                                }}
                                title={`${booking.customer_name}\n${booking.pickup_date} at ${formatTime(booking.pickup_time)} → ${booking.return_date} at ${formatTime(booking.return_time)}\n$${booking.total_price.toFixed(2)} • ${booking.status}`}
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
}

function CalendarView({
  bookings,
  currentMonth,
  onPreviousMonth,
  onNextMonth,
  selectedDay,
  onSelectDay,
}: CalendarViewProps) {
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  // Get first day of month and number of days
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startingDayOfWeek = firstDay.getDay();

  // Create calendar grid
  const calendarDays: (number | null)[] = [];
  for (let i = 0; i < startingDayOfWeek; i++) {
    calendarDays.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    calendarDays.push(i);
  }

  // Pad to complete weeks
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

    let currentDate = new Date(pickupDateOnly);
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
                  className="border border-gray-200 rounded-lg p-4 bg-gray-50"
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
