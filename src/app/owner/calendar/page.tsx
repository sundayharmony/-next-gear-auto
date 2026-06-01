"use client";

import React, { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import {
  AdminPageHeader,
  AdminPageBody,
  AdminCard,
} from "@/components/admin/admin-shell";
import { useOwnerApi } from "@/lib/owner/use-owner-api";
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

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function OwnerCalendarPage() {
  const { data: bookings, loading } = useOwnerApi<OwnerBooking[]>("/api/owner/bookings");
  const [cursor, setCursor] = useState(() => new Date());
  const [selected, setSelected] = useState<OwnerBooking | null>(null);

  const monthStart = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const monthLabel = cursor.toLocaleString("en-US", { month: "long", year: "numeric" });

  // Build the 6-week grid (always 42 cells).
  const cells = useMemo(() => {
    const start = new Date(monthStart);
    start.setDate(1 - monthStart.getDay());
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  }, [monthStart]);

  // Map each YYYY-MM-DD to the bookings overlapping that day.
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

  const todayKey = ymd(new Date());

  return (
    <>
      <AdminPageHeader title="Booking Calendar" subtitle="Website bookings and Turo trips for your vehicles" />
      <AdminPageBody>
        <AdminCard padding="sm">
          <div className="mb-3 flex items-center justify-between">
            <button
              onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}
              className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
              aria-label="Previous month"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <h2 className="text-base font-semibold text-gray-900">{monthLabel}</h2>
            <button
              onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}
              className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
              aria-label="Next month"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>

          <div className="mb-3 flex flex-wrap gap-3 text-xs text-gray-500">
            {(["upcoming", "active", "completed", "cancelled"] as OwnerBookingStatus[]).map((s) => (
              <span key={s} className="flex items-center gap-1.5">
                <span className={cn("h-2.5 w-2.5 rounded-full", DOT_COLOR[s])} /> <span className="capitalize">{s}</span>
              </span>
            ))}
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-teal-500" /> Turo
            </span>
          </div>

          {loading ? (
            <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-purple-600" /></div>
          ) : (
            <div className="grid grid-cols-7 gap-1">
              {WEEKDAYS.map((w) => (
                <div key={w} className="pb-1 text-center text-[11px] font-semibold uppercase text-gray-400">{w}</div>
              ))}
              {cells.map((d, i) => {
                const key = ymd(d);
                const inMonth = d.getMonth() === cursor.getMonth();
                const dayBookings = byDay.get(key) || [];
                return (
                  <div
                    key={i}
                    className={cn(
                      "min-h-[72px] rounded-lg border p-1 align-top",
                      inMonth ? "border-gray-200 bg-white" : "border-transparent bg-gray-50/60",
                      key === todayKey && "ring-2 ring-purple-400"
                    )}
                  >
                    <div className={cn("mb-0.5 text-right text-[11px]", inMonth ? "text-gray-600" : "text-gray-300")}>
                      {d.getDate()}
                    </div>
                    <div className="space-y-0.5">
                      {dayBookings.slice(0, 2).map((b) => (
                        <button
                          key={b.id}
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
              })}
            </div>
          )}
        </AdminCard>

        <div className="space-y-2">
          <h2 className="text-base font-semibold text-gray-900">All trips</h2>
          {(bookings || []).length === 0 ? (
            <AdminCard><p className="py-6 text-center text-sm text-gray-500">No bookings or Turo trips yet.</p></AdminCard>
          ) : (
            (bookings || []).map((b) => (
              <button
                key={b.id}
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
