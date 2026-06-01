"use client";

import React, { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Loader2, ShieldBan, Trash2, Plus } from "lucide-react";
import {
  AdminPageHeader,
  AdminPageBody,
  AdminCard,
  AdminSection,
} from "@/components/admin/admin-shell";
import { Select } from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useOwnerApi } from "@/lib/owner/use-owner-api";
import { adminFetch } from "@/lib/utils/admin-fetch";
import { useNotification } from "@/lib/context/notification-context";
import { formatDate } from "@/lib/utils/date-helpers";
import type { OwnerVehicle } from "@/lib/types";
import { cn } from "@/lib/utils/cn";

interface BlockedDate {
  id: string;
  vehicleId: string;
  startDate: string;
  endDate: string;
  reason: string | null;
  source: string;
  removable: boolean;
}
interface BookedRange {
  id: string;
  vehicleId: string;
  startDate: string;
  endDate: string;
  status: string;
}
interface AvailabilityData {
  vehicles: OwnerVehicle[];
  blockedDates: BlockedDate[];
  bookedRanges: BookedRange[];
}

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function inRange(day: string, start: string, end: string): boolean {
  return day >= start && day <= end;
}

export default function OwnerAvailabilityPage() {
  const { data, loading, reload } = useOwnerApi<AvailabilityData>("/api/owner/availability");
  const { showToast } = useNotification();
  const [vehicleId, setVehicleId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [cursor, setCursor] = useState(() => new Date());

  const vehicles = data?.vehicles ?? [];
  const activeVehicleId = vehicleId || vehicles[0]?.id || "";

  const monthStart = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const cells = useMemo(() => {
    const start = new Date(monthStart);
    start.setDate(1 - monthStart.getDay());
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  }, [monthStart]);

  const dayStatus = useMemo(() => {
    const map = new Map<string, "booked" | "blocked">();
    if (!data || !activeVehicleId) return map;
    for (const r of data.bookedRanges.filter((r) => r.vehicleId === activeVehicleId)) {
      for (let d = new Date(`${r.startDate}T00:00:00`); ymd(d) <= r.endDate; d.setDate(d.getDate() + 1)) {
        map.set(ymd(d), "booked");
      }
    }
    for (const b of data.blockedDates.filter((b) => b.vehicleId === activeVehicleId)) {
      for (let d = new Date(`${b.startDate}T00:00:00`); ymd(d) <= b.endDate; d.setDate(d.getDate() + 1)) {
        if (!map.has(ymd(d))) map.set(ymd(d), "blocked");
      }
    }
    return map;
  }, [data, activeVehicleId]);

  const ownerBlocks = useMemo(
    () => (data?.blockedDates ?? []).filter((b) => b.removable),
    [data]
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
        setFrom(""); setTo(""); setReason("");
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

  const todayKey = ymd(new Date());
  const monthLabel = cursor.toLocaleString("en-US", { month: "long", year: "numeric" });

  return (
    <>
      <AdminPageHeader title="Availability" subtitle="Block dates when your vehicle is unavailable" />
      <AdminPageBody>
        {loading && !data ? (
          <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-purple-600" /></div>
        ) : vehicles.length === 0 ? (
          <AdminCard><p className="py-6 text-center text-sm text-gray-500">No vehicles assigned to your account yet.</p></AdminCard>
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
                    {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                    Block dates
                  </Button>
                </div>
              </AdminCard>
            </AdminSection>

            <AdminCard padding="sm">
              <div className="mb-3 flex items-center justify-between">
                <button onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))} className="rounded-lg p-2 text-gray-500 hover:bg-gray-100" aria-label="Previous month">
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <h2 className="text-base font-semibold text-gray-900">{monthLabel}</h2>
                <button onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))} className="rounded-lg p-2 text-gray-500 hover:bg-gray-100" aria-label="Next month">
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>
              <div className="mb-3 flex flex-wrap gap-3 text-xs text-gray-500">
                <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-red-500" /> Booked</span>
                <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-amber-500" /> Blocked</span>
                <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-green-500" /> Available</span>
              </div>
              <div className="grid grid-cols-7 gap-1">
                {WEEKDAYS.map((w) => (
                  <div key={w} className="pb-1 text-center text-[11px] font-semibold uppercase text-gray-400">{w}</div>
                ))}
                {cells.map((d, i) => {
                  const key = ymd(d);
                  const inMonth = d.getMonth() === cursor.getMonth();
                  const st = dayStatus.get(key);
                  return (
                    <div
                      key={i}
                      className={cn(
                        "flex min-h-[44px] items-center justify-center rounded-lg border text-sm",
                        !inMonth && "opacity-40",
                        st === "booked" ? "border-red-200 bg-red-50 text-red-700"
                          : st === "blocked" ? "border-amber-200 bg-amber-50 text-amber-700"
                          : "border-green-100 bg-green-50/50 text-gray-600",
                        key === todayKey && "ring-2 ring-purple-400"
                      )}
                    >
                      {d.getDate()}
                    </div>
                  );
                })}
              </div>
            </AdminCard>

            <AdminSection title="Your blocked dates" icon={ShieldBan}>
              {ownerBlocks.length === 0 ? (
                <AdminCard><p className="py-6 text-center text-sm text-gray-500">You haven&apos;t blocked any dates.</p></AdminCard>
              ) : (
                <div className="space-y-2">
                  {ownerBlocks.map((b) => {
                    const v = vehicles.find((x) => x.id === b.vehicleId);
                    return (
                      <div key={b.id} className="flex items-center justify-between gap-3 rounded-xl border border-gray-200/80 bg-white p-4 shadow-sm">
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
