"use client";

import { useMemo } from "react";
import { useStaffQuery } from "@/lib/hooks/use-staff-query";

interface PendingBookingRow {
  id: string;
  customer_name?: string;
  created_at: string;
  total_price?: number;
}

interface PendingBookingsPayload {
  rows: PendingBookingRow[];
  count: number;
}

function normalizePendingBookings(data: PendingBookingRow[]): PendingBookingsPayload {
  const rows = [...data]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5)
    .map((b) => ({
      id: b.id,
      customer_name: b.customer_name || "Unknown",
      created_at: b.created_at,
      total_price: b.total_price || 0,
    }));
  return { rows, count: data.length };
}

/** Admin pending-booking notifications via react-query polling. */
export function useStaffNotifications(enabled: boolean) {
  const jitter = useMemo(() => 45_000 + Math.random() * 30_000, []);

  const query = useStaffQuery<PendingBookingRow[]>(
    ["staff", "pending-bookings"],
    enabled ? "/api/admin/bookings?status=pending&limit=50" : null,
    {
      enabled,
      refetchInterval: enabled
        ? () => (typeof document !== "undefined" && document.hidden ? false : jitter)
        : false,
    }
  );

  const payload = useMemo(
    () => normalizePendingBookings(Array.isArray(query.data) ? query.data : []),
    [query.data]
  );

  return {
    pendingCount: payload.count,
    recentBookings: payload.rows,
    isLoading: query.isLoading,
    refetch: query.refetch,
  };
}
