import type { Dispatch, SetStateAction } from "react";
import type { EditingExpense, UnifiedExpense, Vehicle } from "./finances-shared";
import type { FinanceBooking, FinanceExpense } from "./use-finances-data";

export type FinancesTabId = "overview" | "expenses" | "revenue" | "profit" | "vehicles";

export interface NewExpenseForm {
  vehicleId: string;
  blockedDateId: string;
  category: string;
  amount: string;
  description: string;
  date: string;
}

export interface FinancesSummaryData {
  bookingRevenue: number;
  turoRevenue: number;
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  profitMargin: number;
  occupancyRate: number;
  totalBookings: number;
  avgBookingValue: number;
  totalBookedDays: number;
}

export interface VehicleAnalyticsRow {
  id: string;
  name: string;
  bookings: number;
  revenue: number;
  expenses: number;
  profit: number;
  occupancy: number;
  bookedDays: number;
}

export interface TuroRevenueEntry {
  id: string;
  vehicle_id: string;
  /** Revenue attributed to the selected date range (prorated when trip spans outside range). */
  revenue: number;
  /** Full trip payout before range proration. */
  fullRevenue: number;
  date: string;
  start_date: string;
  end_date: string;
  reason: string | null;
}

export interface FinancesTabProps {
  dateRange: { from: string; to: string };
  vehicles: Vehicle[];
  expenses: FinanceExpense[];
  summaryData: FinancesSummaryData;
  cashFlowData: Array<{ month: string; income: number; expenses: number; net: number }>;
  dailyEarningsData: Array<{ label: string; date: string; revenue: number; expenses: number }>;
  expenseCategoryData: Array<{ name: string; key: string; value: number }>;
  vehicleAnalytics: VehicleAnalyticsRow[];
  revenueByMonth: Array<{ month: string; date: string; revenue: number; bookings: number }>;
  monthlyProfitData: Array<{ month: string; date: string; revenue: number; expenses: number; profit: number }>;
  revenueBookings: FinanceBooking[];
  turoRevenueEntries: TuroRevenueEntry[];
  allExpenses: UnifiedExpense[];
  filteredExpenses: UnifiedExpense[];
  maintenanceCosts: UnifiedExpense[];
  financingCosts: UnifiedExpense[];
  ticketCosts: UnifiedExpense[];
  tripExpenseTotalsByBlockedId: Map<string, number>;
  vehicleMap: Map<string, Vehicle>;
  setActiveTab: (tab: FinancesTabId) => void;
  setSelectedVehicleId: (id: string | null) => void;
  setShowDailyRevenue: (show: boolean) => void;
  addingExpense: boolean;
  setAddingExpense: Dispatch<SetStateAction<boolean>>;
  newExpense: NewExpenseForm;
  setNewExpense: Dispatch<SetStateAction<NewExpenseForm>>;
  editingExpense: EditingExpense | null;
  setEditingExpense: Dispatch<SetStateAction<EditingExpense | null>>;
  deleteConfirm: string | null;
  setDeleteConfirm: Dispatch<SetStateAction<string | null>>;
  savingExpenseId: string | null;
  handleAddExpense: () => void;
  handleUpdateExpense: () => void;
  handleDeleteExpense: (id: string) => void;
  handleExportExpensesCSV: () => void;
}
