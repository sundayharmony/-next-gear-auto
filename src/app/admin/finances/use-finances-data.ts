"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useQueries, useQueryClient } from "@tanstack/react-query";
import { getLocalYmd } from "@/lib/utils/date-helpers";
import { logger } from "@/lib/utils/logger";
import { staffKeys, staffQueryFetcher } from "@/lib/hooks/use-staff-query";
import type { Vehicle as SharedVehicle } from "@/lib/types";

export interface FinanceBooking {
  id: string;
  vehicle_id: string;
  status: string;
  total_price: number;
  pickup_date: string;
  return_date: string;
  created_at: string;
}

export interface FinanceMaintenanceRecord {
  id: string;
  vehicleId: string;
  title: string;
  status: string;
  cost: number | null;
  scheduledDate: string;
  completedDate: string | null;
  createdAt: string;
}

export interface FinanceExpense {
  id: string;
  vehicle_id: string | null;
  category: string;
  amount: number;
  description: string | null;
  date: string;
  created_at: string;
  blocked_date_id?: string | null;
}

export interface BlockedDateFinanceEntry {
  id: string;
  vehicle_id: string;
  start_date: string;
  end_date: string;
  source: string;
  earnings: number | null;
  reason?: string | null;
  cancelled_at?: string | null;
}

export type FinanceVehicle = SharedVehicle;

export interface FinanceTicketRow {
  id: string;
  vehicle_id?: string;
  amount_due?: number;
  ticket_type?: string;
  municipality?: string;
  state?: string;
  violation_date?: string;
  created_at?: string;
}

async function fetchFinanceResource<T>(url: string, optional = false): Promise<T[]> {
  try {
    const data = await staffQueryFetcher<T[]>(url);
    return Array.isArray(data) ? data : [];
  } catch (err) {
    if (optional) {
      logger.warn(`Failed to fetch optional finance resource ${url}:`, err);
      return [];
    }
    throw err;
  }
}

export function useFinancesData() {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  const defaultDateRange = useMemo(
    () => ({
      from: getLocalYmd(new Date(new Date().getFullYear(), 0, 1)),
      to: getLocalYmd(new Date()),
    }),
    []
  );

  const [dateRange, setDateRange] = useState(defaultDateRange);
  const [draftDateRange, setDraftDateRange] = useState(defaultDateRange);
  const draftDirty = draftDateRange.from !== dateRange.from || draftDateRange.to !== dateRange.to;

  const financeKey = staffKeys.finances(dateRange);

  const results = useQueries({
    queries: [
      {
        queryKey: [...financeKey, "bookings"],
        queryFn: () => fetchFinanceResource<FinanceBooking>("/api/admin/bookings"),
        staleTime: 30_000,
      },
      {
        queryKey: [...financeKey, "blockedDates"],
        queryFn: () => fetchFinanceResource<BlockedDateFinanceEntry>("/api/admin/blocked-dates", true),
        staleTime: 30_000,
      },
      {
        queryKey: [...financeKey, "expenses"],
        queryFn: () => fetchFinanceResource<FinanceExpense>("/api/admin/expenses"),
        staleTime: 30_000,
      },
      {
        queryKey: [...financeKey, "vehicles"],
        queryFn: () => fetchFinanceResource<FinanceVehicle>("/api/admin/vehicles"),
        staleTime: 60_000,
      },
      {
        queryKey: [...financeKey, "maintenance"],
        queryFn: () => fetchFinanceResource<FinanceMaintenanceRecord>("/api/admin/maintenance", true),
        staleTime: 30_000,
      },
      {
        queryKey: [...financeKey, "tickets"],
        queryFn: () => fetchFinanceResource<FinanceTicketRow>("/api/admin/tickets", true),
        staleTime: 30_000,
      },
    ],
  });

  const [bookingsQ, blockedDatesQ, expensesQ, vehiclesQ, maintenanceQ, ticketsQ] = results;

  const loading = results.some((q) => q.isLoading);

  useEffect(() => {
    const fetchError =
      bookingsQ.error?.message || expensesQ.error?.message || vehiclesQ.error?.message || null;
    if (fetchError) setError(fetchError);
  }, [bookingsQ.error, expensesQ.error, vehiclesQ.error]);

  const fetchData = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: staffKeys.finances(dateRange) });
  }, [queryClient, dateRange]);

  return {
    bookings: bookingsQ.data ?? [],
    blockedDates: blockedDatesQ.data ?? [],
    expenses: expensesQ.data ?? [],
    vehicles: vehiclesQ.data ?? [],
    maintenance: maintenanceQ.data ?? [],
    tickets: ticketsQ.data ?? [],
    loading,
    error,
    setError,
    fetchData,
    dateRange,
    setDateRange,
    draftDateRange,
    setDraftDateRange,
    draftDirty,
    defaultDateRange,
  };
}
