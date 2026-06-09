"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { adminFetch } from "@/lib/utils/admin-fetch";
import { getLocalYmd } from "@/lib/utils/date-helpers";
import { logger } from "@/lib/utils/logger";
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

export function useFinancesData() {
  const [bookings, setBookings] = useState<FinanceBooking[]>([]);
  const [blockedDates, setBlockedDates] = useState<BlockedDateFinanceEntry[]>([]);
  const [expenses, setExpenses] = useState<FinanceExpense[]>([]);
  const [vehicles, setVehicles] = useState<FinanceVehicle[]>([]);
  const [maintenance, setMaintenance] = useState<FinanceMaintenanceRecord[]>([]);
  const [tickets, setTickets] = useState<FinanceTicketRow[]>([]);
  const [loading, setLoading] = useState(true);
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

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [bookingsRes, blockedDatesRes, expensesRes, vehiclesRes, maintenanceRes, ticketsRes] =
        await Promise.all([
          adminFetch("/api/admin/bookings"),
          adminFetch("/api/admin/blocked-dates"),
          adminFetch("/api/admin/expenses"),
          adminFetch("/api/admin/vehicles"),
          adminFetch("/api/admin/maintenance"),
          adminFetch("/api/admin/tickets"),
        ]);

      if (!bookingsRes.ok || !expensesRes.ok || !vehiclesRes.ok) {
        throw new Error("Failed to fetch data");
      }

      const bookingsData = await bookingsRes.json();
      const blockedDatesData = blockedDatesRes.ok ? await blockedDatesRes.json() : { data: [] };
      const expensesData = await expensesRes.json();
      const vehiclesData = await vehiclesRes.json();
      const maintenanceData = maintenanceRes.ok ? await maintenanceRes.json() : { data: [] };
      if (!maintenanceRes.ok) logger.warn("Failed to fetch maintenance data");
      const ticketsData = ticketsRes.ok ? await ticketsRes.json() : { data: [] };
      if (!ticketsRes.ok) logger.warn("Failed to fetch tickets data");

      setBookings(Array.isArray(bookingsData?.data) ? bookingsData.data : []);
      setBlockedDates(Array.isArray(blockedDatesData?.data) ? blockedDatesData.data : []);
      setExpenses(Array.isArray(expensesData?.data) ? expensesData.data : []);
      setVehicles(Array.isArray(vehiclesData?.data) ? vehiclesData.data : []);
      setMaintenance(Array.isArray(maintenanceData?.data) ? maintenanceData.data : []);
      setTickets(Array.isArray(ticketsData?.data) ? ticketsData.data : []);
    } catch (err) {
      logger.error("Error fetching data:", err);
      setError(err instanceof Error ? err.message : "Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    bookings,
    blockedDates,
    expenses,
    vehicles,
    maintenance,
    tickets,
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
