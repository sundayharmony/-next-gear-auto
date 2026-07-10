"use client";

import {
  Car,
  CheckCircle2,
  Clock,
  CreditCard,
  DollarSign,
  TrendingUp,
} from "lucide-react";
import { AdminStatCard } from "@/components/admin/admin-shell";
import type { CustomerStats } from "../customer-detail-types";

export function CustomerStatsGrid({ stats }: { stats: CustomerStats }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
      <AdminStatCard
        label="Total Spent"
        value={`$${stats.totalSpent.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
        icon={DollarSign}
        iconClassName="text-green-600"
        iconBgClassName="bg-green-50"
      />
      <AdminStatCard label="Total Bookings" value={stats.totalBookings} icon={Car} />
      <AdminStatCard
        label="Completed"
        value={stats.completedTrips}
        icon={CheckCircle2}
        iconClassName="text-green-600"
        iconBgClassName="bg-green-50"
      />
      <AdminStatCard
        label="Active / Upcoming"
        value={stats.activeTrips}
        icon={Clock}
        iconClassName="text-blue-600"
        iconBgClassName="bg-blue-50"
      />
      <AdminStatCard
        label="Rental Days"
        value={stats.totalDays}
        icon={TrendingUp}
        iconClassName="text-indigo-600"
        iconBgClassName="bg-indigo-50"
      />
      <AdminStatCard
        label="Avg. Booking"
        value={`$${stats.avgBookingValue.toFixed(0)}`}
        icon={CreditCard}
        iconClassName="text-amber-600"
        iconBgClassName="bg-amber-50"
      />
    </div>
  );
}
