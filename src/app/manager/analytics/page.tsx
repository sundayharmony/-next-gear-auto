"use client";

import React, { useMemo } from "react";
import { BarChart3, RefreshCw, Calendar, Clock, Car, Timer } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AdminPageBody,
  AdminPageHeader,
  AdminStatCard,
  AdminCard,
  AdminSection,
} from "@/components/admin/admin-shell";
import { AdminEmptyState } from "@/components/admin/ui-feedback";
import { useManagerAnalytics } from "@/lib/hooks/use-manager-analytics";

export default function ManagerAnalyticsPage() {
  const { data, loading, reload } = useManagerAnalytics();
  const statusEntries = useMemo(() => Object.entries(data?.statusCounts || {}), [data?.statusCounts]);

  return (
    <>
      <AdminPageHeader
        title="Manager Analytics"
        subtitle="Non-financial analytics scoped to manager panel bookings only."
        actions={
          <Button variant="outline" size="sm" className="page-hero-btn-outline hidden sm:inline-flex" onClick={reload}>
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Refresh
          </Button>
        }
      />

      <AdminPageBody>
        {loading ? (
          <div className="py-12 text-center">
            <RefreshCw className="mx-auto h-8 w-8 animate-spin text-purple-600" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <AdminStatCard label="Bookings" value={data?.totalBookings ?? 0} icon={Calendar} />
              <AdminStatCard
                label="Booked Days"
                value={data?.totalBookedDays ?? 0}
                icon={Clock}
                iconClassName="text-blue-600"
                iconBgClassName="bg-blue-50"
              />
              <AdminStatCard
                label="Vehicles"
                value={data?.uniqueVehicles ?? 0}
                icon={Car}
                iconClassName="text-green-600"
                iconBgClassName="bg-green-50"
              />
              <AdminStatCard
                label="Avg Duration"
                value={data?.avgBookingDurationDays ?? 0}
                icon={Timer}
                iconClassName="text-amber-600"
                iconBgClassName="bg-amber-50"
              />
            </div>

            <AdminSection title="Status Breakdown" icon={BarChart3}>
              {statusEntries.length === 0 ? (
                <AdminEmptyState title="No status data available." />
              ) : (
                <AdminCard>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                    {statusEntries.map(([status, count]) => (
                      <div key={status} className="rounded-lg border border-gray-200/80 p-3">
                        <p className="text-xs uppercase text-gray-500">{status}</p>
                        <p className="text-xl font-semibold text-gray-900">{count}</p>
                      </div>
                    ))}
                  </div>
                </AdminCard>
              )}
            </AdminSection>

            <AdminSection title="Leakage Sentinel">
              <AdminCard>
                <p className="text-sm text-gray-600">
                  Expected origin: <strong>{data?.leakageSentinel.expectedOrigin || "manager_panel"}</strong>
                </p>
                <p className="mt-1 text-sm text-gray-600">
                  Checked rows: <strong>{data?.leakageSentinel.checkedRows ?? 0}</strong>
                </p>
                <p className="mt-1 text-sm text-gray-600">
                  Non-manager-origin rows detected:{" "}
                  <strong>{data?.leakageSentinel.nonManagerOriginRows ?? 0}</strong>
                </p>
              </AdminCard>
            </AdminSection>
          </>
        )}
      </AdminPageBody>
    </>
  );
}
