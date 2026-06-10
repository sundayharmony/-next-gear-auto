"use client";

import { staffKeys, useStaffQuery } from "@/lib/hooks/use-staff-query";

export interface ManagerAnalyticsData {
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

/** Shared react-query cache between manager dashboard and analytics pages. */
export function useManagerAnalytics() {
  const query = useStaffQuery<ManagerAnalyticsData>(
    staffKeys.managerAnalytics(),
    "/api/manager/analytics",
    { staleTime: 30_000 }
  );

  return {
    data: query.data ?? null,
    loading: query.isLoading,
    reload: () => query.refetch(),
  };
}
