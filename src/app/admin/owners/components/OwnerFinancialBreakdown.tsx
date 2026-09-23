"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";
import { ChevronRight, DollarSign, TrendingUp } from "lucide-react";
import {
  AdminCard,
  AdminSection,
  AdminStatCard,
  AdminTableWrap,
} from "@/components/admin/admin-shell";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/utils/date-helpers";
import type { OwnerFinancialBreakdown } from "@/lib/owner/owner-financial-breakdown";
import type { OwnerBooking } from "@/lib/types";
import { isOwnerTuroBooking } from "@/lib/owner/finance";
import { OwnerStatusBadge } from "@/components/owner/owner-shared";

function BreakdownRow({
  label,
  value,
  negative = false,
  strong = false,
}: {
  label: string;
  value: string;
  negative?: boolean;
  strong?: boolean;
}) {
  return (
    <div className={`flex items-center justify-between gap-4 py-2 ${strong ? "border-t border-gray-100 pt-3 font-semibold" : ""}`}>
      <span className="text-sm text-gray-600">{label}</span>
      <span className={`tabular-nums ${negative ? "text-red-600" : "text-gray-900"} ${strong ? "text-base" : "text-sm"}`}>
        {value}
      </span>
    </div>
  );
}

function TotalsCard({
  title,
  totals,
}: {
  title: string;
  totals: OwnerFinancialBreakdown["lifetime"];
}) {
  return (
    <AdminCard>
      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">{title}</p>
      <BreakdownRow label="Gross revenue" value={formatCurrency(totals.grossRevenue)} />
      <BreakdownRow label="Processing fees" value={`− ${formatCurrency(totals.processingFees)}`} negative />
      <BreakdownRow label="Other expenses" value={`− ${formatCurrency(totals.otherExpenses)}`} negative />
      <BreakdownRow label="Net revenue" value={formatCurrency(totals.netRevenue)} strong />
      <BreakdownRow label="Platform share" value={`− ${formatCurrency(totals.platformFees)}`} negative />
      <BreakdownRow label="Owner profit" value={formatCurrency(totals.profit)} strong />
      <BreakdownRow label="Vehicle financing" value={`− ${formatCurrency(totals.financing)}`} negative />
      <BreakdownRow label="Revenue after financing" value={formatCurrency(totals.revenueAfterFinancing)} strong />
      <p className="mt-3 text-xs text-gray-500">{totals.bookingCount} revenue booking(s)</p>
    </AdminCard>
  );
}

