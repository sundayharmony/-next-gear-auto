"use client";

import dynamic from "next/dynamic";
import type { BookingDbRow, VehicleListItem } from "@/lib/types";
import type { BlockedDateEntry } from "./calendar-model";
import { MobileAgendaView } from "./mobile-agenda-view";
import type { BookingRow as AdminBookingRow } from "@/app/admin/bookings/types";

const TimelineView = dynamic(
  () => import("./timeline-view").then((m) => m.TimelineView),
  {
    ssr: false,
    loading: () => (
      <div className="text-center py-12">
        <div
          role="status"
          aria-label="Loading timeline"
          className="animate-spin h-8 w-8 border-4 border-purple-600 border-t-transparent rounded-full mx-auto"
        />
        <p className="mt-4 text-gray-500">Loading timeline...</p>
      </div>
    ),
  }
);

type CalendarBookingRow = AdminBookingRow;
type Vehicle = VehicleListItem;

export interface TimelineShellProps {
  bookings: CalendarBookingRow[];
  vehicles: Vehicle[];
  blockedDates: BlockedDateEntry[];
  timelineStart: Date;
  timelineWindowDays: number;
  onPreviousWeek: () => void;
  onNextWeek: () => void;
  onPreviousFortnight: () => void;
  onNextFortnight: () => void;
  onToday: () => void;
  onBookingClick: (booking: CalendarBookingRow) => void;
  onBlockedDateClick: (blocked: BlockedDateEntry) => void;
}

export function TimelineShell({
  bookings,
  vehicles,
  blockedDates,
  timelineStart,
  timelineWindowDays,
  onPreviousWeek,
  onNextWeek,
  onPreviousFortnight,
  onNextFortnight,
  onToday,
  onBookingClick,
  onBlockedDateClick,
}: TimelineShellProps) {
  return (
    <>
      <div className="sm:hidden">
        <MobileAgendaView
          bookings={bookings}
          vehicles={vehicles}
          blockedDates={blockedDates}
          start={timelineStart}
          onPrevious={onPreviousWeek}
          onNext={onNextWeek}
          onToday={onToday}
          onBookingClick={onBookingClick}
          onBlockedDateClick={onBlockedDateClick}
        />
      </div>
      <div className="hidden sm:block">
        <TimelineView
          bookings={bookings as BookingDbRow[]}
          vehicles={vehicles}
          blockedDates={blockedDates}
          start={timelineStart}
          days={timelineWindowDays}
          onToday={onToday}
          onPrevious={onPreviousFortnight}
          onNext={onNextFortnight}
          onBookingClick={onBookingClick}
          onBlockedDateClick={onBlockedDateClick}
        />
      </div>
    </>
  );
}
