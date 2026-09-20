"use client";

import { useCallback, useState } from "react";
import { adminFetch } from "@/lib/utils/admin-fetch";
import { calculateFinancing } from "@/lib/utils/financing";
import { formatDate, getLocalYmd } from "@/lib/utils/date-helpers";
import {
  countBookedDaysInRange,
  prorateBookingRevenueInRange,
} from "@/lib/finance/booking-proration";
import { countInclusiveTripDays } from "@/lib/utils/turo-blocked-date";
import { exportToCSV } from "@/lib/utils/csv-export";
import { logger } from "@/lib/utils/logger";
import { staffKeys, useStaffMutation } from "@/lib/hooks/use-staff-query";
import type { EditingExpense } from "./finances-shared";
import type { FinanceBooking } from "./use-finances-data";
import { getTuroDriverFromReason } from "@/lib/utils/turo-blocked-date";
import type { NewExpenseForm, TuroRevenueEntry } from "./finances-tab-types";
import type { UnifiedExpense, Vehicle } from "./finances-shared";

export type VehicleFinanceTrip = {
  id: string;
  kind: "booking" | "turo";
  label: string;
  pickup_date: string;
  return_date: string;
  amount: number;
  status: string;
  created_at: string;
};

const defaultNewExpense = (): NewExpenseForm => ({
  vehicleId: "",
  blockedDateId: "",
  category: "maintenance",
  amount: "",
  description: "",
  date: getLocalYmd(new Date()),
});

interface UseFinancesMutationsOptions {
  setError: (message: string) => void;
  setSuccess: (message: string) => void;
}