export function OwnerFinancialBreakdownPanel({
  breakdown,
  bookings,
}: {
  breakdown: OwnerFinancialBreakdown;
  bookings: OwnerBooking[];
}) {
  const [vehicleFilter, setVehicleFilter] = useState("");

  const filteredBookings = useMemo(() => {
    if (!vehicleFilter) return bookings;
    return bookings.filter((b) => b.vehicleId === vehicleFilter);
  }, [bookings, vehicleFilter]);

  const revenueBookings = filteredBookings.filter((b) => b.status !== "cancelled");

  return (
    <AdminSection
      title="Financial breakdown"
      description="Revenue, fees, profit, and financing across this owner's vehicles and bookings."
    >
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <AdminStatCard label="Lifetime revenue" value={formatCurrency(breakdown.lifetime.revenueAfterFinancing)} icon={DollarSign} />
        <AdminStatCard label="Lifetime profit" value={formatCurrency(breakdown.lifetime.profit)} icon={TrendingUp} iconClassName="text-emerald-600" iconBgClassName="bg-emerald-50" />
        <AdminStatCard label="This month revenue" value={formatCurrency(breakdown.currentMonth.revenueAfterFinancing)} icon={DollarSign} />
        <AdminStatCard label="This month profit" value={formatCurrency(breakdown.currentMonth.profit)} icon={TrendingUp} iconClassName="text-blue-600" iconBgClassName="bg-blue-50" />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <TotalsCard title="Lifetime" totals={breakdown.lifetime} />
        <TotalsCard title="This month" totals={breakdown.currentMonth} />
      </div>

      <AdminCard className="mt-4">
        <p className="mb-3 text-sm font-semibold text-gray-900">Monthly revenue & profit</p>
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={breakdown.monthly} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="#9ca3af" />
              <YAxis tick={{ fontSize: 12 }} stroke="#9ca3af" tickFormatter={(v) => `$${v}`} />
              <Tooltip formatter={(v) => formatCurrency(Number(v) || 0)} />
              <Legend />
              <Bar dataKey="revenueAfterFinancing" name="Revenue" fill="#c4b5fd" radius={[4, 4, 0, 0]} />
              <Line type="monotone" dataKey="profit" name="Profit" stroke="#7c3aed" strokeWidth={2} dot={{ r: 3 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </AdminCard>

      <div className="mt-6 space-y-3">
        <div>
          <h3 className="text-base font-semibold text-gray-900">By vehicle</h3>
          <p className="text-sm text-gray-500">Revenue and profit per assigned vehicle, including financing.</p>
        </div>
        {breakdown.byVehicle.length === 0 ? (
          <AdminCard>
            <p className="py-6 text-center text-sm text-gray-500">No vehicles assigned.</p>
          </AdminCard>
        ) : (
          <AdminTableWrap>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-xs uppercase tracking-wide text-gray-500">
                  <th className="px-4 py-3 font-semibold">Vehicle</th>
                  <th className="px-4 py-3 text-right font-semibold">Gross</th>
                  <th className="px-4 py-3 text-right font-semibold">Fees</th>
                  <th className="px-4 py-3 text-right font-semibold">Financing</th>
                  <th className="px-4 py-3 text-right font-semibold">Revenue</th>
                  <th className="px-4 py-3 text-right font-semibold">Profit</th>
                  <th className="px-4 py-3 text-right font-semibold">Trips</th>
                </tr>
              </thead>
              <tbody>
                {breakdown.byVehicle.map((row) => (
                  <tr key={row.vehicleId} className="border-b border-gray-100">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{row.vehicleName}</div>
                      <div className="text-xs text-gray-500">
                        {row.ownerPercentage}% owner share
                        {row.isFinanced ? ` · ${formatCurrency(row.monthlyPayment)}/mo` : ""}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">{formatCurrency(row.grossRevenue)}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-red-600">
                      {formatCurrency(row.processingFees + row.otherExpenses + row.platformFees)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-amber-700">
                      {formatCurrency(row.financing)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums font-medium">
                      {formatCurrency(row.revenueAfterFinancing)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums font-semibold text-purple-700">
                      {formatCurrency(row.profit)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-gray-600">{row.bookingCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </AdminTableWrap>
        )}
      </div>

      <div className="mt-6 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-gray-900">All bookings</h3>
            <p className="text-sm text-gray-500">{revenueBookings.length} booking(s) on this owner&apos;s vehicles.</p>
          </div>
          {
          breakdown.byVehicle.length > 1 ? (
            <select
              value={vehicleFilter}
              onChange={(e) => setVehicleFilter(e.target.value)}
              className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700"
              aria-label="Filter bookings by vehicle"
            >
              <option value="">All vehicles</option>
              {breakdown.byVehicle.map((row) => (
                <option key={row.vehicleId} value={row.vehicleId}>
                  {row.vehicleName}
                </option>
              ))}
            </select>
          ) : null}
        </div>
        {revenueBookings.length === 0 ? (
          <AdminCard>
            <p className="py-6 text-center text-sm text-gray-500">No bookings yet.</p>
          </AdminCard>
        ) : (
          <AdminTableWrap>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-xs uppercase tracking-wide text-gray-500">
                  <th className="px-4 py-3 font-semibold">Booking</th>
                  <th className="px-4 py-3 font-semibold">Vehicle</th>
                  <th className="px-4 py-3 font-semibold">Dates</th>
                  <th className="px-4 py-3 text-right font-semibold">Gross</th>
                  <th className="px-4 py-3 text-right font-semibold">Fees/Exp.</th>
                  <th className="px-4 py-3 text-right font-semibold">Net</th>
                  <th className="px-4 py-3 text-right font-semibold">Profit</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {revenueBookings.map((b) => {
                  const isTuro = isOwnerTuroBooking(b);
                  return (
                    <tr key={b.id} className="border-b border-gray-100">
                      <td className="px-4 py-3">
                        <div className="font-mono text-xs text-gray-500">{b.id}</div>
                        <div className="text-gray-700">{b.customerName}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="text-gray-900">{b.vehicleName}</span>
                          {isTuro ? <Badge className="border-teal-200 bg-teal-100 text-teal-800">Turo</Badge> : null}
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-gray-600">
                        {formatDate(b.pickupDate)} → {formatDate(b.returnDate)}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">{formatCurrency(b.grossRevenue)}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-red-600">
                        {formatCurrency(b.processingFees + b.otherExpenses)}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">{formatCurrency(b.netRevenue)}</td>
                      <td className="px-4 py-3 text-right font-semibold tabular-nums text-purple-700">
                        {formatCurrency(b.ownerPayout)}
                      </td>
                      <td className="px-4 py-3">
                        <OwnerStatusBadge status={b.status} />
                      </td>
                      <td className="px-4 py-3 text-right">
                        {!isTuro ? (
                          <Link
                            href={`/admin/bookings?highlight=${encodeURIComponent(b.id)}`}
                            className="inline-flex items-center gap-0.5 text-sm font-medium text-purple-600 hover:text-purple-800"
                          >
                            View <ChevronRight className="h-4 w-4" />
                          </Link>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </AdminTableWrap>
        )}
      </div>
    </AdminSection>
  );
}
