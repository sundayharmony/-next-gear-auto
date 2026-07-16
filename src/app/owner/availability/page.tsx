"use client";

import React, { useMemo, useState } from "react";
import { Loader2, ShieldBan, Trash2, Plus } from "lucide-react";
import { MonthCalendar } from "@/components/owner/month-calendar";
import { OwnerMobileAgendaView } from "@/components/owner/mobile-agenda-view";
import {
  AdminPageHeader,
  AdminPageBody,
  AdminCard,
  AdminSection,
  adminListItemClass,
} from "@/components/admin/admin-shell";
import { AdminEmptyState } from "@/components/admin/ui-feedback";
import { Select } from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useOwnerData } from "@/lib/owner/owner-data-context";
import { adminFetch } from "@/lib/utils/admin-fetch";
import { useNotification } from "@/lib/context/notification-context";
import { formatDate } from "@/lib/utils/date-helpers";
import { cn } from "@/lib/utils/cn";

function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function OwnerAvailabilityPage() {
  const { vehicles, bookings, blockedDates, loading, reload } = useOwnerData();
  const { showToast } = useNotification();
  const [vehicleId, setVehicleId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [cursor, setCursor] = useState(() => new Date());
  const [agendaStart, setAgendaStart] = useState<Date>(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
  });

  const activeVehicleId = vehicleId || vehicles[0]?.id || "";

  const bookedRanges = useMemo(
    () =>
      bookings
        .filter((b) => b.status !== "cancelled")
        .map((b) => ({
          id: b.id,
          vehicleId: b.vehicleId,
          startDate: b.pickupDate,
          endDate: b.returnDate,
        })),
    [bookings]
  );

  const dayStatus = useMemo(() => {
    const map = new Map<string, "booked" | "blocked">();
    if (!activeVehicleId) return map;
    for (const r of bookedRanges.filter((r) => r.vehicleId === activeVehicleId)) {
      for (let d = new Date(`${r.startDate}T00:00:00`); ymd(d) <= r.endDate; d.setDate(d.getDate() + 1)) {
        map.set(ymd(d), "booked");
      }
    }
    for (const b of blockedDates.filter((b) => b.vehicleId === activeVehicleId)) {
      for (let d = new Date(`${b.startDate}T00:00:00`); ymd(d) <= b.endDate; d.setDate(d.getDate() + 1)) {
        if (!map.has(ymd(d))) map.set(ymd(d), "blocked");
      }
    }
    return map;
  }, [bookedRanges, blockedDates, activeVehicleId]);

  const ownerBlocks = useMemo(
    () => blockedDates.filter((b) => b.removable),
    [blockedDates]
  );

  const submitBlock = async () => {
    if (!activeVehicleId || !from || !to) {
      showToast("error", "Missing info", "Select a vehicle and a date range.");
      return;
    }
    if (to < from) {
      showToast("error", "Invalid range", "End date must be after start date.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await adminFetch("/api/owner/availability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vehicleId: activeVehicleId, startDate: from, endDate: to, reason }),
      });
      const json = await res.json();
      if (json.success) {
        showToast("success", "Dates blocked", "These dates are now unavailable for booking.");
        setFrom("");
        setTo("");
        setReason("");
        await reload();
      } else {
        showToast("error", "Could not block", json.message || "Try again.");
      }
    } catch {
      showToast("error", "Could not block", "Network error.");
    } finally {
      setSubmitting(false);
    }
  };

  const removeBlock = async (id: string) => {
    try {
      const res = await adminFetch(`/api/owner/availability?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      const json = await res.json();
      if (json.success) {
        showToast("success", "Block removed", "These dates are available again.");
        await reload();
      } else {
        showToast("error", "Could not remove", json.message || "Try again.");
      }
    } catch {
      showToast("error", "Could not remove", "Network error.");
    }
  };

  const shiftAgendaWeek = (delta: number) => {
    setAgendaStart((prev) => {
      const next = new Date(prev);
      next.setDate(next.getDate() + delta);
      return next;
    });
  };

  const todayKey = ymd(new Date());

  return (
    <>
      <AdminPageHeader title="Availability" subtitle="Block dates when your vehicle is unavailable" />
      <AdminPageBody>
        {loading && vehicles.length === 0 ? (
          <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-purple-600" role="status" aria-label="Loading availability" /></div>
        ) : vehicles.length === 0 ? (
          <AdminEmptyState title="No vehicles assigned to your account yet." />
        ) : (
          <>
            <AdminCard padding="sm">
              <Select label="Vehicle" value={activeVehicleId} onChange={(e) => setVehicleId(e.target.value)}>
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>{v.year} {v.make} {v.model}</option>
                ))}
              </Select>
            </AdminCard>

            <AdminSection title="Block dates" description="Owners cannot override existing bookings.">
              <AdminCard padding="sm">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 lg:items-end">
                  <DatePicker label="From" value={from} onChange={setFrom} min={todayKey} />
                  <DatePicker label="To" value={to} onChange={setTo} min={from || todayKey} />
                  <Input label="Reason (optional)" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Maintenance, personal use…" />
                  <Button onClick={submitBlock} disabled={submitting}>
                    {submitting ? <Loader2 className="h-4 w-4 animate-spin" role="status" aria-label="Adding block" /> : <Plus className="h-4 w-4" />}
                    Block dates
                  </Button>
                </div>
              </AdminCard>
            </AdminSection>

            <div className="sm:hidden">
              <OwnerMobileAgendaView
                bookings={bookings}
                blockedDates={blockedDates}
                vehicleId={activeVehicleId}
                start={agendaStart}
                onPrevious={() => shiftAgendaWeek(-7)}
                onNext={() => shiftAgendaWeek(7)}
                onToday={() => {
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  setAgendaStart(today);
                }}
                onBookingClick={() => {}}
                onBlockedDateClick={(bd) => {
                  if (bd.removable) void removeBlock(bd.id);
                }}
              />
            </div>

            <AdminCard padding="sm" className="hidden sm:block">
              <MonthCalendar
                cursor={cursor}
                onCursorChange={setCursor}
                weekdayLabels={["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"]}
                legend={
                  <>
                    <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-red-500" /> Booked</span>
                    <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-amber-500" /> Blocked</span>
                    <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-green-500" /> Available</span>
                  </>
                }
                renderDay={({ date, key, inMonth, isToday }) => {
                  const st = dayStatus.get(key);
                  return (
                    <div
                      className={cn(
                        "flex min-h-[44px] items-center justify-center rounded-lg border text-sm",
                        st === "booked" ? "border-red-200 bg-red-50 text-red-700"
                          : st === "blocked" ? "border-amber-200 bg-amber-50 text-amber-700"
                          : "border-green-100 bg-green-50/50 text-gray-600",
                        isToday && "ring-2 ring-purple-400"
                      )}
                    >
                      {date.getDate()}
                    </div>
                  );
                }}
              />
            </AdminCard>

            <AdminSection title="Your blocked dates" icon={ShieldBan}>
              {ownerBlocks.length === 0 ? (
                <AdminEmptyState title="You haven't blocked any dates." />
              ) : (
                <div className="space-y-2">
                  {ownerBlocks.map((b) => {
                    const v = vehicles.find((x) => x.id === b.vehicleId);
                    return (
                      <div key={b.id} className={cn(adminListItemClass, "flex items-center justify-between gap-3")}>
                        <div className="min-w-0">
                          <p className="truncate font-medium text-gray-900">{v ? `${v.year} ${v.make} ${v.model}` : "Vehicle"}</p>
                          <p className="text-xs text-gray-500">{formatDate(b.startDate)} → {formatDate(b.endDate)}{b.reason ? ` · ${b.reason}` : ""}</p>
                        </div>
                        <button onClick={() => removeBlock(b.id)} className="rounded-lg p-2 text-red-500 hover:bg-red-50" aria-label="Remove block">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </AdminSection>
          </>
        )}
      </AdminPageBody>
    </>
  );
}
