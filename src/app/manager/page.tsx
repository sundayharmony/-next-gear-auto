"use client";

import React from "react";
import Link from "next/link";
import { Calendar, BarChart3, Car, Clock, RefreshCw, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AdminPageBody,
  AdminPageHeader,
  AdminStatCard,
  AdminCard,
} from "@/components/admin/admin-shell";
import { Skeleton } from "@/components/admin/skeleton";
import { useManagerAnalytics } from "@/lib/hooks/use-manager-analytics";

export default function ManagerDashboardPage() {
  const { data, loading, reload } = useManagerAnalytics();

  return (
    <>
      <AdminPageHeader
        title="Manager Dashboard"
        subtitle="Operational metrics scoped to manager-created bookings."
        actions={
          <Button variant="outline" size="sm" className="page-hero-btn-outline hidden sm:inline-flex" onClick={reload}>
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Refresh
          </Button>
        }
      />

      <AdminPageBody>
        <div className="mb-6 flex gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
          <Info className="h-5 w-5 shrink-0 text-blue-600" />
          <p>
            <strong>Bookings</strong> covers day-to-day trip management for manager-origin reservations.
            <strong> Analytics</strong> shows utilization and status metrics only — no company-wide finances or admin-only revenue.
          </p>
        </div>

        {loading ? (
          <div className="mb-8 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <AdminCard key={i} padding="sm">
                <Skeleton className="h-14 w-full rounded-lg" />
              </AdminCard>
            ))}
          </div>
        ) : (
          <>
            <div className="mb-8 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
              <AdminStatCard label="Total Bookings" value={data?.totalBookings ?? 0} icon={Calendar} />
              <AdminStatCard
                label="Booked Days"
                value={data?.totalBookedDays ?? 0}
                icon={Clock}
                iconClassName="text-blue-600"
                iconBgClassName="bg-blue-50"
              />
              <AdminStatCard
                label="Active"
                value={data?.statusCounts?.active ?? 0}
                icon={Car}
                iconClassName="text-green-600"
                iconBgClassName="bg-green-50"
              />
              <AdminStatCard
                label="Avg Days/Booking"
                value={data?.avgBookingDurationDays ?? 0}
                icon={BarChart3}
                iconClassName="text-amber-600"
                iconBgClassName="bg-amber-50"
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Link href="/manager/bookings" className="block h-full">
                <AdminCard hover className="h-full cursor-pointer hover:border-purple-200/80">
                  <h3 className="text-base font-semibold text-gray-900">Manage Bookings</h3>
                  <p className="mt-1 text-sm text-gray-500">Create and monitor manager-origin bookings.</p>
                </AdminCard>
              </Link>
              <Link href="/manager/analytics" className="block h-full">
                <AdminCard hover className="h-full cursor-pointer hover:border-purple-200/80">
                  <h3 className="text-base font-semibold text-gray-900">Operational Analytics</h3>
                  <p className="mt-1 text-sm text-gray-500">Status and utilization insights without finance metrics.</p>
                </AdminCard>
              </Link>
            </div>
          </>
        )}
      </AdminPageBody>
    </>
  );
}
