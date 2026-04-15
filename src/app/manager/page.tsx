"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Calendar, BarChart3, Car, Clock, RefreshCw } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { adminFetch } from "@/lib/utils/admin-fetch";
import { logger } from "@/lib/utils/logger";
import { PageContainer } from "@/components/layout/page-container";

interface ManagerDashboardData {
  totalBookings: number;
  statusCounts: Record<string, number>;
  totalBookedDays: number;
  avgBookingDurationDays: number;
}

export default function ManagerDashboardPage() {
  const [data, setData] = useState<ManagerDashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminFetch("/api/manager/analytics");
      const json = await res.json();
      if (res.ok && json.success) {
        setData(json.data);
      }
    } catch (error) {
      logger.error("Failed to fetch manager dashboard:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  return (
    <>
      <section className="bg-gradient-to-br from-gray-900 to-purple-900 py-6 sm:py-8 text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Manager Dashboard</h1>
            <p className="mt-1 text-sm sm:text-base text-purple-200">Operational metrics scoped to manager-created bookings.</p>
          </div>
          <Button variant="outline" size="sm" className="border-purple-400 text-purple-200 hover:bg-purple-800 hidden sm:inline-flex" onClick={fetchDashboard}>
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Refresh
          </Button>
        </div>
      </section>

      <PageContainer className="py-6 sm:py-8">
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
      </PageContainer>
    </>
  );
}
