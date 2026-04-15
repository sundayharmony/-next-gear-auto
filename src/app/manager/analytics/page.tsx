"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { BarChart3, RefreshCw } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageContainer } from "@/components/layout/page-container";
import { adminFetch } from "@/lib/utils/admin-fetch";
import { logger } from "@/lib/utils/logger";

interface AnalyticsData {
  totalBookings: number;
  totalBookedDays: number;
  uniqueVehicles: number;
  avgBookingDurationDays: number;
  statusCounts: Record<string, number>;
  leakageSentinel: {
    expectedOrigin: string;
    checkedRows: number;
    nonManagerOriginRows: number;
  };
}

export default function ManagerAnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminFetch("/api/manager/analytics");
      const json = await res.json();
      if (res.ok && json.success) {
        setData(json.data);
      }
    } catch (error) {
      logger.error("Failed to fetch manager analytics:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const statusEntries = useMemo(() => Object.entries(data?.statusCounts || {}), [data?.statusCounts]);

  return (
    <>
      <section className="bg-gradient-to-br from-gray-900 to-purple-900 py-6 sm:py-8 text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Manager Analytics</h1>
            <p className="mt-1 text-sm sm:text-base text-purple-200">Non-financial analytics scoped to manager panel bookings only.</p>
          </div>
          <Button variant="outline" size="sm" className="border-purple-400 text-purple-200 hover:bg-purple-800 hidden sm:inline-flex" onClick={fetchAnalytics}>
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Refresh
          </Button>
        </div>
      </section>

      <PageContainer className="py-6 sm:py-8 space-y-6">
        {loading ? (
          <div className="text-center py-12">
            <RefreshCw className="h-8 w-8 animate-spin text-purple-600 mx-auto" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card><CardContent className="p-4"><p className="text-xs text-gray-500 uppercase">Bookings</p><p className="text-2xl font-bold text-gray-900">{data?.totalBookings ?? 0}</p></CardContent></Card>
              <Card><CardContent className="p-4"><p className="text-xs text-gray-500 uppercase">Booked Days</p><p className="text-2xl font-bold text-gray-900">{data?.totalBookedDays ?? 0}</p></CardContent></Card>
              <Card><CardContent className="p-4"><p className="text-xs text-gray-500 uppercase">Vehicles</p><p className="text-2xl font-bold text-gray-900">{data?.uniqueVehicles ?? 0}</p></CardContent></Card>
              <Card><CardContent className="p-4"><p className="text-xs text-gray-500 uppercase">Avg Duration</p><p className="text-2xl font-bold text-gray-900">{data?.avgBookingDurationDays ?? 0}</p></CardContent></Card>
            </div>

            <Card>
              <CardContent className="p-5">
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-purple-600" /> Status Breakdown
                </h2>
                {statusEntries.length === 0 ? (
                  <p className="text-gray-500">No status data available.</p>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {statusEntries.map(([status, count]) => (
                      <div key={status} className="rounded-lg border p-3">
                        <p className="text-xs text-gray-500 uppercase">{status}</p>
                        <p className="text-xl font-semibold text-gray-900">{count}</p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-5">
                <h2 className="text-lg font-semibold text-gray-900 mb-2">Leakage Sentinel</h2>
                <p className="text-sm text-gray-600">
                  Expected origin: <strong>{data?.leakageSentinel.expectedOrigin || "manager_panel"}</strong>
                </p>
                <p className="text-sm text-gray-600">
                  Checked rows: <strong>{data?.leakageSentinel.checkedRows ?? 0}</strong>
                </p>
                <p className="text-sm text-gray-600">
                  Non-manager-origin rows detected: <strong>{data?.leakageSentinel.nonManagerOriginRows ?? 0}</strong>
                </p>
              </CardContent>
            </Card>
          </>
        )}
      </PageContainer>
    </>
  );
}
