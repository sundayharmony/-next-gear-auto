"use client";

import React, { useMemo, useState } from "react";
import { DollarSign, Wallet, TrendingUp, Banknote, Clock, Loader2, Download } from "lucide-react";
import {
  AdminPageHeader,
  AdminPageBody,
  AdminStatCard,
  AdminCard,
  AdminSection,
  AdminTableWrap,
} from "@/components/admin/admin-shell";
import { Select } from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
import { Button } from "@/components/ui/button";
import { useOwnerApi } from "@/lib/owner/use-owner-api";
import { PayoutStatusBadge, OwnerBookingDetailModal } from "@/components/owner/owner-shared";
import { formatCurrency, formatDate } from "@/lib/utils/date-helpers";
import { exportToCSV } from "@/lib/utils/csv-export";
import type { OwnerBooking, OwnerVehicle, OwnerBookingStatus } from "@/lib/types";

interface FinanceData {
  summary: {
    currentMonthRevenue: number;
    currentMonthPayout: number;
    lifetimeRevenue: number;
    lifetimePayouts: number;
    pendingPayouts: number;
  };
  vehicles: OwnerVehicle[];
  bookings: OwnerBooking[];
}

export default function OwnerFinancePage() {
  const { data, loading } = useOwnerApi<FinanceData>("/api/owner/finance");
  const [vehicleId, setVehicleId] = useState("");
  const [status, setStatus] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [selected, setSelected] = useState<OwnerBooking | null>(null);

  const filtered = useMemo(() => {
    const list = data?.bookings ?? [];
    return list.filter((b) => {
      if (vehicleId && b.vehicleId !== vehicleId) return false;
      if (status && b.status !== status) return false;
      if (from && b.returnDate < from) return false;
      if (to && b.pickupDate > to) return false;
      return true;
    });
  }, [data, vehicleId, status, from, to]);

  const filteredTotals = useMemo(() => {
    return filtered.reduce(
      (acc, b) => {
        acc.gross += b.grossRevenue;
        acc.payout += b.ownerPayout;
        return acc;
      },
      { gross: 0, payout: 0 }
    );
  }, [filtered]);

  const clearFilters = () => {
    setVehicleId("");
    setStatus("");
    setFrom("");
    setTo("");
  };

  const exportCsv = () => {
    const rows = filtered.map((b) => ({
      "Booking ID": b.id,
      Vehicle: b.vehicleName,
      "Pickup Date": b.pickupDate,
      "Return Date": b.returnDate,
      Status: b.status,
      "Gross Revenue": b.grossRevenue.toFixed(2),
      "Processing Fees": b.processingFees.toFixed(2),
      "Other Expenses": b.otherExpenses.toFixed(2),
      "Net Revenue": b.netRevenue.toFixed(2),
      "Owner %": b.ownerPercentage,
      "Owner Payout": b.ownerPayout.toFixed(2),
      "Payout Status": b.payoutStatus,
      "Payout Date": b.payoutDate ?? "",
    }));
    const stamp = new Date().toISOString().slice(0, 10);
    exportToCSV(rows, `owner-earnings-${stamp}`);
  };

  return (
    <>
      <AdminPageHeader title="Finance & Earnings" subtitle="Revenue and payout history across your vehicles" />
      <AdminPageBody>
        {loading && !data ? (
          <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-purple-600" /></div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
              <AdminStatCard label="This Month Revenue" value={formatCurrency(data?.summary.currentMonthRevenue ?? 0)} icon={DollarSign} />
              <AdminStatCard label="This Month Payout" value={formatCurrency(data?.summary.currentMonthPayout ?? 0)} icon={Wallet} iconClassName="text-blue-600" iconBgClassName="bg-blue-50" />
              <AdminStatCard label="Lifetime Revenue" value={formatCurrency(data?.summary.lifetimeRevenue ?? 0)} icon={TrendingUp} iconClassName="text-emerald-600" iconBgClassName="bg-emerald-50" />
              <AdminStatCard label="Lifetime Payouts" value={formatCurrency(data?.summary.lifetimePayouts ?? 0)} icon={Banknote} iconClassName="text-indigo-600" iconBgClassName="bg-indigo-50" />
              <AdminStatCard label="Pending Payouts" value={formatCurrency(data?.summary.pendingPayouts ?? 0)} icon={Clock} iconClassName="text-amber-600" iconBgClassName="bg-amber-50" />
            </div>

            <AdminSection
              title="Earnings"
              description={`${filtered.length} booking(s) · ${formatCurrency(filteredTotals.payout)} payout`}
              actions={
                <Button variant="secondary" size="sm" onClick={exportCsv} disabled={filtered.length === 0}>
                  <Download className="h-4 w-4" /> Export CSV
                </Button>
              }
            >
              <AdminCard padding="sm">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <Select label="Vehicle" value={vehicleId} onChange={(e) => setVehicleId(e.target.value)}>
                    <option value="">All vehicles</option>
                    {(data?.vehicles ?? []).map((v) => (
                      <option key={v.id} value={v.id}>{v.year} {v.make} {v.model}</option>
                    ))}
                  </Select>
                  <Select label="Status" value={status} onChange={(e) => setStatus(e.target.value)}>
                    <option value="">All statuses</option>
                    {(["upcoming", "active", "completed", "cancelled"] as OwnerBookingStatus[]).map((s) => (
                      <option key={s} value={s} className="capitalize">{s}</option>
                    ))}
                  </Select>
                  <DatePicker label="From" value={from} onChange={setFrom} />
                  <DatePicker label="To" value={to} onChange={setTo} />
                </div>
                {(vehicleId || status || from || to) && (
                  <div className="mt-3">
                    <Button variant="ghost" size="sm" onClick={clearFilters}>Clear filters</Button>
                  </div>
                )}
              </AdminCard>

              {/* Mobile: stacked cards (the 9-column table scrolls awkwardly on phones) */}
              <div className="mt-4 space-y-3 sm:hidden">
                {filtered.length === 0 ? (
                  <AdminCard padding="sm">
                    <p className="py-6 text-center text-sm text-gray-500">No matching bookings.</p>
                  </AdminCard>
                ) : (
                  filtered.map((b) => (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => setSelected(b)}
                      className="w-full rounded-xl border border-gray-200 bg-white p-4 text-left shadow-sm transition-colors hover:border-purple-300 active:bg-purple-50/40"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate font-medium text-gray-900">{b.vehicleName}</p>
                          <p className="font-mono text-xs text-gray-400">{b.id}</p>
                        </div>
                        <PayoutStatusBadge status={b.payoutStatus} />
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                        <div className="flex justify-between border-b border-gray-50 pb-1">
                          <span className="text-gray-500">Gross</span>
                          <span className="tabular-nums text-gray-900">{formatCurrency(b.grossRevenue)}</span>
                        </div>
                        <div className="flex justify-between border-b border-gray-50 pb-1">
                          <span className="text-gray-500">Fees/Exp.</span>
                          <span className="tabular-nums text-red-600">{formatCurrency(b.processingFees + b.otherExpenses)}</span>
                        </div>
                        <div className="flex justify-between border-b border-gray-50 pb-1">
                          <span className="text-gray-500">Net</span>
                          <span className="tabular-nums text-gray-900">{formatCurrency(b.netRevenue)}</span>
                        </div>
                        <div className="flex justify-between border-b border-gray-50 pb-1">
                          <span className="text-gray-500">Owner %</span>
                          <span className="tabular-nums text-gray-900">{b.ownerPercentage}%</span>
                        </div>
                        <div className="col-span-2 flex items-center justify-between pt-1">
                          <span className="font-medium text-gray-700">Payout</span>
                          <span className="text-base font-bold tabular-nums text-purple-700">{formatCurrency(b.ownerPayout)}</span>
                        </div>
                      </div>
                      {b.payoutDate && (
                        <p className="mt-2 text-xs text-gray-400">Paid {formatDate(b.payoutDate)}</p>
                      )}
                    </button>
                  ))
                )}
              </div>

              <AdminTableWrap className="mt-4 hidden sm:block">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 text-left text-xs uppercase tracking-wide text-gray-500">
                      <th className="px-4 py-3 font-semibold">Booking</th>
                      <th className="px-4 py-3 font-semibold">Vehicle</th>
                      <th className="px-4 py-3 text-right font-semibold">Gross</th>
                      <th className="px-4 py-3 text-right font-semibold">Fees/Exp.</th>
                      <th className="px-4 py-3 text-right font-semibold">Net</th>
                      <th className="px-4 py-3 text-right font-semibold">Owner %</th>
                      <th className="px-4 py-3 text-right font-semibold">Payout</th>
                      <th className="px-4 py-3 font-semibold">Status</th>
                      <th className="px-4 py-3 font-semibold">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.length === 0 ? (
                      <tr><td colSpan={9} className="px-4 py-8 text-center text-gray-500">No matching bookings.</td></tr>
                    ) : (
                      filtered.map((b) => (
                        <tr
                          key={b.id}
                          onClick={() => setSelected(b)}
                          className="cursor-pointer border-b border-gray-100 transition-colors hover:bg-purple-50/40"
                        >
                          <td className="px-4 py-3 font-mono text-xs text-gray-500">{b.id}</td>
                          <td className="px-4 py-3 text-gray-900">{b.vehicleName}</td>
                          <td className="px-4 py-3 text-right tabular-nums">{formatCurrency(b.grossRevenue)}</td>
                          <td className="px-4 py-3 text-right tabular-nums text-red-600">{formatCurrency(b.processingFees + b.otherExpenses)}</td>
                          <td className="px-4 py-3 text-right tabular-nums">{formatCurrency(b.netRevenue)}</td>
                          <td className="px-4 py-3 text-right tabular-nums">{b.ownerPercentage}%</td>
                          <td className="px-4 py-3 text-right font-semibold tabular-nums text-gray-900">{formatCurrency(b.ownerPayout)}</td>
                          <td className="px-4 py-3"><PayoutStatusBadge status={b.payoutStatus} /></td>
                          <td className="px-4 py-3 whitespace-nowrap text-gray-500">{b.payoutDate ? formatDate(b.payoutDate) : "—"}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </AdminTableWrap>
            </AdminSection>
          </>
        )}
      </AdminPageBody>

      <OwnerBookingDetailModal booking={selected} onClose={() => setSelected(null)} />
    </>
  );
}
