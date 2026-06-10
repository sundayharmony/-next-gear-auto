"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import {
  DollarSign,
  CalendarClock,
  Car,
  Plus,
  CheckCircle2,
  Wallet,
  Clock,
  TrendingUp,
  Gauge,
} from "lucide-react";
import {
  AdminPageHeader,
  AdminPageBody,
  AdminStatCard,
  AdminCard,
  AdminSection,
} from "@/components/admin/admin-shell";
import { useOwnerData } from "@/lib/owner/owner-data-context";
import { OwnerStatusBadge, OwnerBookingDetailModal } from "@/components/owner/owner-shared";
import { formatCurrency, formatDate } from "@/lib/utils/date-helpers";
import type { OwnerBooking } from "@/lib/types";
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
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function OwnerDashboardPage() {
  const { metrics, bookings, loading } = useOwnerData();
  const [selected, setSelected] = useState<OwnerBooking | null>(null);

  const recentBookings = useMemo(() => (bookings || []).slice(0, 8), [bookings]);

  return (
    <>
      <AdminPageHeader
        title="Owner Dashboard"
        subtitle="Performance across your vehicles"
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
        {loading && !metrics ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-purple-600" role="status" aria-label="Loading dashboard" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              <AdminStatCard label="Total Revenue" value={formatCurrency(metrics?.totalRevenue ?? 0)} icon={DollarSign} />
              <AdminStatCard label="Estimated Payout" value={formatCurrency(metrics?.estimatedPayout ?? 0)} icon={Wallet} iconClassName="text-blue-600" iconBgClassName="bg-blue-50" />
              <AdminStatCard label="Pending Payouts" value={formatCurrency(metrics?.pendingPayouts ?? 0)} icon={Clock} iconClassName="text-amber-600" iconBgClassName="bg-amber-50" />
              <AdminStatCard label="Lifetime Earnings" value={formatCurrency(metrics?.lifetimeEarnings ?? 0)} icon={TrendingUp} iconClassName="text-emerald-600" iconBgClassName="bg-emerald-50" />
              <AdminStatCard label="Upcoming Bookings" value={metrics?.upcomingBookings ?? 0} icon={CalendarClock} iconClassName="text-indigo-600" iconBgClassName="bg-indigo-50" />
              <AdminStatCard label="Active Rentals" value={metrics?.activeRentals ?? 0} icon={Car} iconClassName="text-green-600" iconBgClassName="bg-green-50" />
              <AdminStatCard label="Completed Rentals" value={metrics?.completedRentals ?? 0} icon={CheckCircle2} iconClassName="text-gray-600" iconBgClassName="bg-gray-100" />
              <AdminStatCard label="Utilization Rate" value={`${metrics?.utilizationRate ?? 0}%`} icon={Gauge} iconClassName="text-purple-600" iconBgClassName="bg-purple-50" />
            </div>

            <AdminSection title="Monthly Revenue & Payouts" description="Last 6 months">
              <AdminCard>
                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={metrics?.monthlyRevenue ?? []} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                      <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="#9ca3af" />
                      <YAxis tick={{ fontSize: 12 }} stroke="#9ca3af" tickFormatter={(v) => `$${v}`} />
                      <Tooltip formatter={(v) => formatCurrency(Number(v) || 0)} />
                      <Legend />
                      <Bar dataKey="revenue" name="Revenue" fill="#c4b5fd" radius={[4, 4, 0, 0]} />
                      <Line type="monotone" dataKey="payout" name="Owner Payout" stroke="#7c3aed" strokeWidth={2} dot={{ r: 3 }} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </AdminCard>
            </AdminSection>

            <AdminSection title="Recent Bookings" description="Tap a booking to see the payout breakdown">
              {recentBookings.length === 0 ? (
                <AdminCard><p className="py-6 text-center text-sm text-gray-500">No bookings yet.</p></AdminCard>
              ) : (
                <div className="space-y-2">
                  {recentBookings.map((b) => (
                    <button
                      key={b.id}
                      onClick={() => setSelected(b)}
                      className="flex w-full items-center justify-between gap-3 rounded-xl border border-gray-200/80 bg-white p-4 text-left shadow-sm transition-colors hover:border-purple-200 hover:bg-purple-50/40"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-medium text-gray-900">{b.vehicleName}</p>
                        <p className="text-xs text-gray-500">{formatDate(b.pickupDate)} → {formatDate(b.returnDate)} · {b.rentalDays} days</p>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1">
                        <span className="font-semibold tabular-nums text-gray-900">{formatCurrency(b.ownerPayout)}</span>
                        <OwnerStatusBadge status={b.status} />
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </AdminSection>
          </>
        )}
      </AdminPageBody>

      <OwnerBookingDetailModal booking={selected} onClose={() => setSelected(null)} />
    </>
  );
}
