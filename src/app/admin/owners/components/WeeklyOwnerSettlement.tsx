"use client";

import React, { useCallback, useEffect, useState } from "react";
import { ChevronDown, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { AdminCard, AdminTableWrap } from "@/components/admin/admin-shell";
import { Button } from "@/components/ui/button";
import { adminFetch } from "@/lib/utils/admin-fetch";
import { formatCurrency } from "@/lib/utils/date-helpers";
import { addCalendarDaysYyyyMmDd } from "@/lib/utils/booking-dates";
import type { OwnerWeekSettlement } from "@/lib/owner/weekly-settlement";

type WeeklyPayload = {
  weekStart: string;
  weekEnd: string;
  platformFeeRate: number;
  ownerShareRate: number;
  totals: {
    grossWeek: number;
    insuranceWeek: number;
    net: number;
    platformFee: number;
    ownerPayout: number;
  };
  owners: OwnerWeekSettlement[];
};

function formatWeekLabel(weekStart: string, weekEnd: string): string {
  const fmt = (iso: string) => {
    const [y, m, d] = iso.split("-").map(Number);
    return new Date(y, m - 1, d).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };
  return `${fmt(weekStart)} – ${fmt(weekEnd)}`;
}

export function WeeklyOwnerSettlement({ ownerId }: { ownerId?: string }) {
  const [weekStart, setWeekStart] = useState<string | null>(null);
  const [data, setData] = useState<WeeklyPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const load = useCallback(
    async (anchor?: string | null) => {
      setLoading(true);
      setError("");
      try {
        const params = new URLSearchParams();
        if (anchor) params.set("weekStart", anchor);
        if (ownerId) params.set("ownerId", ownerId);
        const qs = params.toString();
        const res = await adminFetch(
          `/api/admin/owners/weekly-settlement${qs ? `?${qs}` : ""}`,
        );
        const json = await res.json();
        if (!res.ok || !json.success) {
          setError(json.message || "Could not load weekly settlement");
          setData(null);
          return;
        }
        setData(json.data as WeeklyPayload);
        setWeekStart(json.data.weekStart as string);
      } catch {
        setError("Network error — could not load weekly settlement");
        setData(null);
      } finally {
        setLoading(false);
      }
    },
    [ownerId],
  );

  useEffect(() => {
    void load(weekStart);
    // Initial load only when ownerId changes; week navigation calls load directly.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ownerId]);

  const shiftWeek = (deltaWeeks: number) => {
    if (!weekStart) return;
    const next = addCalendarDaysYyyyMmDd(weekStart, deltaWeeks * 7);
    void load(next);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-gray-900">
            {data ? formatWeekLabel(data.weekStart, data.weekEnd) : "This week"}
          </p>
          <p className="text-xs text-gray-500 mt-0.5">
            Sunday is payout day. Insurance is prorated for the week; platform keeps 25%,
            owner receives 75% of net.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => shiftWeek(-1)}
            disabled={loading || !weekStart}
            aria-label="Previous week"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void load(null)}
            disabled={loading}
          >
            This week
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => shiftWeek(1)}
            disabled={loading || !weekStart}
            aria-label="Next week"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {loading && (
        <div className="flex justify-center py-10">
          <Loader2 className="h-6 w-6 animate-spin text-purple-600" />
        </div>
      )}

      {!loading && error && (
        <AdminCard>
          <p className="text-sm text-red-600">{error}</p>
        </AdminCard>
      )}

      {!loading && data && (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            <Stat label="Gross" value={formatCurrency(data.totals.grossWeek)} />
            <Stat label="Insurance" value={formatCurrency(data.totals.insuranceWeek)} />
            <Stat label="Net" value={formatCurrency(data.totals.net)} />
            <Stat label="Your 25%" value={formatCurrency(data.totals.platformFee)} />
            <Stat
              label="Owner payout due"
              value={formatCurrency(data.totals.ownerPayout)}
              emphasize
            />
          </div>

          {data.owners.length === 0 ? (
            <AdminCard>
              <p className="py-6 text-center text-sm text-gray-500">
                No owner vehicles for this week.
              </p>
            </AdminCard>
          ) : (
            <AdminTableWrap>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-left text-xs uppercase tracking-wide text-gray-500">
                    <th className="px-4 py-3 font-semibold">Owner</th>
                    <th className="px-4 py-3 font-semibold text-right">Gross</th>
                    <th className="px-4 py-3 font-semibold text-right">Insurance</th>
                    <th className="px-4 py-3 font-semibold text-right">Platform 25%</th>
                    <th className="px-4 py-3 font-semibold text-right">Payout due</th>
                  </tr>
                </thead>
                <tbody>
                  {data.owners.map((owner) => {
                    const open = !!expanded[owner.ownerId];
                    return (
                      <React.Fragment key={owner.ownerId}>
                        <tr className="border-b border-gray-100">
                          <td className="px-4 py-3">
                            <button
                              type="button"
                              className="flex items-center gap-2 text-left font-medium text-gray-900 hover:text-purple-700"
                              onClick={() =>
                                setExpanded((prev) => ({
                                  ...prev,
                                  [owner.ownerId]: !prev[owner.ownerId],
                                }))
                              }
                            >
                              <ChevronDown
                                className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`}
                              />
                              <span>
                                {owner.ownerName}
                                <span className="block text-xs font-normal text-gray-500">
                                  {owner.ownerEmail}
                                </span>
                              </span>
                            </button>
                          </td>
                          <td className="px-4 py-3 text-right tabular-nums">
                            {formatCurrency(owner.grossWeek)}
                          </td>
                          <td className="px-4 py-3 text-right tabular-nums text-gray-600">
                            {formatCurrency(owner.insuranceWeek)}
                          </td>
                          <td className="px-4 py-3 text-right tabular-nums text-gray-600">
                            {formatCurrency(owner.platformFee)}
                          </td>
                          <td className="px-4 py-3 text-right tabular-nums font-semibold text-purple-700">
                            {formatCurrency(owner.ownerPayout)}
                          </td>
                        </tr>
                        {open &&
                          owner.vehicles.map((v) => (
                            <tr key={v.vehicleId} className="border-b border-gray-50 bg-gray-50/70">
                              <td className="px-4 py-2 pl-12 text-gray-700">
                                {v.vehicleName}
                                <span className="block text-xs text-gray-500">
                                  Insurance ${v.monthlyInsurance.toFixed(2)}/mo ·{" "}
                                  {v.trips.length} trip(s)
                                </span>
                                {v.trips.length > 0 && (
                                  <ul className="mt-1 space-y-0.5 text-xs text-gray-500">
                                    {v.trips.map((t) => (
                                      <li key={t.id}>
                                        {t.kind === "turo" ? "Turo" : "Booking"} · {t.customerName} ·{" "}
                                        {t.pickupDate}→{t.returnDate} ·{" "}
                                        {formatCurrency(t.attributedGross)} of{" "}
                                        {formatCurrency(t.grossTotal)}
                                      </li>
                                    ))}
                                  </ul>
                                )}
                              </td>
                              <td className="px-4 py-2 text-right tabular-nums text-gray-600">
                                {formatCurrency(v.grossWeek)}
                              </td>
                              <td className="px-4 py-2 text-right tabular-nums text-gray-600">
                                {formatCurrency(v.insuranceWeek)}
                              </td>
                              <td className="px-4 py-2 text-right tabular-nums text-gray-600">
                                {formatCurrency(v.platformFee)}
                              </td>
                              <td className="px-4 py-2 text-right tabular-nums text-gray-800">
                                {formatCurrency(v.ownerPayout)}
                              </td>
                            </tr>
                          ))}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </AdminTableWrap>
          )}
        </>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  emphasize,
}: {
  label: string;
  value: string;
  emphasize?: boolean;
}) {
  return (
    <AdminCard className="p-3">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">{label}</p>
      <p
        className={`mt-1 text-base font-semibold tabular-nums ${
          emphasize ? "text-purple-700" : "text-gray-900"
        }`}
      >
        {value}
      </p>
    </AdminCard>
  );
}
