"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import dynamic from "next/dynamic";
import type { BookingDbRow, VehicleListItem } from "@/lib/types";
import { RefreshCw, LayoutList, Calendar, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { AdminPageBody, AdminPageHeader } from "@/components/admin/admin-shell";
import { CreateBookingShell } from "@/app/admin/bookings/components/create-booking-shell";
import { adminFetch } from "@/lib/utils/admin-fetch";
import { useAutoToast } from "@/lib/hooks/useAutoToast";
import { getLocalYmd } from "@/lib/utils/date-helpers";
import type { BlockedDateEntry } from "./calendar-model";
import { filterTimelineVehicles } from "./calendar-booking-display";
import { getDefaultTimelineStart } from "./calendar-timeline-range";
import { TuroTripDetailPanel } from "@/app/admin/bookings/components/TuroTripDetailPanel";
import { InPersonAgreementSign } from "@/app/admin/bookings/components/InPersonAgreementSign";
import {
  adminBookingsConfig,
  managerBookingsConfig,
} from "@/app/admin/bookings/config";
import type { BookingRow as AdminBookingRow } from "@/app/admin/bookings/types";
import { AdminStatusBanner } from "@/components/admin/ui-feedback";
import {
  adminPanelConfig,
  type StaffPanelConfig,
} from "@/lib/admin/staff-panel-config";
import { staffKeys, useStaffQuery } from "@/lib/hooks/use-staff-query";
import type { CustomerOption } from "@/app/admin/bookings/types";
import { useCalendarData } from "./use-calendar-data";
import { TimelineShell } from "./timeline-shell";
import { MonthGrid } from "./month-grid";
import { BlockedDateDetailPanel } from "./blocked-date-detail-panel";

const BookingDetailPanel = dynamic(
  () =>
    import("@/app/admin/bookings/components/BookingDetailPanel").then(
      (m) => m.BookingDetailPanel
    ),
  { ssr: false }
);

const CreateBookingForm = dynamic(
  () => import("@/app/admin/bookings/components/CreateBookingForm"),
  { ssr: false }
);

type CalendarBookingRow = AdminBookingRow;
type Vehicle = VehicleListItem;
const TIMELINE_WINDOW_DAYS = 180;

const CALENDAR_VIEW_STORAGE_KEY = "nga-calendar-view";

export default function AdminCalendarPage({
  panelConfig = adminPanelConfig,
}: {
  panelConfig?: StaffPanelConfig;
}) {
  const calendarConfig =
    panelConfig.panelMode === "manager" ? managerBookingsConfig : adminBookingsConfig;
  const { error, setError, success, setSuccess } = useAutoToast();
  const bookingsEndpoint = calendarConfig.bookingsEndpoint;
  const [view, setViewState] = useState<"timeline" | "calendar">("timeline");

  useEffect(() => {
    try {
      const saved = localStorage.getItem(CALENDAR_VIEW_STORAGE_KEY);
      if (saved === "timeline" || saved === "calendar") {
        setViewState(saved);
      }
    } catch {
      /* ignore */
    }
  }, []);

  const setView = useCallback((next: "timeline" | "calendar") => {
    setViewState(next);
    try {
      localStorage.setItem(CALENDAR_VIEW_STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
  }, []);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [vehicleFilter, setVehicleFilter] = useState<string>("all");

  const [timelineStart, setTimelineStart] = useState<Date>(() => getDefaultTimelineStart());

  const [calendarViewDate, setCalendarViewDate] = useState<Date>(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    today.setDate(1);
    return today;
  });
  const calendarMonthStart = useMemo(() => {
    const d = new Date(calendarViewDate);
    d.setHours(0, 0, 0, 0);
    d.setDate(1);
    return d;
  }, [calendarViewDate]);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const [selectedBooking, setSelectedBooking] = useState<AdminBookingRow | null>(null);
  const [showBookingDetail, setShowBookingDetail] = useState(false);
  const [inPersonSignBooking, setInPersonSignBooking] = useState<AdminBookingRow | null>(null);
  const detailDirtyRef = React.useRef(false);

  const [selectedBlocked, setSelectedBlocked] = useState<BlockedDateEntry | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);

  const {
    bookings,
    setBookings,
    vehicles,
    blockedDates,
    loading,
    loadBookings,
    handleRefresh,
  } = useCalendarData({
    bookingsEndpoint,
    view,
    timelineStart,
    calendarMonthStart,
  });

  const customersQuery = useStaffQuery<
    { id: string; name: string; email: string; phone?: string | null }[]
  >(staffKeys.customers(), calendarConfig.customersEndpoint, { staleTime: 60_000 });

  const allCustomers = useMemo<CustomerOption[]>(
    () =>
      (customersQuery.data ?? []).map((c) => ({
        id: c.id,
        name: c.name,
        email: c.email,
        phone: c.phone || "",
      })),
    [customersQuery.data]
  );

  const openBookingDetail = (booking: AdminBookingRow) => {
    setSelectedBooking(booking);
    setShowBookingDetail(true);
  };

  const filteredBookings = useMemo(() => {
    return bookings.filter((booking) => {
      const statusMatch = statusFilter === "all" || booking.status === statusFilter;
      const vehicleMatch = vehicleFilter === "all" || booking.vehicle_id === vehicleFilter;
      return statusMatch && vehicleMatch;
    });
  }, [bookings, statusFilter, vehicleFilter]);

  const timelineVehicles = useMemo(
    () => filterTimelineVehicles(vehicles),
    [vehicles]
  );

  const closeBookingDetail = useCallback(() => {
    setShowBookingDetail(false);
    setSelectedBooking(null);
    if (detailDirtyRef.current) {
      detailDirtyRef.current = false;
      void loadBookings({ forceReplace: true });
    }
  }, [loadBookings]);

  const mergeBookingInList = useCallback((updated: AdminBookingRow) => {
    setBookings((prev) => {
      const i = prev.findIndex((b) => b.id === updated.id);
      if (i === -1) return prev;
      const next = [...prev];
      next[i] = { ...next[i], ...updated } as AdminBookingRow;
      return next;
    });
  }, [setBookings]);

  const updateBookingStatus = useCallback(
    async (bookingId: string, newStatus: string): Promise<boolean> => {
      if (bookingId.startsWith("turo:")) {
        setError("Turo trips cannot be updated from the calendar.");
        return false;
      }
      const booking = bookings.find((b) => b.id === bookingId) as AdminBookingRow | undefined;
      if (calendarConfig.mode === "manager" && booking?.canManage === false) {
        setError("You can only manage bookings you created.");
        return false;
      }

      try {
        const res = await adminFetch("/api/bookings", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ bookingId, status: newStatus }),
        });
        if (!res.ok) throw new Error(`Failed: ${res.status}`);
        const data = await res.json();
        if (data.success) {
          if (newStatus === "cancelled") {
            setBookings((prev) => prev.filter((b) => b.id !== bookingId));
            setSuccess("Booking cancelled");
          } else {
            setBookings((prev) =>
              prev.map((b) => (b.id === bookingId ? { ...b, status: newStatus } : b))
            );
            setSuccess(`Booking marked ${newStatus}`);
          }
          return true;
        }
        setError(data.message || `Failed to update booking to "${newStatus}"`);
        return false;
      } catch {
        setError("Network error — could not update booking");
        return false;
      }
    },
    [bookings, calendarConfig.mode, setBookings, setError, setSuccess]
  );

  const handleUpdateBookingInList = useCallback(
    (updated: AdminBookingRow) => {
      mergeBookingInList(updated);
      setSelectedBooking(updated);
      detailDirtyRef.current = true;
    },
    [mergeBookingInList]
  );

  const handleUpdateStatusFromDetail = useCallback(
    async (bookingId: string, newStatus: string) => {
      const ok = await updateBookingStatus(bookingId, newStatus);
      if (!ok) return false;
      if (newStatus === "cancelled") {
        closeBookingDetail();
      } else {
        setSelectedBooking((prev) =>
          prev && prev.id === bookingId ? ({ ...prev, status: newStatus } as AdminBookingRow) : prev
        );
      }
      detailDirtyRef.current = true;
      return true;
    },
    [updateBookingStatus, closeBookingDetail]
  );

  useEffect(() => {
    if (!selectedBooking || !showBookingDetail) return;
    const latest = bookings.find((b) => b.id === selectedBooking.id);
    if (!latest) {
      closeBookingDetail();
      return;
    }
    if (latest !== selectedBooking) {
      setSelectedBooking(latest);
    }
  }, [bookings, selectedBooking, showBookingDetail, closeBookingDetail]);

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

  const wheelThrottleRef = React.useRef(0);
  const WHEEL_DAY_THROTTLE_MS = 85;
  const handleCalendarWheelShift = useCallback((direction: number) => {
    const now = Date.now();
    if (now - wheelThrottleRef.current < WHEEL_DAY_THROTTLE_MS) return;
    wheelThrottleRef.current = now;
    setCalendarViewDate((prev) => {
      const next = new Date(prev);
      next.setHours(0, 0, 0, 0);
      next.setDate(next.getDate() + (direction > 0 ? 1 : -1));
      return next;
    });
  }, []);

  useEffect(() => {
    if (!selectedDay) return;
    const y = calendarMonthStart.getFullYear();
    const m = String(calendarMonthStart.getMonth() + 1).padStart(2, "0");
    const prefix = `${y}-${m}`;
    if (!selectedDay.startsWith(prefix)) {
      setSelectedDay(null);
    }
  }, [calendarMonthStart, selectedDay]);

  const goToToday = useCallback(() => {
    // Keep the lookback window — only scroll the timeline to today's column.
  }, []);

  const selectedBlockedVehicle = selectedBlocked
    ? vehicles.find((v) => v.id === selectedBlocked.vehicle_id)
    : undefined;

  return (
    <>
      <AdminPageHeader
        title="Booking Calendar"
        subtitle="Manage all vehicle reservations"
        actions={
          <div className="flex items-center gap-2">
            {calendarConfig.capabilities.canCreateBookings ? (
              <Button
                onClick={() => setShowCreateForm(true)}
                size="sm"
                className="gap-2 inline-flex"
              >
                <Plus className="w-4 h-4" />
                New Booking
              </Button>
            ) : null}
            <Button
              onClick={handleRefresh}
              disabled={loading}
              variant="outline"
              size="sm"
              aria-label="Refresh calendar"
              className="gap-2 page-hero-btn-outline hidden sm:inline-flex"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        }
      />

      <AdminPageBody className="py-4 sm:py-8">
        {success ? (
          <AdminStatusBanner type="success" message={success} onDismiss={() => setSuccess(null)} className="mb-4" />
        ) : null}
        {error ? (
          <AdminStatusBanner type="error" message={error} onDismiss={() => setError(null)} className="mb-4" />
        ) : null}
        <div className="mb-8">
          <div className="flex flex-col gap-3 sm:gap-4 mb-4 sm:mb-5">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
              <div className="flex items-center justify-between gap-2">
                <div className="inline-flex gap-1 rounded-lg border border-gray-200 bg-white p-1 shadow-sm">
                  <Button
                    onClick={() => setView("timeline")}
                    variant={view === "timeline" ? "default" : "ghost"}
                    size="sm"
                    className="gap-1.5 h-8 text-xs sm:text-sm"
                  >
                    <LayoutList className="w-3.5 h-3.5" />
                    Timeline
                  </Button>
                  <Button
                    onClick={() => setView("calendar")}
                    variant={view === "calendar" ? "default" : "ghost"}
                    size="sm"
                    className="gap-1.5 h-8 text-xs sm:text-sm"
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

              <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-2 sm:gap-3 min-w-0">
                <div
                  className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-hide"
                  role="group"
                  aria-labelledby="calendar-status-filter-label"
                >
                  <span id="calendar-status-filter-label" className="text-xs font-medium text-gray-500 shrink-0 mr-1">
                    Status
                  </span>
                  {["all", "pending", "confirmed", "active", "completed"].map((status) => (
                    <Button
                      key={status}
                      type="button"
                      onClick={() => setStatusFilter(status)}
                      variant={statusFilter === status ? "default" : "outline"}
                      size="sm"
                      aria-pressed={statusFilter === status}
                      className="capitalize h-7 text-[11px] sm:text-xs shrink-0 px-2.5"
                    >
                      {status === "all" ? "All" : status}
                    </Button>
                  ))}
                </div>

                <div className="flex gap-2 items-center min-w-0">
                  <span className="text-xs font-medium text-gray-500 shrink-0">Vehicle</span>
                  <Select
                    value={vehicleFilter}
                    onChange={(e) => setVehicleFilter(e.target.value)}
                    className="min-w-0 max-w-[220px] sm:max-w-none"
                  >
                    <option value="all">All Vehicles</option>
                    {timelineVehicles.map((vehicle) => (
                      <option key={vehicle.id} value={vehicle.id}>
                        {vehicle.year} {vehicle.make} {vehicle.model}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>
            </div>
          </div>

          {loading && (
            <div className="text-center py-12">
              <div
                role="status"
                aria-label="Loading calendar"
                aria-live="polite"
                className="animate-spin h-8 w-8 border-4 border-purple-600 border-t-transparent rounded-full mx-auto"
              />
              <p className="mt-4 text-gray-500">Loading calendar...</p>
            </div>
          )}

          {!loading && view === "timeline" && (
            <TimelineShell
              bookings={filteredBookings}
              vehicles={timelineVehicles}
              blockedDates={blockedDates}
              timelineStart={timelineStart}
              timelineWindowDays={TIMELINE_WINDOW_DAYS}
              onPreviousWeek={() => {
                const newStart = new Date(timelineStart);
                newStart.setDate(newStart.getDate() - 7);
                setTimelineStart(newStart);
              }}
              onNextWeek={() => {
                const newStart = new Date(timelineStart);
                newStart.setDate(newStart.getDate() + 7);
                setTimelineStart(newStart);
              }}
              onPreviousFortnight={() => {
                const newStart = new Date(timelineStart);
                newStart.setDate(newStart.getDate() - 14);
                setTimelineStart(newStart);
              }}
              onNextFortnight={() => {
                const newStart = new Date(timelineStart);
                newStart.setDate(newStart.getDate() + 14);
                setTimelineStart(newStart);
              }}
              onToday={goToToday}
              onBookingClick={openBookingDetail}
              onBlockedDateClick={setSelectedBlocked}
            />
          )}

          {!loading && view === "calendar" && (
            <MonthGrid
              bookings={filteredBookings as BookingDbRow[]}
              blockedDates={blockedDates}
              currentMonth={calendarMonthStart}
              onPreviousMonth={() => {
                const d = new Date(calendarMonthStart);
                d.setMonth(d.getMonth() - 1);
                setCalendarViewDate(d);
                setSelectedDay(null);
              }}
              onNextMonth={() => {
                const d = new Date(calendarMonthStart);
                d.setMonth(d.getMonth() + 1);
                setCalendarViewDate(d);
                setSelectedDay(null);
              }}
              selectedDay={selectedDay}
              onSelectDay={setSelectedDay}
              onBookingClick={openBookingDetail}
              onBlockedDateClick={setSelectedBlocked}
              onMonthWheel={handleCalendarWheelShift}
            />
          )}
        </div>
      </AdminPageBody>

      {showBookingDetail && selectedBooking && (
        (selectedBooking as AdminBookingRow).occupancy_kind === "turo" ||
        selectedBooking.id.startsWith("turo:") ? (
          <TuroTripDetailPanel
            booking={selectedBooking as AdminBookingRow}
            onClose={closeBookingDetail}
          />
        ) : (
          <BookingDetailPanel
            booking={selectedBooking as AdminBookingRow}
            vehicles={vehicles}
            onClose={closeBookingDetail}
            onUpdateBooking={handleUpdateBookingInList}
            onUpdateStatus={handleUpdateStatusFromDetail}
            onError={setError}
            onSuccess={setSuccess}
            capabilities={{
              canSendBookingEmail: calendarConfig.capabilities.canSendBookingEmail,
              canSendInvoice: calendarConfig.capabilities.canSendInvoice,
              canViewAdminNotes: calendarConfig.capabilities.canViewAdminNotes,
              canViewActivityTimeline: calendarConfig.capabilities.canViewActivityTimeline,
              canManagePayments: calendarConfig.capabilities.canManagePayments,
              canExtendBooking: calendarConfig.capabilities.canExtendBooking,
              canSignAgreementInPerson: calendarConfig.capabilities.canSignAgreementInPerson,
              canManageManagerFinancialAccess: calendarConfig.capabilities.canManageManagerFinancialAccess,
              customerDetailsBasePath: calendarConfig.customerDetailsBasePath,
              ticketsPagePath: calendarConfig.ticketsPagePath,
            }}
            onStartInPersonSign={() => setInPersonSignBooking(selectedBooking as AdminBookingRow)}
          />
        )
      )}

      {inPersonSignBooking && (
        <InPersonAgreementSign
          booking={inPersonSignBooking}
          vehicles={vehicles}
          onClose={() => setInPersonSignBooking(null)}
          onSigned={(fields) => {
            const updated = { ...inPersonSignBooking, ...fields };
            handleUpdateBookingInList(updated);
            if (selectedBooking?.id === inPersonSignBooking.id) {
              setSelectedBooking(updated);
            }
            setSuccess("Rental agreement signed in person.");
          }}
        />
      )}

      {selectedBlocked && (
        <BlockedDateDetailPanel
          blocked={selectedBlocked}
          vehicle={selectedBlockedVehicle}
          onClose={() => setSelectedBlocked(null)}
        />
      )}

      {calendarConfig.capabilities.canCreateBookings && (
        <CreateBookingShell open={showCreateForm} onClose={() => setShowCreateForm(false)}>
          <CreateBookingForm
            vehicles={vehicles}
            allCustomers={allCustomers}
            embeddedInSheet
            onClose={() => setShowCreateForm(false)}
            onCreated={() => {
              setShowCreateForm(false);
              void loadBookings({ forceReplace: true });
            }}
            onError={setError}
            onSuccess={setSuccess}
          />
        </CreateBookingShell>
      )}
    </>
  );
}