export function useFinancesMutations({ setError, setSuccess }: UseFinancesMutationsOptions) {
  const [addingExpense, setAddingExpense] = useState(false);
  const [newExpense, setNewExpense] = useState<NewExpenseForm>(defaultNewExpense);
  const [editingExpense, setEditingExpense] = useState<EditingExpense | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [savingExpenseId, setSavingExpenseId] = useState<string | null>(null);

  const createExpenseMutation = useStaffMutation({
    mutationFn: async (payload: {
      vehicleId: string | null;
      blockedDateId?: string;
      category: string;
      amount: number;
      description: string | null;
      date: string;
    }) => {
      const response = await adminFetch("/api/admin/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error("Failed to create expense");
    },
    invalidateKeys: [staffKeys.finances()],
    onSuccess: () => {
      setNewExpense(defaultNewExpense());
      setAddingExpense(false);
      setSuccess("Expense added successfully");
    },
    onError: (err) => {
      logger.error("Error creating expense:", err);
      setError("Failed to create expense");
    },
  });

  const updateExpenseMutation = useStaffMutation({
    mutationFn: async (payload: {
      id: string;
      vehicleId: string | null;
      blockedDateId: string;
      category: string;
      amount: number;
      description: string | null;
      date: string;
    }) => {
      const response = await adminFetch("/api/admin/expenses", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error("Failed to update expense");
    },
    invalidateKeys: [staffKeys.finances()],
    onSuccess: () => {
      setEditingExpense(null);
      setSuccess("Expense updated successfully");
    },
    onError: (err) => {
      logger.error("Error updating expense:", err);
      setError("Failed to update expense");
    },
  });

  const deleteExpenseMutation = useStaffMutation({
    mutationFn: async (id: string) => {
      const response = await adminFetch(`/api/admin/expenses?id=${id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Failed to delete expense");
    },
    invalidateKeys: [staffKeys.finances()],
    onSuccess: () => {
      setDeleteConfirm(null);
      setSuccess("Expense deleted");
    },
    onError: (err) => {
      logger.error("Error deleting expense:", err);
      setError("Failed to delete expense");
    },
  });

  const handleAddExpense = useCallback(async () => {
    if (!newExpense.amount || !newExpense.date) {
      setError("Please fill in all required fields");
      return;
    }
    const parsedAmount = parseFloat(newExpense.amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError("Please enter a valid amount greater than zero");
      return;
    }
    setSavingExpenseId("new");
    try {
      await createExpenseMutation.mutateAsync({
        vehicleId: newExpense.vehicleId || null,
        blockedDateId: newExpense.blockedDateId || undefined,
        category: newExpense.category,
        amount: parsedAmount,
        description: newExpense.description || null,
        date: newExpense.date,
      });
    } finally {
      setSavingExpenseId(null);
    }
  }, [createExpenseMutation, newExpense, setError]);

  const handleUpdateExpense = useCallback(async () => {
    if (!editingExpense || !editingExpense.amount || !editingExpense.date) {
      setError("Please fill in all required fields");
      return;
    }
    const parsedAmount = parseFloat(editingExpense.amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError("Please enter a valid amount greater than zero");
      return;
    }
    setSavingExpenseId(editingExpense.id);
    try {
      await updateExpenseMutation.mutateAsync({
        id: editingExpense.id,
        vehicleId: editingExpense.vehicle_id || null,
        blockedDateId: editingExpense.blocked_date_id?.trim() || "",
        category: editingExpense.category,
        amount: parsedAmount,
        description: editingExpense.description || null,
        date: editingExpense.date,
      });
    } finally {
      setSavingExpenseId(null);
    }
  }, [editingExpense, setError, updateExpenseMutation]);

  const handleDeleteExpense = useCallback(
    async (id: string) => {
      setSavingExpenseId(id);
      try {
        await deleteExpenseMutation.mutateAsync(id);
      } finally {
        setSavingExpenseId(null);
      }
    },
    [deleteExpenseMutation]
  );

  return {
    addingExpense,
    setAddingExpense,
    newExpense,
    setNewExpense,
    editingExpense,
    setEditingExpense,
    deleteConfirm,
    setDeleteConfirm,
    savingExpenseId,
    handleAddExpense,
    handleUpdateExpense,
    handleDeleteExpense,
  };
}

export function getVehicleDetail(
  vehicleId: string,
  vehicles: Vehicle[],
  revenueBookings: FinanceBooking[],
  turoRevenueEntries: TuroRevenueEntry[],
  allExpenses: UnifiedExpense[],
  dateRange: { from: string; to: string }
) {
  const vehicle = vehicles.find((v) => v.id === vehicleId);
  if (!vehicle) return null;
  const vBookings = revenueBookings.filter((b) => b.vehicle_id === vehicleId);
  const vTuroTrips = turoRevenueEntries.filter((t) => t.vehicle_id === vehicleId);
  const bookingRevenue = vBookings.reduce(
    (s, b) =>
      s +
      prorateBookingRevenueInRange(
        b.total_price ?? 0,
        b.pickup_date,
        b.return_date,
        dateRange.from,
        dateRange.to
      ),
    0
  );
  const turoRevenue = vTuroTrips.reduce((s, t) => s + t.revenue, 0);
  const revenue = bookingRevenue + turoRevenue;
  const vExpenses = allExpenses.filter((e) => e.vehicle_id === vehicleId);
  const expenseTotal = vExpenses.reduce((s, e) => s + (e.amount ?? 0), 0);
  const effectiveCost = vehicle.isFinanced ? 0 : (vehicle.purchasePrice ?? 0);
  const financingInfo = vehicle.isFinanced ? calculateFinancing(vehicle) : null;
  const profit = revenue - expenseTotal - effectiveCost;
  const totalCost = expenseTotal + effectiveCost;
  const roi = totalCost > 0 ? ((profit / totalCost) * 100).toFixed(1) : "0.0";
  const totalDays = Math.max(1, countInclusiveTripDays(dateRange.from, dateRange.to));
  let bookedDays = 0;
  vBookings.forEach((b) => {
    bookedDays += countBookedDaysInRange(
      b.pickup_date,
      b.return_date,
      dateRange.from,
      dateRange.to
    );
  });
  vTuroTrips.forEach((t) => {
    bookedDays += countBookedDaysInRange(
      t.start_date,
      t.end_date,
      dateRange.from,
      dateRange.to
    );
  });
  const occupancy = Math.min(100, (bookedDays / totalDays) * 100);

  const trips: VehicleFinanceTrip[] = [
    ...vBookings.map((b) => ({
      id: b.id,
      kind: "booking" as const,
      label: b.id,
      pickup_date: b.pickup_date,
      return_date: b.return_date,
      amount: prorateBookingRevenueInRange(
        b.total_price ?? 0,
        b.pickup_date,
        b.return_date,
        dateRange.from,
        dateRange.to
      ),
      status: b.status,
      created_at: b.created_at,
    })),
    ...vTuroTrips.map((t) => ({
      id: t.id,
      kind: "turo" as const,
      label: getTuroDriverFromReason(t.reason) || `Turo ${t.id.slice(0, 8)}`,
      pickup_date: t.start_date,
      return_date: t.end_date,
      amount: t.revenue,
      status: "turo",
      created_at: t.start_date,
    })),
  ];

  return {
    vehicle,
    bookings: vBookings,
    turoTrips: vTuroTrips,
    trips,
    expenses: vExpenses,
    revenue,
    expenseTotal,
    effectiveCost,
    financingInfo,
    profit,
    roi,
    occupancy,
    bookedDays,
  };
}

export function exportExpensesCsv(
  allExpenses: UnifiedExpense[],
  vehicleMap: Map<string, Vehicle>
) {
  const exportData = allExpenses.map((expense) => {
    const v = expense.vehicle_id ? vehicleMap.get(expense.vehicle_id) : null;
    return {
      Date: formatDate(expense.date),
      Category: expense.category.charAt(0).toUpperCase() + expense.category.slice(1),
      Description: expense.description || "",
      Vehicle: v ? `${v.make} ${v.model}` : "N/A",
      Amount: expense.amount,
      Source: expense.source,
    };
  });
  exportToCSV(exportData, `expenses-export-${getLocalYmd(new Date())}`);
}
