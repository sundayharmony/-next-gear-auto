"use client";

import React from "react";
import Link from "next/link";
import { Calendar, BarChart3, Car, Clock, RefreshCw, Info } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AdminPageBody, AdminPageHeader } from "@/components/admin/admin-shell";
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
        <div className="mb-6 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900 flex gap-2">
          <Info className="h-5 w-5 shrink-0 text-blue-600" />
          <p>
            <strong>Bookings</strong> covers day-to-day trip management for manager-origin reservations.
            <strong> Analytics</strong> shows utilization and status metrics only — no company-wide finances or admin-only revenue.
          </p>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin h-8 w-8 border-4 border-purple-600 border-t-transparent rounded-full mx-auto" />
            <p className="mt-4 text-gray-500">Loading manager dashboard...</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4 mb-8">
              <Card><CardContent className="p-4"><div className="flex items-center gap-3"><Calendar className="h-5 w-5 text-purple-600" /><div><p className="text-xl font-bold text-gray-900">{data?.totalBookings ?? 0}</p><p className="text-xs text-gray-500">Total Bookings</p></div></div></CardContent></Card>
              <Card><CardContent className="p-4"><div className="flex items-center gap-3"><Clock className="h-5 w-5 text-blue-600" /><div><p className="text-xl font-bold text-gray-900">{data?.totalBookedDays ?? 0}</p><p className="text-xs text-gray-500">Booked Days</p></div></div></CardContent></Card>
              <Card><CardContent className="p-4"><div className="flex items-center gap-3"><Car className="h-5 w-5 text-green-600" /><div><p className="text-xl font-bold text-gray-900">{data?.statusCounts?.active ?? 0}</p><p className="text-xs text-gray-500">Active</p></div></div></CardContent></Card>
              <Card><CardContent className="p-4"><div className="flex items-center gap-3"><BarChart3 className="h-5 w-5 text-amber-600" /><div><p className="text-xl font-bold text-gray-900">{data?.avgBookingDurationDays ?? 0}</p><p className="text-xs text-gray-500">Avg Days/Booking</p></div></div></CardContent></Card>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Link href="/manager/bookings">
                <Card className="hover:shadow-md transition-shadow">
                  <CardContent className="p-5">
                    <h3 className="text-lg font-semibold text-gray-900">Manage Bookings</h3>
                    <p className="text-sm text-gray-500 mt-1">Create and monitor manager-origin bookings.</p>
                  </CardContent>
                </Card>
              </Link>
              <Link href="/manager/analytics">
                <Card className="hover:shadow-md transition-shadow">
                  <CardContent className="p-5">
                    <h3 className="text-lg font-semibold text-gray-900">Operational Analytics</h3>
                    <p className="text-sm text-gray-500 mt-1">Status and utilization insights without finance metrics.</p>
                  </CardContent>
                </Card>
              </Link>
            </div>
          </>
        )}
      </AdminPageBody>
    </>
  );
}
