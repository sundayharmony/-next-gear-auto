"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AdminPageHeader,
  AdminPageBody,
  AdminCard,
} from "@/components/admin/admin-shell";
import { useOwnerData } from "@/lib/owner/owner-data-context";
import { MonthCalendar } from "@/components/owner/month-calendar";
import { OwnerMobileAgendaView } from "@/components/owner/mobile-agenda-view";
import { OwnerStatusBadge, OwnerBookingDetailModal } from "@/components/owner/owner-shared";
import { formatCurrency, formatDate } from "@/lib/utils/date-helpers";
import type { OwnerBooking, OwnerBookingStatus } from "@/lib/types";
import { isOwnerTuroBooking } from "@/lib/owner/finance";
import { cn } from "@/lib/utils/cn";

const DOT_COLOR: Record<OwnerBookingStatus, string> = {
  upcoming: "bg-blue-500",
  active: "bg-green-500",
  completed: "bg-gray-400",
  cancelled: "bg-red-400",
};

function eventDotClass(b: OwnerBooking): string {
  if (isOwnerTuroBooking(b)) return "bg-teal-500";
  return DOT_COLOR[b.status];
}

function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function OwnerCalendarPage() {
  const { bookings, blockedDates, loading } = useOwnerData();
  const [cursor, setCursor] = useState(() => new Date());
  const [agendaStart, setAgendaStart] = useState<Date>(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
  });
  const [selected, setSelected] = useState<OwnerBooking | null>(null);

  const byDay = useMemo(() => {
    const map = new Map<string, OwnerBooking[]>();
    for (const b of bookings || []) {
      const start = new Date(`${b.pickupDate}T00:00:00`);
      const end = new Date(`${b.returnDate}T00:00:00`);
      if (isNaN(start.getTime()) || isNaN(end.getTime())) continue;
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const key = ymd(d);
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(b);
      }
    }
    return map;
  }, [bookings]);

  const shiftAgendaWeek = (delta: number) => {
    setAgendaStart((prev) => {
      const next = new Date(prev);
      next.setDate(next.getDate() + delta);
      return next;
    });
  };

  return (
    <>
      <AdminPageHeader
        title="Booking Calendar"
        subtitle="Turo trips for your vehicles"
        actions={
          <Link href="/owner/bookings/create">
            <Button size="sm" className="gap-1 bg-white text-purple-700 hover:bg-purple-50">
              <Plus className="h-4 w-4" />
              New booking
            </Button>
          </Link>
        }
      />
      <AdminPageBody>
        <div className="sm:hidden">
          <OwnerMobileAgendaView
            bookings={bookings || []}
            blockedDates={blockedDates}
            start={agendaStart}
            onPrevious={() => shiftAgendaWeek(-7)}
            onNext={() => shiftAgendaWeek(7)}
            onToday={() => {
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              setAgendaStart(today);
            }}
            onBookingClick={setSelected}
          />
        </div>

        <AdminCard padding="sm" className="hidden sm:block">
          <MonthCalendar
            cursor={cursor}
            onCursorChange={setCursor}
            loading={loading}
            legend={
              <>
                {(["upcoming", "active", "completed", "cancelled"] as OwnerBookingStatus[]).map((s) => (
                  <span key={s} className="flex items-center gap-1.5">
                    <span className={cn("h-2.5 w-2.5 rounded-full", DOT_COLOR[s])} />{" "}
                    <span className="capitalize">{s}</span>
                  </span>
                ))}
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-teal-500" /> Turo
                </span>
              </>
            }
            renderDay={({ date, key, inMonth, isToday }) => {
              const dayBookings = byDay.get(key) || [];
              return (
                <div
                  className={cn(
                    "min-h-[72px] rounded-lg border p-1 align-top",
                    inMonth ? "border-gray-200 bg-white" : "border-transparent bg-gray-50/60",
                    isToday && "ring-2 ring-purple-400"
                  )}
                >
                  <div className={cn("mb-0.5 text-right text-[11px]", inMonth ? "text-gray-600" : "text-gray-300")}>
                    {date.getDate()}
                  </div>
                  <div className="space-y-0.5">
                    {dayBookings.slice(0, 2).map((b) => (
                      <button
                        key={b.id}
                        type="button"
                        onClick={() => setSelected(b)}
                        className="flex w-full items-center gap-1 truncate rounded bg-gray-50 px-1 py-0.5 text-left text-[10px] hover:bg-purple-50"
                      >
                        <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", eventDotClass(b))} />
                        <span className="truncate text-gray-700">
                          {isOwnerTuroBooking(b) ? `${b.vehicleName} (Turo)` : b.vehicleName}
                        </span>
                      </button>
                    ))}
                    {dayBookings.length > 2 && (
                      <span className="block px-1 text-[10px] text-gray-400">+{dayBookings.length - 2} more</span>
                    )}
                  </div>
                </div>
              );
            }}
          />
        </AdminCard>

        <div className="hidden space-y-2 sm:block">
          <h2 className="text-base font-semibold text-gray-900">All trips</h2>
          {(bookings || []).length === 0 ? (
            <AdminCard><p className="py-6 text-center text-sm text-gray-500">No Turo trips yet.</p></AdminCard>
          ) : (
            (bookings || []).map((b) => (
              <button
                key={b.id}
                type="button"
                onClick={() => setSelected(b)}
                className="flex w-full items-center justify-between gap-3 rounded-xl border border-gray-200/80 bg-white p-4 text-left shadow-sm transition-colors hover:border-purple-200 hover:bg-purple-50/40"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium text-gray-900">
                    {b.vehicleName}
                    {isOwnerTuroBooking(b) && (
                      <span className="ml-1.5 text-xs font-normal text-teal-700">Turo</span>
                    )}
                  </p>
                  <p className="text-xs text-gray-500">
                    {isOwnerTuroBooking(b) ? b.customerName : formatDate(b.pickupDate)} · {formatDate(b.pickupDate)} → {formatDate(b.returnDate)}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  {b.grossRevenue > 0 && (
                    <span className="font-semibold tabular-nums text-gray-900">{formatCurrency(b.ownerPayout)}</span>
                  )}
                  {isOwnerTuroBooking(b) ? (
                    <span className="inline-flex items-center rounded-full bg-teal-100 px-2.5 py-0.5 text-xs font-semibold text-teal-800">
                      Turo · {b.status}
                    </span>
                  ) : (
                    <OwnerStatusBadge status={b.status} />
                  )}
                </div>
              </button>
            ))
          )}
        </div>
      </AdminPageBody>

      <OwnerBookingDetailModal booking={selected} onClose={() => setSelected(null)} />
    </>
  );
}
