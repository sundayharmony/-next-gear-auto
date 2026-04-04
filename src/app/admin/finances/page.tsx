"use client";

import React, { useEffect, useState, useMemo } from "react";
import { adminFetch } from "@/lib/utils/admin-fetch";
import { calculateFinancing } from "@/lib/utils/financing";
import { useAutoToast } from "@/lib/hooks/useAutoToast";
import type { Vehicle as SharedVehicle } from "@/lib/types";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Plus,
  Pencil,
  Trash2,
  Car,
  Calendar,
  RefreshCw,
  AlertCircle,
  ArrowLeft,
  X,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  Receipt,
  Target,
  Fuel,
  Shield,
  Wrench,
  Sparkles,
  ParkingCircle,
  FileText,
  MoreHorizontal,
  Download,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { PageContainer } from "@/components/layout/page-container";
import { formatDate } from "@/lib/utils/date-helpers";
import { getVehicleDisplayName } from "@/lib/types";
import { logger } from "@/lib/utils/logger";
import { exportToCSV } from "@/lib/utils/csv-export";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line,
  CartesianGrid,
  Area,
  AreaChart,
  ComposedChart,
} from "recharts";

// ─── Types ────────────────────────────────────────────────────────
interface Booking {
  id: string;
  vehicle_id: string;
  status: string;
  total_price: number;
  pickup_date: string;
  return_date: string;
  created_at: string;
}

interface MaintenanceRecord {
  id: string;
  vehicleId: string;
  title: string;
  status: string;
  cost: number | null;
  scheduledDate: string;
  completedDate: string | null;
  createdAt: string;
}

interface Expense {
  id: string;
  vehicle_id: string | null;
  category: string;
  amount: number;
  description: string | null;
  date: string;
  created_at: string;
}

/** Vehicle with finance fields (matches shared Vehicle type) */
type Vehicle = SharedVehicle;

interface EditingExpense {
  id: string;
  category: string;
  amount: string;
  description: string;
  date: string;
  vehicle_id: string | null;
}

/** Unified expense entry with source tracking */
interface UnifiedExpense {
  id: string;
  vehicle_id: string | null;
  category: string;
  amount: number;
  description: string | null;
  date: string;
  created_at: string;
  source: "manual" | "maintenance" | "financing" | "ticket";
}

// ─── Constants ────────────────────────────────────────────────────
const CATEGORY_COLORS: Record<string, string> = {
  maintenance: "#EF4444",   // Red
  insurance: "#3B82F6",     // Blue
  fuel: "#F59E0B",          // Amber
  cleaning: "#10B981",      // Emerald
  parking: "#06B6D4",       // Cyan (was purple — too similar to financing)
  registration: "#EC4899",  // Pink
  financing: "#6366F1",     // Indigo (was purple — now clearly indigo)
  tickets: "#F97316",       // Orange
  other: "#6B7280",         // Gray
};

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  maintenance: <Wrench className="h-4 w-4" />,
  insurance: <Shield className="h-4 w-4" />,
  fuel: <Fuel className="h-4 w-4" />,
  cleaning: <Sparkles className="h-4 w-4" />,
  parking: <ParkingCircle className="h-4 w-4" />,
  registration: <FileText className="h-4 w-4" />,
  financing: <Wallet className="h-4 w-4" />,
  tickets: <Receipt className="h-4 w-4" />,
  other: <MoreHorizontal className="h-4 w-4" />,
};

const CATEGORIES = [
  "maintenance",
  "insurance",
  "fuel",
  "cleaning",
  "parking",
  "registration",
  "financing",
  "tickets",
  "other",
];

// ─── Helper Components ────────────────────────────────────────────
function StatCard({
  label,
  value,
  subtext,
  icon,
  trend,
  accent = "gray",
  onClick,
}: {
  label: string;
  value: string;
  subtext?: string;
  icon: React.ReactNode;
  trend?: "up" | "down" | "neutral";
  accent?: "green" | "red" | "purple" | "blue" | "amber" | "gray";
  onClick?: () => void;
}) {
  const accentMap = {
    green: "from-green-500 to-emerald-600",
    red: "from-red-500 to-rose-600",
    purple: "from-purple-500 to-violet-600",
    blue: "from-blue-500 to-indigo-600",
    amber: "from-amber-500 to-orange-600",
    gray: "from-gray-500 to-slate-600",
  };

  return (
    <div
      className={`bg-white rounded-2xl border border-gray-100 p-4 sm:p-5 hover:shadow-md transition-all admin-card-press ${onClick ? "cursor-pointer hover:border-purple-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500" : ""}`}
      onClick={onClick}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick(); } } : undefined}
      role={onClick ? "button" : undefined}
    >
      <div className="flex items-start justify-between mb-2 sm:mb-3">
        <div
          className={`p-2 sm:p-2.5 rounded-xl bg-gradient-to-br ${accentMap[accent]} text-white`}
        >
          {icon}
        </div>
        {trend && (
          <div
            className={`flex items-center gap-0.5 text-xs font-medium ${
              trend === "up"
                ? "text-green-600"
                : trend === "down"
                  ? "text-red-500"
                  : "text-gray-400"
            }`}
          >
            {trend === "up" ? (
              <ArrowUpRight className="h-3.5 w-3.5" />
            ) : trend === "down" ? (
              <ArrowDownRight className="h-3.5 w-3.5" />
            ) : null}
          </div>
        )}
      </div>
      <p className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">{value}</p>
      <p className="text-[11px] sm:text-xs text-gray-500 mt-0.5 sm:mt-1 font-medium uppercase tracking-wide">
        {label}
      </p>
      {subtext && <p className="text-[11px] sm:text-xs text-gray-500 mt-0.5">{subtext}</p>}
    </div>
  );
}

function SectionHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-end justify-between mb-4">
      <div>
        <h2 className="text-lg font-bold text-gray-900">{title}</h2>
        {subtitle && (
          <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>
        )}
      </div>
      {action}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────
export default function AdminFinancesPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [maintenance, setMaintenance] = useState<MaintenanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const { error, setError, success, setSuccess } = useAutoToast();
  const defaultDateRange = useMemo(() => ({
    from: new Date(new Date().getFullYear(), 0, 1).toISOString().split("T")[0],
    to: new Date().toISOString().split("T")[0],
  }), []);
  // Applied date range — this is what drives data fetching
  const [dateRange, setDateRange] = useState(defaultDateRange);
  // Draft state for date inputs — user edits these freely, then clicks Apply
  const [draftDateRange, setDraftDateRange] = useState(defaultDateRange);
  const draftDirty = draftDateRange.from !== dateRange.from || draftDateRange.to !== dateRange.to;
  const [addingExpense, setAddingExpense] = useState(false);
  const [newExpense, setNewExpense] = useState({
    vehicleId: "",
    category: "maintenance",
    amount: "",
    description: "",
    date: new Date().toISOString().split("T")[0],
  });
  const [editingExpense, setEditingExpense] = useState<EditingExpense | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [savingExpenseId, setSavingExpenseId] = useState<string | null>(null);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [showDailyRevenue, setShowDailyRevenue] = useState(false);
  const [tickets, setTickets] = useState<Array<{ id: string; vehicle_id?: string; amount_due?: number; ticket_type?: string; municipality?: string; state?: string; violation_date?: string; created_at?: string }>>([]);
  const [activeTab, setActiveTab] = useState<"overview" | "expenses" | "revenue" | "profit" | "vehicles">("overview");

  // ─── Helper Functions ────────────────────────────────────────────
  // Format currency consistently
  const fmtCurrency = (val: number): string => {
    return `$${Math.round(val).toLocaleString()}`;
  };

  // Build month range for date-based aggregations
  const buildMonthRange = (fromDate: string, toDate: string) => {
    const months: Record<string, string> = {};
    const startD = new Date(fromDate + "T12:00:00");
    const endD = new Date(toDate + "T12:00:00");
    const cursor = new Date(startD.getFullYear(), startD.getMonth(), 1);
    while (cursor <= endD) {
      const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}`;
      months[key] = cursor.toLocaleDateString("en-US", { month: "short" });
      cursor.setMonth(cursor.getMonth() + 1);
    }
    return months;
  };

  // ─── Data Fetching ──────────────────────────────────────────────
  // Fetch ALL data once on mount. Date filtering is done client-side via useMemo.
  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [bookingsRes, expensesRes, vehiclesRes, maintenanceRes, ticketsRes] = await Promise.all([
        adminFetch("/api/admin/bookings"),
        adminFetch("/api/admin/expenses"),
        adminFetch("/api/admin/vehicles"),
        adminFetch("/api/admin/maintenance"),
        adminFetch("/api/admin/tickets"),
      ]);

      if (!bookingsRes.ok || !expensesRes.ok || !vehiclesRes.ok) {
        throw new Error("Failed to fetch data");
      }

      const bookingsData = await bookingsRes.json();
      const expensesData = await expensesRes.json();
      const vehiclesData = await vehiclesRes.json();
      const maintenanceData = maintenanceRes.ok ? await maintenanceRes.json() : { data: [] };
      if (!maintenanceRes.ok) logger.warn("Failed to fetch maintenance data");
      const ticketsData = ticketsRes.ok ? await ticketsRes.json() : { data: [] };
      if (!ticketsRes.ok) logger.warn("Failed to fetch tickets data");

      setBookings(Array.isArray(bookingsData?.data) ? bookingsData.data : []);
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
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Computed Data ──────────────────────────────────────────────
  // Filter bookings to selected date range (a booking is "in range" if its pickup or return overlaps)
  const filteredBookings = useMemo(
    () =>
      bookings.filter((b) => {
        // Booking overlaps range if pickup_date <= range.to AND return_date >= range.from
        return b.pickup_date <= dateRange.to && b.return_date >= dateRange.from;
      }),
    [bookings, dateRange]
  );

  const revenueBookings = useMemo(
    () => filteredBookings.filter((b) => ["confirmed", "active", "completed"].includes(b.status)),
    [filteredBookings]
  );

  // Maintenance costs (all completed maintenance records show as expenses, filtered by date range)
  const maintenanceCosts = useMemo((): UnifiedExpense[] => {
    return maintenance
      .filter((m) => m.status === "completed")
      .map((m) => ({
        id: m.id,
        vehicle_id: m.vehicleId,
        category: "maintenance" as const,
        amount: m.cost ?? 0,
        description: m.title,
        date: m.completedDate || m.scheduledDate || m.createdAt,
        created_at: m.createdAt,
        source: "maintenance" as const,
      }))
      .filter((m) => m.date >= dateRange.from && m.date <= dateRange.to);
  }, [maintenance, dateRange]);

  // Financing costs (monthly payments for financed vehicles, generated as individual expense entries)
  const financingCosts = useMemo((): UnifiedExpense[] => {
    const entries: UnifiedExpense[] = [];

    vehicles.forEach((vehicle) => {
      if (!vehicle.isFinanced || !vehicle.monthlyPayment || !vehicle.financingStartDate) return;

      const financing = calculateFinancing(vehicle);
      if (!financing || financing.paymentsProcessed === 0) return;

      const startDate = new Date(vehicle.financingStartDate);
      if (isNaN(startDate.getTime())) return; // skip if invalid date

      const paymentDay = Math.min(Math.max(vehicle.paymentDayOfMonth || 1, 1), 31);

      for (let i = 0; i < financing.paymentsProcessed; i++) {
        try {
          const payMonth = new Date(startDate.getFullYear(), startDate.getMonth() + i, 1);
          const daysInMonth = new Date(payMonth.getFullYear(), payMonth.getMonth() + 1, 0).getDate();
          const actualDay = Math.min(paymentDay, daysInMonth);
          const actualDate = new Date(payMonth.getFullYear(), payMonth.getMonth(), actualDay);
          if (isNaN(actualDate.getTime())) continue; // skip invalid dates
          const dateStr = actualDate.toISOString().split("T")[0];

          // Only include financing payments within the selected date range
          if (dateStr >= dateRange.from && dateStr <= dateRange.to) {
            entries.push({
              id: `financing-${vehicle.id}-${i}`,
              vehicle_id: vehicle.id,
              category: "financing",
              amount: financing.monthlyPayment,
              description: `Monthly payment — ${getVehicleDisplayName(vehicle)}`,
              date: dateStr,
              created_at: dateStr,
              source: "financing" as const,
            });
          }
        } catch {
          // Skip any date that fails
          continue;
        }
      }
    });

    return entries;
  }, [vehicles, dateRange]);

  // Ticket costs (traffic violations converted to expense entries, filtered by date range)
  const ticketCosts = useMemo((): UnifiedExpense[] => {
    return tickets
      .map((ticket) => ({
        id: ticket.id,
        vehicle_id: ticket.vehicle_id ?? null,
        category: "tickets" as const,
        amount: ticket.amount_due ?? 0,
        description: `${ticket.ticket_type || "Ticket"} — ${ticket.municipality || "Unknown"}, ${ticket.state || ""}`,
        date: ticket.violation_date || ticket.created_at || new Date().toISOString().split("T")[0],
        created_at: ticket.created_at || new Date().toISOString(),
        source: "ticket" as const,
      }))
      .filter((t) => t.date >= dateRange.from && t.date <= dateRange.to);
  }, [tickets, dateRange]);

  // Filter explicit expenses by date range
  const filteredExpenses = useMemo(
    (): UnifiedExpense[] => expenses
      .filter((e) => e.date >= dateRange.from && e.date <= dateRange.to)
      .map((e) => ({ ...e, description: e.description ?? null, source: "manual" as const })),
    [expenses, dateRange]
  );

  // All costs = explicit expenses + maintenance record costs + financing payments + tickets (all already date-filtered)
  const allExpenses = useMemo((): UnifiedExpense[] => {
    return [...filteredExpenses, ...maintenanceCosts, ...financingCosts, ...ticketCosts];
  }, [filteredExpenses, maintenanceCosts, financingCosts, ticketCosts]);

  const summaryData = useMemo(() => {
    const totalRevenue = revenueBookings.reduce((sum, b) => sum + (b.total_price ?? 0), 0);
    const totalExpenses = allExpenses.reduce((sum, e) => sum + (e.amount ?? 0), 0);
    const netProfit = totalRevenue - totalExpenses;
    const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

    const totalDaysInRange = Math.max(
      1,
      Math.ceil(
        (new Date(dateRange.to).getTime() - new Date(dateRange.from).getTime()) /
          (1000 * 60 * 60 * 24)
      )
    );

    let totalBookedDays = 0;
    revenueBookings.forEach((booking) => {
      const pickup = new Date(booking.pickup_date + "T00:00:00").getTime();
      const returnDate = new Date(booking.return_date + "T00:00:00").getTime();
      totalBookedDays += Math.max(1, Math.ceil((returnDate - pickup) / (1000 * 60 * 60 * 24)));
    });

    const occupancyRate =
      vehicles.length > 0
        ? Math.min(100, Math.max(0, (totalBookedDays / (totalDaysInRange * vehicles.length)) * 100))
        : 0;

    const avgBookingValue =
      revenueBookings.length > 0 ? totalRevenue / revenueBookings.length : 0;

    return {
      totalRevenue,
      totalExpenses,
      netProfit,
      profitMargin,
      occupancyRate,
      totalBookings: revenueBookings.length,
      avgBookingValue,
      totalBookedDays,
    };
  }, [revenueBookings, allExpenses, vehicles, dateRange]);

  // Cash flow data — monthly money in vs money out (based on selected date range)
  const cashFlowData = useMemo(() => {
    const monthLabels = buildMonthRange(dateRange.from, dateRange.to);
    const months: Record<string, { month: string; income: number; expenses: number }> = {};

    // Initialize months with labels from helper
    Object.entries(monthLabels).forEach(([key, label]) => {
      months[key] = { month: label, income: 0, expenses: 0 };
    });

    revenueBookings.forEach((b) => {
      const key = b.pickup_date.substring(0, 7); // "YYYY-MM"
      if (months[key]) months[key].income += b.total_price ?? 0;
    });

    allExpenses.forEach((e) => {
      const key = e.date.substring(0, 7);
      if (months[key]) months[key].expenses += e.amount ?? 0;
    });

    return Object.values(months).map((m) => ({
      ...m,
      income: Math.round(m.income),
      expenses: Math.round(m.expenses),
      net: Math.round(m.income - m.expenses),
    }));
  }, [revenueBookings, allExpenses, dateRange]);

  // Daily earnings (within selected date range, max 30 days shown)
  const dailyEarningsData = useMemo(() => {
    const startD = new Date(dateRange.from + "T12:00:00");
    const endD = new Date(dateRange.to + "T12:00:00");
    const rangeDays = Math.ceil((endD.getTime() - startD.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    // If range > 30 days, show only last 30 days of the range
    const showDays = Math.min(rangeDays, 30);
    const days: { label: string; date: string; revenue: number; expenses: number }[] = [];

    for (let i = showDays - 1; i >= 0; i--) {
      const d = new Date(endD);
      d.setDate(d.getDate() - i);
      days.push({
        date: d.toISOString().split("T")[0],
        label: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        revenue: 0,
        expenses: 0,
      });
    }

    // Build map for O(1) lookups instead of O(n) .find() per booking/expense
    const dayMap = new Map<string, number>();
    days.forEach((d, idx) => dayMap.set(d.date, idx));

    revenueBookings.forEach((b) => {
      const idx = dayMap.get(b.pickup_date);
      if (idx !== undefined) days[idx].revenue += b.total_price ?? 0;
    });

    allExpenses.forEach((e) => {
      const idx = dayMap.get(e.date);
      if (idx !== undefined) days[idx].expenses += e.amount ?? 0;
    });

    return days.map((d) => ({
      ...d,
      revenue: Math.round(d.revenue),
      expenses: Math.round(d.expenses),
    }));
  }, [revenueBookings, allExpenses, dateRange]);

  // Expense by category (includes maintenance + financing costs)
  const expenseCategoryData = useMemo(() => {
    const totals: Record<string, number> = {};
    allExpenses.forEach((e) => {
      totals[e.category] = (totals[e.category] || 0) + (e.amount ?? 0);
    });
    return Object.entries(totals)
      .map(([name, value]) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        key: name,
        value: Math.round(value),
      }))
      .sort((a, b) => b.value - a.value);
  }, [allExpenses]);

  // Vehicle profitability rankings
  const vehicleAnalytics = useMemo(() => {
    // Pre-group bookings and expenses by vehicle_id for O(n) instead of O(n²)
    const bookingsByVehicle = new Map<string, Booking[]>();
    const expensesByVehicle = new Map<string, typeof allExpenses>();

    revenueBookings.forEach((b) => {
      if (!bookingsByVehicle.has(b.vehicle_id)) bookingsByVehicle.set(b.vehicle_id, []);
      bookingsByVehicle.get(b.vehicle_id)!.push(b);
    });

    allExpenses.forEach((e) => {
      if (e.vehicle_id) {
        if (!expensesByVehicle.has(e.vehicle_id)) expensesByVehicle.set(e.vehicle_id, []);
        expensesByVehicle.get(e.vehicle_id)!.push(e);
      }
    });

    return vehicles
      .map((vehicle) => {
        const vBookings = bookingsByVehicle.get(vehicle.id) ?? [];
        const vExpenses = expensesByVehicle.get(vehicle.id) ?? [];
        const revenue = vBookings.reduce((s, b) => s + (b.total_price ?? 0), 0);
        const expenseTotal = vExpenses.reduce((s, e) => s + (e.amount ?? 0), 0);
        // For financed vehicles, costs are already in allExpenses as financing entries
        const vehicleCost = vehicle.isFinanced ? 0 : (vehicle.purchasePrice ?? 0);

        const totalDaysInRange = Math.max(
          1,
          Math.ceil(
            (new Date(dateRange.to + "T00:00:00").getTime() - new Date(dateRange.from + "T00:00:00").getTime()) /
              (1000 * 60 * 60 * 24)
          )
        );
        let bookedDays = 0;
        vBookings.forEach((b) => {
          bookedDays += Math.max(1, Math.ceil(
            (new Date(b.return_date + "T00:00:00").getTime() - new Date(b.pickup_date + "T00:00:00").getTime()) /
              (1000 * 60 * 60 * 24)
          ));
        });

        return {
          id: vehicle.id,
          name: getVehicleDisplayName(vehicle),
          bookings: vBookings.length,
          revenue,
          expenses: expenseTotal + vehicleCost,
          profit: revenue - expenseTotal - vehicleCost,
          occupancy: Math.min(100, (bookedDays / totalDaysInRange) * 100),
          bookedDays,
        };
      })
      .sort((a, b) => b.profit - a.profit);
  }, [vehicles, revenueBookings, allExpenses, dateRange]);

  // Revenue by month (based on selected date range)
  const revenueByMonth = useMemo(() => {
    const monthLabels = buildMonthRange(dateRange.from, dateRange.to);
    const months: Record<string, { month: string; date: string; revenue: number; bookings: number }> = {};

    Object.entries(monthLabels).forEach(([key, label]) => {
      months[key] = {
        month: label,
        date: key,
        revenue: 0,
        bookings: 0,
      };
    });

    revenueBookings.forEach((b) => {
      const key = b.pickup_date.substring(0, 7);
      if (months[key]) {
        months[key].revenue += b.total_price ?? 0;
        months[key].bookings += 1;
      }
    });

    return Object.values(months).map((m) => ({
      ...m,
      revenue: Math.round(m.revenue),
    }));
  }, [revenueBookings, dateRange]);

  // Monthly profit data (revenue, expenses, profit — based on selected date range)
  const monthlyProfitData = useMemo(() => {
    const monthLabels = buildMonthRange(dateRange.from, dateRange.to);
    const months: Record<string, { month: string; date: string; revenue: number; expenses: number }> = {};

    Object.entries(monthLabels).forEach(([key, label]) => {
      months[key] = {
        month: label,
        date: key,
        revenue: 0,
        expenses: 0,
      };
    });

    revenueBookings.forEach((b) => {
      const key = b.pickup_date.substring(0, 7);
      if (months[key]) months[key].revenue += b.total_price ?? 0;
    });

    allExpenses.forEach((e) => {
      const key = e.date.substring(0, 7);
      if (months[key]) months[key].expenses += e.amount ?? 0;
    });

    return Object.values(months).map((m) => ({
      ...m,
      revenue: Math.round(m.revenue),
      expenses: Math.round(m.expenses),
      profit: Math.round(m.revenue - m.expenses),
    }));
  }, [revenueBookings, allExpenses, dateRange]);

  // ─── Expense CRUD ───────────────────────────────────────────────
  const handleAddExpense = async () => {
    if (!newExpense.amount || !newExpense.date) {
      setError("Please fill in all required fields");
      return;
    }
    const parsedAmount = parseFloat(newExpense.amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError("Please enter a valid amount greater than zero");
      return;
    }
    try {
      setSavingExpenseId("new");
      const response = await adminFetch("/api/admin/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vehicleId: newExpense.vehicleId || null,
          category: newExpense.category,
          amount: parsedAmount,
          description: newExpense.description || null,
          date: newExpense.date,
        }),
      });
      if (!response.ok) throw new Error("Failed to create expense");
      setNewExpense({ vehicleId: "", category: "maintenance", amount: "", description: "", date: new Date().toISOString().split("T")[0] });
      setAddingExpense(false);
      fetchData();
      setSuccess("Expense added successfully");
    } catch (err) {
      logger.error("Error creating expense:", err);
      setError("Failed to create expense");
    } finally {
      setSavingExpenseId(null);
    }
  };

  const handleUpdateExpense = async () => {
    if (!editingExpense || !editingExpense.amount || !editingExpense.date) {
      setError("Please fill in all required fields");
      return;
    }
    const parsedAmount = parseFloat(editingExpense.amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError("Please enter a valid amount greater than zero");
      return;
    }
    try {
      setSavingExpenseId(editingExpense.id);
      const response = await adminFetch("/api/admin/expenses", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingExpense.id,
          vehicleId: editingExpense.vehicle_id || null,
          category: editingExpense.category,
          amount: parsedAmount,
          description: editingExpense.description || null,
          date: editingExpense.date,
        }),
      });
      if (!response.ok) throw new Error("Failed to update expense");
      setEditingExpense(null);
      fetchData();
      setSuccess("Expense updated successfully");
    } catch (err) {
      logger.error("Error updating expense:", err);
      setError("Failed to update expense");
    } finally {
      setSavingExpenseId(null);
    }
  };

  const handleDeleteExpense = async (id: string) => {
    try {
      setSavingExpenseId(id);
      const response = await adminFetch(`/api/admin/expenses?id=${id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Failed to delete expense");
      setDeleteConfirm(null);
      fetchData();
      setSuccess("Expense deleted");
    } catch (err) {
      logger.error("Error deleting expense:", err);
      setError("Failed to delete expense");
    } finally {
      setSavingExpenseId(null);
    }
  };

  // Build vehicle lookup map for O(1) access (used in multiple places)
  const vehicleMap = useMemo(() => {
    const map = new Map<string, Vehicle>();
    vehicles.forEach((v) => map.set(v.id, v));
    return map;
  }, [vehicles]);

  const handleExportExpensesCSV = () => {
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
    exportToCSV(exportData, `expenses-export-${new Date().toISOString().split("T")[0]}`);
  };

  // ─── Vehicle Detail View ────────────────────────────────────────
  const getVehicleDetail = (vehicleId: string) => {
    const vehicle = vehicles.find((v) => v.id === vehicleId);
    if (!vehicle) return null;
    const vBookings = revenueBookings.filter((b) => b.vehicle_id === vehicleId);
    const vExpenses = allExpenses.filter((e) => e.vehicle_id === vehicleId);
    const revenue = vBookings.reduce((s, b) => s + (b.total_price ?? 0), 0);
    const expenseTotal = vExpenses.reduce((s, e) => s + (e.amount ?? 0), 0);
    // For financed vehicles, costs are already in allExpenses as financing entries
    const effectiveCost = vehicle.isFinanced ? 0 : (vehicle.purchasePrice ?? 0);
    const financingInfo = vehicle.isFinanced ? calculateFinancing(vehicle) : null;
    const profit = revenue - expenseTotal - effectiveCost;
    const totalCost = expenseTotal + effectiveCost;
    const roi = totalCost > 0 ? ((profit / totalCost) * 100).toFixed(1) : "0.0";
    const totalDays = Math.max(1, Math.ceil((new Date(dateRange.to + "T00:00:00").getTime() - new Date(dateRange.from + "T00:00:00").getTime()) / (1000 * 60 * 60 * 24)));
    let bookedDays = 0;
    vBookings.forEach((b) => {
      bookedDays += Math.max(1, Math.ceil((new Date(b.return_date + "T00:00:00").getTime() - new Date(b.pickup_date + "T00:00:00").getTime()) / (1000 * 60 * 60 * 24)));
    });
    const occupancy = Math.min(100, (bookedDays / totalDays) * 100);
    return { vehicle, bookings: vBookings, expenses: vExpenses, revenue, expenseTotal, effectiveCost, financingInfo, profit, roi, occupancy, bookedDays };
  };

  const selectedVehicleDetail = selectedVehicleId ? getVehicleDetail(selectedVehicleId) : null;

  // All-time daily revenue breakdown
  const allTimeDailyRevenue = useMemo(() => {
    const dayMap: Record<string, { date: string; revenue: number; bookingCount: number; bookings: Booking[] }> = {};

    revenueBookings.forEach((b) => {
      const dateStr = b.pickup_date; // Use pickup_date for consistency with rest of dashboard
      if (!dayMap[dateStr]) {
        dayMap[dateStr] = { date: dateStr, revenue: 0, bookingCount: 0, bookings: [] };
      }
      dayMap[dateStr].revenue += b.total_price ?? 0;
      dayMap[dateStr].bookingCount += 1;
      dayMap[dateStr].bookings.push(b);
    });

    return Object.values(dayMap).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [revenueBookings]);

  // ─── Daily Revenue Detail View ────────────────────────────────
  if (showDailyRevenue) {
    const totalAllTime = allTimeDailyRevenue.reduce((s, d) => s + d.revenue, 0);
    const totalBookings = allTimeDailyRevenue.reduce((s, d) => s + d.bookingCount, 0);
    const avgPerDay = allTimeDailyRevenue.length > 0 ? totalAllTime / allTimeDailyRevenue.length : 0;
    const bestDay = allTimeDailyRevenue.length > 0
      ? allTimeDailyRevenue.reduce((best, d) => d.revenue > best.revenue ? d : best, allTimeDailyRevenue[0])
      : null;

    return (
      <PageContainer>
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <button onClick={() => setShowDailyRevenue(false)} aria-label="Back to finances overview" className="p-2 hover:bg-gray-100 rounded-lg">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Daily Revenue</h1>
              <p className="text-sm text-gray-500">Day-by-day revenue breakdown — all time</p>
            </div>
          </div>

          {/* Summary stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard label="Total Revenue" value={`$${totalAllTime.toLocaleString()}`} icon={<DollarSign className="h-4 w-4" />} accent="green" />
            <StatCard label="Total Bookings" value={`${totalBookings}`} icon={<Car className="h-4 w-4" />} accent="blue" />
            <StatCard label="Avg / Day" value={`$${Math.round(avgPerDay).toLocaleString()}`} icon={<BarChart3 className="h-4 w-4" />} accent="purple" />
            <StatCard label="Best Day" value={bestDay ? `$${bestDay.revenue.toLocaleString()}` : "$0"} subtext={bestDay ? formatDate(bestDay.date) : ""} icon={<TrendingUp className="h-4 w-4" />} accent="amber" />
          </div>

          {/* Chart */}
          <Card>
            <CardContent className="p-5">
              <SectionHeader title="Revenue Over Time" subtitle={`${allTimeDailyRevenue.length} days with revenue`} />
              <div className="h-52 sm:h-64 lg:h-72">
                <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                  <BarChart data={[...allTimeDailyRevenue].reverse().slice(-30)} margin={{ top: 10, right: 20, bottom: 5, left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 10 }}
                      tickFormatter={(d) => { if (!d) return ""; const parts = d.split("-").map(Number); if (parts.length < 3 || parts.some(isNaN)) return d; const [y, m, day] = parts; return new Date(y, m - 1, day).toLocaleDateString("en-US", { month: "short", day: "numeric" }); }}
                      interval={Math.max(0, Math.floor(Math.min(30, allTimeDailyRevenue.length) / 8))}
                    />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `$${v}`} />
                    <Tooltip
                      formatter={(value) => [`$${Number(value).toLocaleString()}`, "Revenue"]}
                      labelFormatter={(d) => { if (!d) return ""; const parts = d.split("-").map(Number); if (parts.length < 3 || parts.some(isNaN)) return d; const [y, m, day] = parts; return new Date(y, m - 1, day).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" }); }}
                      contentStyle={{ borderRadius: "8px", border: "1px solid #e5e7eb" }}
                    />
                    <Bar dataKey="revenue" fill="#7C3AED" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Day-by-day table */}
          <Card>
            <CardContent className="p-5">
              <SectionHeader title="All Revenue by Day" subtitle={`${allTimeDailyRevenue.length} days`} />
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-gray-500 text-xs uppercase tracking-wider">
                      <th scope="col" className="pb-3 font-medium">Date</th>
                      <th scope="col" className="pb-3 font-medium text-center">Bookings</th>
                      <th scope="col" className="pb-3 font-medium text-right">Revenue</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {allTimeDailyRevenue.map((day) => (
                      <tr key={day.date} className="hover:bg-gray-50 transition-colors">
                        <td className="py-3 font-medium text-gray-900">
                          {new Date(day.date + "T00:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })}
                        </td>
                        <td className="py-3 text-center">
                          <Badge variant="secondary" className="text-xs">{day.bookingCount}</Badge>
                        </td>
                        <td className="py-3 text-right font-bold text-green-600">${day.revenue.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-gray-200">
                      <td className="py-3 font-bold text-gray-900">Total</td>
                      <td className="py-3 text-center font-bold">{totalBookings}</td>
                      <td className="py-3 text-right font-bold text-green-600">${totalAllTime.toLocaleString()}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      </PageContainer>
    );
  }

  // ─── Vehicle Detail Render ──────────────────────────────────────
  if (selectedVehicleDetail) {
    const { vehicle, bookings: vBookings, expenses: vExpenses, revenue, expenseTotal, effectiveCost, financingInfo, profit, roi, occupancy, bookedDays } = selectedVehicleDetail;

    const catBreakdown: Record<string, number> = {};
    vExpenses.forEach((e) => {
      catBreakdown[e.category] = (catBreakdown[e.category] || 0) + (e.amount ?? 0);
    });

    return (
      <PageContainer>
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <button onClick={() => setSelectedVehicleId(null)} aria-label="Back to finances overview" className="p-2 hover:bg-gray-100 rounded-lg">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {vehicle.year} {vehicle.make} {vehicle.model}
              </h1>
              <p className="text-sm text-gray-500">Vehicle Financial Breakdown</p>
            </div>
          </div>

          {/* Financing header */}
          <div className="bg-gradient-to-br from-gray-900 to-purple-900 rounded-xl p-6 text-white">
            <div className={`grid grid-cols-1 sm:grid-cols-2 ${financingInfo ? "md:grid-cols-4" : "md:grid-cols-3"} gap-6`}>
              <div>
                <p className="text-gray-300 text-xs font-medium uppercase tracking-wider">
                  {vehicle.isFinanced ? "Vehicle Price" : "Purchase Price"}
                </p>
                <p className="text-2xl font-bold mt-1">${(vehicle.purchasePrice ?? 0).toLocaleString()}</p>
              </div>
              {financingInfo && (
                <>
                  <div>
                    <p className="text-gray-300 text-xs font-medium uppercase tracking-wider">Monthly Payment</p>
                    <p className="text-2xl font-bold mt-1">${financingInfo.monthlyPayment.toLocaleString()}/mo</p>
                    <p className="text-gray-400 text-xs mt-1">{financingInfo.paymentsProcessed} payments made</p>
                  </div>
                  <div>
                    <p className="text-gray-300 text-xs font-medium uppercase tracking-wider">Paid So Far</p>
                    <p className="text-2xl font-bold mt-1">${financingInfo.totalPaid.toLocaleString()}</p>
                    <p className="text-gray-400 text-xs mt-1">${financingInfo.remainingBalance.toLocaleString()} remaining</p>
                  </div>
                </>
              )}
              <div>
                <p className="text-gray-300 text-xs font-medium uppercase tracking-wider">ROI</p>
                <p className={`text-2xl font-bold mt-1 ${parseFloat(roi) >= 0 ? "text-green-400" : "text-red-400"}`}>
                  {roi}%
                </p>
              </div>
            </div>
          </div>

          {/* Vehicle stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <StatCard label="Revenue" value={`$${revenue.toLocaleString()}`} icon={<DollarSign className="h-4 w-4" />} accent="green" />
            <StatCard label="Expenses" value={`$${(expenseTotal + effectiveCost).toLocaleString()}`} icon={<Receipt className="h-4 w-4" />} accent="red" />
            <StatCard label="Profit" value={`$${profit.toLocaleString()}`} icon={<TrendingUp className="h-4 w-4" />} accent={profit >= 0 ? "green" : "red"} />
            <StatCard label="Occupancy" value={`${occupancy.toFixed(0)}%`} icon={<Target className="h-4 w-4" />} accent="blue" />
            <StatCard label="Booked Days" value={`${bookedDays}`} icon={<Calendar className="h-4 w-4" />} accent="purple" />
            <StatCard label="Bookings" value={`${vBookings.length}`} icon={<Car className="h-4 w-4" />} accent="amber" />
          </div>

          {/* Booking history */}
          <Card>
            <CardContent className="p-5">
              <SectionHeader title="Booking History" subtitle={`${vBookings.length} total bookings`} />
              {vBookings.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-6">No bookings found</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-gray-500">
                        <th scope="col" className="pb-2 font-medium">Booking ID</th>
                        <th scope="col" className="pb-2 font-medium">Pickup</th>
                        <th scope="col" className="pb-2 font-medium">Return</th>
                        <th scope="col" className="pb-2 font-medium text-right">Amount</th>
                        <th scope="col" className="pb-2 font-medium text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {vBookings
                        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                        .map((b) => (
                          <tr key={b.id} className="text-gray-700">
                            <td className="py-2.5 font-mono text-xs">{b.id.slice(0, 16)}...</td>
                            <td className="py-2.5">{formatDate(b.pickup_date)}</td>
                            <td className="py-2.5">{formatDate(b.return_date)}</td>
                            <td className="py-2.5 text-right font-semibold">${(b.total_price ?? 0).toLocaleString()}</td>
                            <td className="py-2.5 text-right">
                              <Badge variant="secondary" className="text-xs capitalize">{b.status}</Badge>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Expense breakdown */}
          <Card>
            <CardContent className="p-5">
              <SectionHeader title="Expense Breakdown" />
              {Object.keys(catBreakdown).length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-6">No expenses recorded</p>
              ) : (
                <div className="space-y-2">
                  {Object.entries(catBreakdown)
                    .sort(([, a], [, b]) => b - a)
                    .map(([cat, amount]) => {
                      const total = Object.values(catBreakdown).reduce((s, v) => s + v, 0);
                      const pct = total > 0 ? (amount / total) * 100 : 0;
                      return (
                        <div key={cat} className="flex items-center gap-3">
                          <div
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-white"
                            style={{ backgroundColor: CATEGORY_COLORS[cat] || "#6B7280" }}
                          >
                            {CATEGORY_ICONS[cat] || <MoreHorizontal className="h-4 w-4" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between text-sm mb-1">
                              <span className="font-medium capitalize">{cat}</span>
                              <span className="font-semibold">${amount.toLocaleString()}</span>
                            </div>
                            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all"
                                style={{
                                  width: `${pct}%`,
                                  backgroundColor: CATEGORY_COLORS[cat] || "#6B7280",
                                }}
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Vehicle expenses list */}
          <Card>
            <CardContent className="p-5">
              <SectionHeader title="Expense History" subtitle={`${vExpenses.length} records`} />
              {vExpenses.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-6">No expenses</p>
              ) : (
                <div className="space-y-2">
                  {vExpenses
                    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                    .map((exp) => (
                      <div key={exp.id} className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-white shrink-0"
                          style={{ backgroundColor: CATEGORY_COLORS[exp.category] || "#6B7280" }}
                        >
                          {CATEGORY_ICONS[exp.category] || <MoreHorizontal className="h-4 w-4" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium capitalize">{exp.category}</p>
                          {exp.description && <p className="text-xs text-gray-500 truncate">{exp.description}</p>}
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm font-semibold">${exp.amount.toLocaleString()}</p>
                          <p className="text-xs text-gray-500">{formatDate(exp.date)}</p>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </PageContainer>
    );
  }

  // ─── Loading & Error States ─────────────────────────────────────
  if (loading) {
    return (
      <PageContainer>
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <RefreshCw className="h-8 w-8 animate-spin text-purple-600" role="status" aria-label="Loading financial data" />
          <p className="text-gray-600 font-medium">Loading finances...</p>
        </div>
      </PageContainer>
    );
  }

  // ─── Main Dashboard ─────────────────────────────────────────────
  return (
    <>
      {/* Header */}
      <section className="bg-gradient-to-br from-gray-900 to-purple-900 py-6 sm:py-8 text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold">Finances</h1>
              <p className="text-purple-200 mt-1 hidden sm:block">Track revenue, expenses, and profitability</p>
            </div>
            <Button
              onClick={fetchData}
              variant="outline"
              size="sm"
              className="border-purple-400 text-purple-200 hover:bg-purple-800 hover:text-white hidden sm:inline-flex"
            >
              <RefreshCw className={`h-4 w-4 mr-1 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </div>
      </section>

      {/* Date range + tabs — below header for readability */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 -mt-4">
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4 sm:p-5 flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-end gap-3">
            <div className="flex flex-col gap-1.5">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Date Range</p>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-gray-400 shrink-0" />
                <input
                  type="date"
                  value={draftDateRange.from}
                  onChange={(e) => {
                    const newFrom = e.target.value;
                    setDraftDateRange((p) => {
                      const newTo = newFrom > p.to ? newFrom : p.to;
                      return { from: newFrom, to: newTo };
                    });
                  }}
                  aria-label="Start date"
                  className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 min-w-0"
                />
                <span className="text-gray-400 font-medium">—</span>
                <input
                  type="date"
                  value={draftDateRange.to}
                  onChange={(e) => {
                    const newTo = e.target.value;
                    setDraftDateRange((p) => {
                      const newFrom = newTo < p.from ? newTo : p.from;
                      return { from: newFrom, to: newTo };
                    });
                  }}
                  aria-label="End date"
                  className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 min-w-0"
                />
                {draftDirty && (
                  <button
                    onClick={() => setDateRange({ ...draftDateRange })}
                    className="ml-1 px-4 py-1.5 text-xs font-semibold bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition-colors shrink-0"
                  >
                    Apply
                  </button>
                )}
              </div>
              <button
                onClick={() => {
                  setDraftDateRange(defaultDateRange);
                  setDateRange(defaultDateRange);
                }}
                className="text-xs text-purple-600 hover:text-purple-800 font-medium transition-colors self-start"
              >
                Reset YTD
              </button>
            </div>
          </div>
          <div className="w-full sm:w-auto overflow-x-auto scrollbar-hide -mx-1 px-1">
            <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-max sm:w-auto" role="tablist">
              {(["overview", "expenses", "revenue", "profit", "vehicles"] as const).map((tab, idx) => (
                <button
                  key={tab}
                  role="tab"
                  aria-selected={activeTab === tab}
                  onClick={() => setActiveTab(tab)}
                  onKeyDown={(e) => {
                    const tabs = ["overview", "expenses", "revenue", "profit", "vehicles"] as const;
                    if (e.key === 'ArrowLeft' && idx > 0) {
                      e.preventDefault();
                      setActiveTab(tabs[idx - 1]);
                      const sibling = (e.currentTarget as HTMLElement).previousElementSibling as HTMLElement;
                      sibling?.focus();
                    } else if (e.key === 'ArrowRight' && idx < tabs.length - 1) {
                      e.preventDefault();
                      setActiveTab(tabs[idx + 1]);
                      const sibling = (e.currentTarget as HTMLElement).nextElementSibling as HTMLElement;
                      sibling?.focus();
                    }
                  }}
                  className={`px-4 py-2 sm:px-4 sm:py-1.5 text-sm rounded-md transition-colors capitalize whitespace-nowrap focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-1 ${
                    activeTab === tab
                      ? "bg-white text-gray-900 font-semibold shadow-sm"
                      : "text-gray-500 hover:text-gray-900 active:bg-gray-200"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <PageContainer>
        {success && (
          <div role="alert" className="mb-6 flex items-center gap-2 justify-between bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-sm text-green-700">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              {success}
            </div>
            <button
              onClick={() => setSuccess("")}
              className="text-green-700 hover:text-green-900 focus:outline-none focus:ring-1 focus:ring-green-500 rounded"
              aria-label="Dismiss success message"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
        {error && (
          <div role="alert" className="mb-6 flex items-center gap-2 justify-between bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
            <button
              onClick={() => setError("")}
              className="text-red-700 hover:text-red-900 focus:outline-none focus:ring-1 focus:ring-red-500 rounded"
              aria-label="Dismiss error message"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* OVERVIEW TAB                                               */}
        {/* ═══════════════════════════════════════════════════════════ */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3">
              <StatCard
                label="Total Revenue"
                value={fmtCurrency(summaryData.totalRevenue)}
                icon={<DollarSign className="h-4 w-4" />}
                accent="green"
                trend={summaryData.totalRevenue > 0 ? "up" : "neutral"}
                onClick={() => setActiveTab("revenue")}
              />
              <StatCard
                label="Total Expenses"
                value={fmtCurrency(summaryData.totalExpenses)}
                icon={<Receipt className="h-4 w-4" />}
                accent="red"
                onClick={() => setActiveTab("expenses")}
              />
              <StatCard
                label="Net Profit"
                value={fmtCurrency(summaryData.netProfit)}
                icon={summaryData.netProfit >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                accent={summaryData.netProfit >= 0 ? "purple" : "red"}
                trend={summaryData.netProfit > 0 ? "up" : summaryData.netProfit < 0 ? "down" : "neutral"}
                subtext={`${summaryData.profitMargin.toFixed(1)}% margin`}
                onClick={() => setActiveTab("profit")}
              />
              <StatCard
                label="Fleet Occupancy"
                value={`${summaryData.occupancyRate.toFixed(0)}%`}
                icon={<Target className="h-4 w-4" />}
                accent="blue"
                subtext={`${vehicles.length} vehicles`}
                onClick={() => setActiveTab("vehicles")}
              />
              <StatCard
                label="Bookings"
                value={`${summaryData.totalBookings}`}
                icon={<Car className="h-4 w-4" />}
                accent="amber"
                subtext={`${summaryData.totalBookedDays} days booked`}
                onClick={() => setActiveTab("vehicles")}
              />
              <StatCard
                label="Avg. Booking"
                value={fmtCurrency(summaryData.avgBookingValue)}
                icon={<BarChart3 className="h-4 w-4" />}
                accent="gray"
                onClick={() => setActiveTab("vehicles")}
              />
            </div>

            {/* Cash Flow Chart */}
            <Card className="cursor-pointer hover:shadow-lg hover:border-purple-200 transition-all admin-card-press rounded-2xl" onClick={() => setActiveTab("expenses")}>
              <CardContent className="p-4 sm:p-5">
                <SectionHeader
                  title="Cash Flow"
                  subtitle="Monthly income vs. expenses — click for details"
                />
                {cashFlowData.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                    <BarChart3 className="h-8 w-8 mb-2" />
                    <p className="text-sm">No data for the selected date range</p>
                  </div>
                ) : (
                <div className="h-52 sm:h-64 lg:h-72">
                  <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                    <ComposedChart data={cashFlowData} margin={{ top: 10, right: 10, bottom: 5, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `$${v}`} />
                      <Tooltip
                        formatter={(value, name) => [`$${Number(value).toLocaleString()}`, name === "income" ? "Income" : name === "expenses" ? "Expenses" : "Net"]}
                        contentStyle={{ borderRadius: "8px", border: "1px solid #e5e7eb" }}
                      />
                      <Legend verticalAlign="top" height={36} formatter={(value) => String(value).charAt(0).toUpperCase() + String(value).slice(1)} />
                      <Bar dataKey="income" fill="#10B981" radius={[4, 4, 0, 0]} name="Income" />
                      <Bar dataKey="expenses" fill="#EF4444" radius={[4, 4, 0, 0]} name="Expenses" />
                      <Line type="monotone" dataKey="net" stroke="#7C3AED" strokeWidth={2} dot={{ r: 4 }} name="Net" />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
                )}
              </CardContent>
            </Card>

            {/* Daily Revenue + Expense Breakdown side by side */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Daily revenue */}
              <Card className="cursor-pointer hover:shadow-lg hover:border-purple-200 transition-all admin-card-press rounded-2xl" onClick={() => setShowDailyRevenue(true)}>
                <CardContent className="p-4 sm:p-5">
                  <SectionHeader title="Daily Revenue" subtitle={`Last ${Math.min(30, dailyEarningsData.length)} days — click for full breakdown`} />
                  {dailyEarningsData.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                      <DollarSign className="h-8 w-8 mb-2" />
                      <p className="text-sm">No revenue data for the selected date range</p>
                    </div>
                  ) : (
                  <div className="h-40 sm:h-52 lg:h-64">
                    <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                      <AreaChart data={dailyEarningsData} margin={{ top: 10, right: 10, bottom: 5, left: 0 }}>
                        <defs>
                          <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id="expenseGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#EF4444" stopOpacity={0.2} />
                            <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="label" tick={{ fontSize: 10 }} interval={2} />
                        <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `$${v}`} />
                        <Tooltip
                          formatter={(value, name) => [
                            `$${Number(value).toLocaleString()}`,
                            name === "revenue" ? "Revenue" : "Expenses",
                          ]}
                          contentStyle={{ borderRadius: "8px", border: "1px solid #e5e7eb" }}
                        />
                        <Area type="monotone" dataKey="expenses" stroke="#EF4444" fill="url(#expenseGradient)" strokeWidth={1.5} />
                        <Area type="monotone" dataKey="revenue" stroke="#10B981" fill="url(#revenueGradient)" strokeWidth={2} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                  )}
                </CardContent>
              </Card>

              {/* Expense categories */}
              <Card className="cursor-pointer hover:shadow-lg hover:border-purple-200 transition-all admin-card-press rounded-2xl" onClick={() => setActiveTab("expenses")}>
                <CardContent className="p-4 sm:p-5">
                  <SectionHeader
                    title="Expense Categories"
                    subtitle={`${fmtCurrency(summaryData.totalExpenses)} total — tap for details`}
                  />
                  {expenseCategoryData.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 text-gray-400">
                      <Receipt className="h-8 w-8 mb-2" />
                      <p className="text-sm">No expenses recorded</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="h-56 sm:h-64">
                        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                          <PieChart>
                            <Pie
                              data={expenseCategoryData}
                              dataKey="value"
                              nameKey="name"
                              cx="50%"
                              cy="50%"
                              innerRadius={50}
                              outerRadius={85}
                              paddingAngle={3}
                              strokeWidth={2}
                              stroke="#fff"
                            >
                              {expenseCategoryData.map((entry) => (
                                <Cell key={entry.key} fill={CATEGORY_COLORS[entry.key] || "#6B7280"} />
                              ))}
                            </Pie>
                            <Tooltip
                              formatter={(value) => [fmtCurrency(Number(value)), "Amount"]}
                              contentStyle={{ borderRadius: "8px", border: "1px solid #e5e7eb", fontSize: "13px" }}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="space-y-2">
                        {expenseCategoryData.map((cat) => {
                          const pct = summaryData.totalExpenses > 0
                            ? ((cat.value / summaryData.totalExpenses) * 100).toFixed(1)
                            : "0";
                          return (
                            <div key={cat.key} className="flex items-center gap-2.5 text-sm">
                              <div
                                className="w-7 h-7 rounded-md flex items-center justify-center text-white shrink-0"
                                style={{ backgroundColor: CATEGORY_COLORS[cat.key] || "#6B7280" }}
                              >
                                {CATEGORY_ICONS[cat.key] || <MoreHorizontal className="h-3 w-3" />}
                              </div>
                              <span className="flex-1 truncate font-medium">{cat.name}</span>
                              <span className="text-gray-500 text-xs">{pct}%</span>
                              <span className="font-semibold tabular-nums">{fmtCurrency(cat.value)}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Vehicle Profitability Rankings */}
            <Card>
              <CardContent className="p-4 sm:p-5">
                <SectionHeader
                  title="Vehicle Profitability"
                  subtitle="Ranked by profit — tap to view details"
                />
                {vehicleAnalytics.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-8">No vehicles found</p>
                ) : (
                  <>
                    {/* Mobile: Card-based view */}
                    <div className="space-y-2.5 sm:hidden">
                      {vehicleAnalytics.map((v, idx) => (
                        <div
                          key={v.id}
                          onClick={() => setSelectedVehicleId(v.id)}
                          className="bg-gray-50 rounded-xl p-3.5 cursor-pointer active:bg-purple-50 transition-colors admin-card-press"
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setSelectedVehicleId(v.id); } }}
                          aria-label={`View details for ${v.name}`}
                        >
                          <div className="flex items-center justify-between mb-2.5">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className={`text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${idx === 0 ? "bg-yellow-100 text-yellow-700" : idx === 1 ? "bg-gray-200 text-gray-600" : idx === 2 ? "bg-orange-100 text-orange-700" : "bg-gray-100 text-gray-400"}`}>
                                {idx + 1}
                              </span>
                              <p className="font-semibold text-gray-900 text-sm truncate">{v.name}</p>
                            </div>
                            <span className="text-xs text-gray-500 shrink-0">{v.bookings} bookings</span>
                          </div>
                          <div className="grid grid-cols-3 gap-2 text-center">
                            <div className="bg-white rounded-lg py-1.5">
                              <p className="text-sm font-bold text-green-600">${v.revenue.toLocaleString()}</p>
                              <p className="text-[10px] text-gray-400">Revenue</p>
                            </div>
                            <div className="bg-white rounded-lg py-1.5">
                              <p className="text-sm font-bold text-red-500">${v.expenses.toLocaleString()}</p>
                              <p className="text-[10px] text-gray-400">Expenses</p>
                            </div>
                            <div className="bg-white rounded-lg py-1.5">
                              <p className={`text-sm font-bold ${v.profit >= 0 ? "text-purple-600" : "text-red-600"}`}>${v.profit.toLocaleString()}</p>
                              <p className="text-[10px] text-gray-400">Profit</p>
                            </div>
                          </div>
                          <div className="mt-2.5">
                            <div className="flex justify-between text-[10px] text-gray-500 mb-1">
                              <span>Occupancy</span>
                              <span className="font-medium">{v.occupancy.toFixed(0)}%</span>
                            </div>
                            <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${v.occupancy >= 60 ? "bg-green-500" : v.occupancy >= 30 ? "bg-amber-500" : "bg-red-400"}`}
                                style={{ width: `${v.occupancy}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                      {/* Fleet total card */}
                      <div className="bg-purple-50 border border-purple-100 rounded-xl p-3.5">
                        <p className="text-xs font-semibold text-purple-700 mb-2">Fleet Total</p>
                        <div className="grid grid-cols-3 gap-2 text-center">
                          <div>
                            <p className="text-sm font-bold text-green-600">{fmtCurrency(vehicleAnalytics.reduce((s, v) => s + v.revenue, 0))}</p>
                            <p className="text-[10px] text-gray-500">Revenue</p>
                          </div>
                          <div>
                            <p className="text-sm font-bold text-red-500">{fmtCurrency(vehicleAnalytics.reduce((s, v) => s + v.expenses, 0))}</p>
                            <p className="text-[10px] text-gray-500">Expenses</p>
                          </div>
                          <div>
                            <p className={`text-sm font-bold ${vehicleAnalytics.reduce((s, v) => s + v.profit, 0) >= 0 ? "text-purple-600" : "text-red-600"}`}>{fmtCurrency(vehicleAnalytics.reduce((s, v) => s + v.profit, 0))}</p>
                            <p className="text-[10px] text-gray-500">Profit</p>
                          </div>
                        </div>
                      </div>
                    </div>
                    {/* Desktop: Table view */}
                    <div className="hidden sm:block overflow-x-auto mt-1">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b-2 border-gray-200 text-left text-gray-500 text-xs uppercase tracking-wider">
                            <th scope="col" className="pb-3 pl-3 font-semibold w-10">#</th>
                            <th scope="col" className="pb-3 font-semibold">Vehicle</th>
                            <th scope="col" className="pb-3 font-semibold text-center">Bookings</th>
                            <th scope="col" className="pb-3 font-semibold text-right">Revenue</th>
                            <th scope="col" className="pb-3 font-semibold text-right">Expenses</th>
                            <th scope="col" className="pb-3 font-semibold text-right">Profit</th>
                            <th scope="col" className="pb-3 pr-3 font-semibold text-right w-44">Occupancy</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {vehicleAnalytics.map((v, idx) => (
                            <tr
                              key={v.id}
                              onClick={() => setSelectedVehicleId(v.id)}
                              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setSelectedVehicleId(v.id); } }}
                              tabIndex={0}
                              role="button"
                              aria-label={`View details for ${v.name}`}
                              className="cursor-pointer hover:bg-purple-50 transition-colors focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-inset group"
                            >
                              <td className="py-3.5 pl-3">
                                <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold ${
                                  idx === 0 ? "bg-yellow-100 text-yellow-700" :
                                  idx === 1 ? "bg-gray-200 text-gray-600" :
                                  idx === 2 ? "bg-orange-100 text-orange-700" :
                                  "bg-gray-100 text-gray-400"
                                }`}>{idx + 1}</span>
                              </td>
                              <td className="py-3.5 font-semibold text-gray-900 group-hover:text-purple-700 transition-colors">{v.name}</td>
                              <td className="py-3.5 text-center text-gray-600">{v.bookings}</td>
                              <td className="py-3.5 text-right text-green-600 font-semibold">${v.revenue.toLocaleString()}</td>
                              <td className="py-3.5 text-right text-red-500 font-medium">${v.expenses.toLocaleString()}</td>
                              <td className={`py-3.5 text-right font-bold ${v.profit >= 0 ? "text-green-600" : "text-red-600"}`}>
                                ${v.profit.toLocaleString()}
                              </td>
                              <td className="py-3.5 pr-3 text-right">
                                <div className="flex items-center justify-end gap-2.5">
                                  <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                                    <div
                                      className={`h-full rounded-full transition-all ${
                                        v.occupancy >= 60 ? "bg-green-500" :
                                        v.occupancy >= 30 ? "bg-amber-500" :
                                        v.occupancy > 0 ? "bg-red-400" : "bg-gray-200"
                                      }`}
                                      style={{ width: `${v.occupancy}%` }}
                                    />
                                  </div>
                                  <span className="text-xs font-medium text-gray-500 w-10 text-right">{v.occupancy.toFixed(0)}%</span>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="border-t-2 border-purple-200 bg-purple-50 font-bold">
                            <td className="py-3.5 pl-3">
                              <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-purple-100 text-purple-600 text-xs font-bold">∑</span>
                            </td>
                            <td className="py-3.5 text-purple-900 font-bold">Fleet Total</td>
                            <td className="py-3.5 text-center text-purple-700">{vehicleAnalytics.reduce((s, v) => s + v.bookings, 0)}</td>
                            <td className="py-3.5 text-right text-green-600 font-bold">{fmtCurrency(vehicleAnalytics.reduce((s, v) => s + v.revenue, 0))}</td>
                            <td className="py-3.5 text-right text-red-500 font-bold">{fmtCurrency(vehicleAnalytics.reduce((s, v) => s + v.expenses, 0))}</td>
                            <td className={`py-3.5 text-right font-bold ${vehicleAnalytics.reduce((s, v) => s + v.profit, 0) >= 0 ? "text-green-600" : "text-red-600"}`}>
                              {fmtCurrency(vehicleAnalytics.reduce((s, v) => s + v.profit, 0))}
                            </td>
                            <td className="py-3.5 pr-3 text-right text-xs font-semibold text-purple-600">
                              {vehicleAnalytics.length > 0 ? (vehicleAnalytics.reduce((s, v) => s + v.occupancy, 0) / vehicleAnalytics.length).toFixed(0) : 0}% avg
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* EXPENSES TAB                                               */}
        {/* ═══════════════════════════════════════════════════════════ */}
        {activeTab === "expenses" && (
          <div className="space-y-6">
            {/* Category Totals */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-3">
              {expenseCategoryData.map((cat) => (
                <div
                  key={cat.key}
                  className="bg-white rounded-2xl border border-gray-100 p-3 sm:p-4 hover:shadow-md transition-all admin-card-press"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-white"
                      style={{ backgroundColor: CATEGORY_COLORS[cat.key] || "#6B7280" }}
                    >
                      {CATEGORY_ICONS[cat.key] || <MoreHorizontal className="h-4 w-4" />}
                    </div>
                    <span className="text-sm font-medium text-gray-600 capitalize">{cat.name}</span>
                  </div>
                  <p className="text-xl font-bold text-gray-900">{fmtCurrency(cat.value)}</p>
                  {cat.key === "financing" && (
                    <p className="text-xs text-gray-500 mt-0.5">
                      ${Math.round(cat.value / Math.max(1, new Set(financingCosts.map((f) => f.vehicle_id)).size)).toLocaleString()}/vehicle avg
                    </p>
                  )}
                  {cat.key === "maintenance" && (
                    <p className="text-xs text-gray-500 mt-0.5">
                      {maintenanceCosts.length} completed records
                    </p>
                  )}
                </div>
              ))}
              <div className="bg-gradient-to-br from-gray-900 to-purple-900 rounded-xl p-4 text-white">
                <p className="text-xs font-medium text-gray-300 uppercase tracking-wider mb-2">Total Expenses</p>
                <p className="text-xl font-bold">{fmtCurrency(allExpenses.reduce((s, e) => s + (e.amount ?? 0), 0))}</p>
                <p className="text-xs text-gray-400 mt-0.5">{allExpenses.length} total entries</p>
              </div>
            </div>

            {/* Add Expense */}
            <Card>
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <SectionHeader title="Expenses" subtitle={`${expenses.length} manual + ${maintenanceCosts.length} maintenance + ${financingCosts.length} financing`} />
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={handleExportExpensesCSV}>
                      <Download className="h-4 w-4 mr-1" /> Export CSV
                    </Button>
                    <Button
                      onClick={() => setAddingExpense(!addingExpense)}
                      size="sm"
                      className={addingExpense ? "bg-gray-600" : ""}
                    >
                      {addingExpense ? <X className="h-4 w-4 mr-1" /> : <Plus className="h-4 w-4 mr-1" />}
                      {addingExpense ? "Cancel" : "Add Expense"}
                    </Button>
                  </div>
                </div>

                {addingExpense && (
                  <div className="bg-gray-50 rounded-lg p-4 mb-4 space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      <div>
                        <label className="text-xs font-medium text-gray-600 block mb-1">Category <span className="text-red-500">*</span></label>
                        <Select
                          value={newExpense.category}
                          onChange={(e) => setNewExpense((p) => ({ ...p, category: e.target.value }))}
                        >
                          {CATEGORIES.map((c) => (
                            <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                          ))}
                        </Select>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-600 block mb-1">Amount <span className="text-red-500">*</span></label>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          value={newExpense.amount}
                          onChange={(e) => setNewExpense((p) => ({ ...p, amount: e.target.value }))}
                          className="focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-600 block mb-1">Date <span className="text-red-500">*</span></label>
                        <Input
                          type="date"
                          value={newExpense.date}
                          onChange={(e) => setNewExpense((p) => ({ ...p, date: e.target.value }))}
                          className="focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-600 block mb-1">Vehicle (optional)</label>
                        <Select
                          value={newExpense.vehicleId}
                          onChange={(e) => setNewExpense((p) => ({ ...p, vehicleId: e.target.value }))}
                        >
                          <option value="">General (no vehicle)</option>
                          {vehicles.map((v) => (
                            <option key={v.id} value={v.id}>{v.year} {v.make} {v.model}</option>
                          ))}
                        </Select>
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-600 block mb-1">Description (optional)</label>
                      <Input
                        placeholder="e.g. Oil change, monthly premium..."
                        value={newExpense.description}
                        onChange={(e) => setNewExpense((p) => ({ ...p, description: e.target.value }))}
                        className="focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      />
                    </div>
                    <Button onClick={handleAddExpense} disabled={savingExpenseId === "new"} className="w-full sm:w-auto">
                      {savingExpenseId === "new" ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Plus className="h-4 w-4 mr-1" />} Save Expense
                    </Button>
                  </div>
                )}

                {/* Financing Payments (auto-generated from financed vehicles) */}
                {financingCosts.length > 0 && (
                  <div className="mb-4">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Financing Payments</p>
                    <div className="space-y-2">
                      {financingCosts
                        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                        .slice(0, 12) // Show last 12 payments max
                        .map((fc) => {
                          const vehicle = fc.vehicle_id ? vehicleMap.get(fc.vehicle_id) : undefined;
                          return (
                            <div
                              key={fc.id}
                              className="flex items-center gap-3 p-3 rounded-lg bg-purple-50 border border-purple-100 cursor-pointer hover:bg-purple-100 transition-colors"
                              onClick={() => fc.vehicle_id && setSelectedVehicleId(fc.vehicle_id)}
                            >
                              <div className="w-9 h-9 rounded-lg flex items-center justify-center text-white shrink-0 bg-purple-600">
                                <Wallet className="h-4 w-4" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <p className="text-sm font-medium">{fc.description}</p>
                                  {vehicle && (
                                    <Badge variant="secondary" className="text-xs">
                                      {vehicle.year} {vehicle.make} {vehicle.model}
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-xs text-purple-600">Monthly financing payment</p>
                              </div>
                              <div className="text-right shrink-0">
                                <p className="text-sm font-semibold">${fc.amount.toLocaleString()}</p>
                                <p className="text-xs text-gray-500">{formatDate(fc.date)}</p>
                              </div>
                            </div>
                          );
                        })}
                      {financingCosts.length > 12 && (
                        <p className="text-xs text-gray-500 text-center py-1">
                          + {financingCosts.length - 12} more payments
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Maintenance Costs (auto-synced from maintenance module) */}
                {maintenanceCosts.length > 0 && (
                  <div className="mb-4">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">From Maintenance Records</p>
                    <div className="space-y-2">
                      {maintenanceCosts
                        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                        .map((mc) => {
                          const vehicle = mc.vehicle_id ? vehicleMap.get(mc.vehicle_id) : undefined;
                          return (
                            <div key={mc.id} className="flex items-center gap-3 p-3 rounded-lg bg-amber-50 border border-amber-100">
                              <div className="w-9 h-9 rounded-lg flex items-center justify-center text-white shrink-0 bg-amber-500">
                                <Wrench className="h-4 w-4" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <p className="text-sm font-medium">{mc.description}</p>
                                  {vehicle && (
                                    <Badge variant="secondary" className="text-xs">
                                      {vehicle.year} {vehicle.make} {vehicle.model}
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-xs text-amber-600">Auto-synced from Maintenance</p>
                              </div>
                              <div className="text-right shrink-0">
                                <p className="text-sm font-semibold">${mc.amount.toLocaleString()}</p>
                                <p className="text-xs text-gray-500">{formatDate(mc.date)}</p>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                )}

                {/* Tickets (traffic violations) */}
                {ticketCosts.length > 0 && (
                  <div className="mb-4">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Traffic Tickets</p>
                    <div className="space-y-2">
                      {ticketCosts
                        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                        .map((ticket) => {
                          const vehicle = ticket.vehicle_id ? vehicleMap.get(ticket.vehicle_id) : undefined;
                          return (
                            <div
                              key={ticket.id}
                              className="flex items-center gap-3 p-3 rounded-lg bg-orange-50 border border-orange-100"
                            >
                              <div className="w-9 h-9 rounded-lg flex items-center justify-center text-white shrink-0 bg-orange-500">
                                <Receipt className="h-4 w-4" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <p className="text-sm font-medium">{ticket.description}</p>
                                  {vehicle && (
                                    <Badge variant="secondary" className="text-xs">
                                      {vehicle.year} {vehicle.make} {vehicle.model}
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-xs text-orange-600">Traffic violation</p>
                              </div>
                              <div className="text-right shrink-0">
                                <p className="text-sm font-semibold">${ticket.amount.toLocaleString()}</p>
                                <p className="text-xs text-gray-500">{formatDate(ticket.date)}</p>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                )}

                {/* Manual Expenses List */}
                {filteredExpenses.length > 0 && (
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Manual Expenses</p>
                )}
                {filteredExpenses.length === 0 && maintenanceCosts.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-gray-400">
                    <Receipt className="h-8 w-8 mb-2" />
                    <p className="text-sm">No expenses recorded in this date range</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredExpenses
                      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                      .map((exp) => {
                        const vehicle = exp.vehicle_id ? vehicleMap.get(exp.vehicle_id) : undefined;
                        const isEditing = editingExpense?.id === exp.id;
                        const isDeleting = deleteConfirm === exp.id;

                        if (isEditing && editingExpense) {
                          return (
                            <div key={exp.id} className="bg-purple-50 border border-purple-200 rounded-lg p-4 space-y-3">
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                                <div>
                                  <label className="text-xs font-medium text-gray-600 block mb-1">Category <span className="text-red-500">*</span></label>
                                  <Select
                                    value={editingExpense.category}
                                    onChange={(e) => setEditingExpense((p) => p ? { ...p, category: e.target.value } : p)}
                                  >
                                    {CATEGORIES.map((c) => (
                                      <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                                    ))}
                                  </Select>
                                </div>
                                <div>
                                  <label className="text-xs font-medium text-gray-600 block mb-1">Amount <span className="text-red-500">*</span></label>
                                  <Input
                                    type="number"
                                    step="0.01"
                                    value={editingExpense.amount}
                                    onChange={(e) => setEditingExpense((p) => p ? { ...p, amount: e.target.value } : p)}
                                    className="focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                  />
                                </div>
                                <div>
                                  <label className="text-xs font-medium text-gray-600 block mb-1">Date <span className="text-red-500">*</span></label>
                                  <Input
                                    type="date"
                                    value={editingExpense.date}
                                    onChange={(e) => setEditingExpense((p) => p ? { ...p, date: e.target.value } : p)}
                                    className="focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                  />
                                </div>
                                <div>
                                  <label className="text-xs font-medium text-gray-600 block mb-1">Vehicle</label>
                                  <Select
                                    value={editingExpense.vehicle_id || ""}
                                    onChange={(e) => setEditingExpense((p) => p ? { ...p, vehicle_id: e.target.value || null } : p)}
                                  >
                                    <option value="">General</option>
                                    {vehicles.map((v) => (
                                      <option key={v.id} value={v.id}>{v.year} {v.make} {v.model}</option>
                                    ))}
                                  </Select>
                                </div>
                              </div>
                              <Input
                                placeholder="Description"
                                value={editingExpense.description}
                                onChange={(e) => setEditingExpense((p) => p ? { ...p, description: e.target.value } : p)}
                                className="focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                              />
                              <div className="flex gap-2">
                                <Button onClick={handleUpdateExpense} size="sm" disabled={savingExpenseId === editingExpense?.id}>
                                  {savingExpenseId === editingExpense?.id ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}Save
                                </Button>
                                <Button onClick={() => setEditingExpense(null)} variant="outline" size="sm">Cancel</Button>
                              </div>
                            </div>
                          );
                        }

                        return (
                          <div key={exp.id} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors group admin-card-press">
                            <div
                              className="w-9 h-9 rounded-lg flex items-center justify-center text-white shrink-0"
                              style={{ backgroundColor: CATEGORY_COLORS[exp.category] || "#6B7280" }}
                            >
                              {CATEGORY_ICONS[exp.category] || <MoreHorizontal className="h-4 w-4" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="text-sm font-medium capitalize">{exp.category}</p>
                                {vehicle && (
                                  <Badge variant="secondary" className="text-[10px] sm:text-xs truncate max-w-[120px] sm:max-w-none">
                                    {vehicle.year} {vehicle.make} {vehicle.model}
                                  </Badge>
                                )}
                              </div>
                              {exp.description && <p className="text-xs text-gray-500 truncate">{exp.description}</p>}
                            </div>
                            <div className="text-right shrink-0">
                              <p className="text-sm font-semibold">${exp.amount.toLocaleString()}</p>
                              <p className="text-xs text-gray-500">{formatDate(exp.date)}</p>
                            </div>
                            <div className="flex gap-1 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity shrink-0">
                              <button
                                onClick={() =>
                                  setEditingExpense({
                                    id: exp.id,
                                    category: exp.category,
                                    amount: String(exp.amount),
                                    description: exp.description || "",
                                    date: exp.date,
                                    vehicle_id: exp.vehicle_id,
                                  })
                                }
                                aria-label="Edit expense"
                                className="p-1.5 rounded-md hover:bg-blue-100 text-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </button>
                              {isDeleting ? (
                                <div className="flex gap-1">
                                  <button
                                    onClick={() => handleDeleteExpense(exp.id)}
                                    disabled={savingExpenseId === exp.id}
                                    className="px-2 py-1 text-xs bg-red-500 text-white rounded-md hover:bg-red-600 disabled:opacity-50 flex items-center gap-1 focus:outline-none focus:ring-2 focus:ring-red-500"
                                    aria-label="Confirm delete"
                                  >
                                    {savingExpenseId === exp.id ? <Loader2 className="h-3 w-3 animate-spin" /> : null}Confirm
                                  </button>
                                  <button
                                    onClick={() => setDeleteConfirm(null)}
                                    disabled={savingExpenseId === exp.id}
                                    className="px-2 py-1 text-xs bg-gray-200 rounded-md hover:bg-gray-300 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-gray-400"
                                    aria-label="Cancel delete"
                                  >
                                    No
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => setDeleteConfirm(exp.id)}
                                  aria-label="Delete expense"
                                  className="p-1.5 rounded-md hover:bg-red-100 text-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* REVENUE TAB                                                */}
        {/* ═══════════════════════════════════════════════════════════ */}
        {activeTab === "revenue" && (
          <div className="space-y-6">
            {/* Summary Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              <StatCard
                label="Total Revenue"
                value={fmtCurrency(summaryData.totalRevenue)}
                icon={<DollarSign className="h-4 w-4" />}
                accent="green"
              />
              <StatCard
                label="Total Bookings"
                value={`${summaryData.totalBookings}`}
                icon={<Car className="h-4 w-4" />}
                accent="blue"
              />
              <StatCard
                label="Avg per Booking"
                value={fmtCurrency(summaryData.avgBookingValue)}
                icon={<BarChart3 className="h-4 w-4" />}
                accent="purple"
              />
              <StatCard
                label="Best Month"
                value={fmtCurrency(Math.max(0, ...revenueByMonth.map((m) => m.revenue)))}
                icon={<TrendingUp className="h-4 w-4" />}
                accent="amber"
              />
            </div>

            {/* Revenue by Month Chart */}
            <Card className="rounded-2xl">
              <CardContent className="p-4 sm:p-5">
                <SectionHeader
                  title="Revenue by Month"
                  subtitle={`${revenueByMonth.length} months of booking revenue`}
                />
                {revenueByMonth.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                    <BarChart3 className="h-8 w-8 mb-2" />
                    <p className="text-sm">No revenue data for the selected date range</p>
                  </div>
                ) : (
                  <div className="h-56 sm:h-72 lg:h-80">
                    <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                      <BarChart data={revenueByMonth} margin={{ top: 10, right: 10, bottom: 5, left: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                        <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `$${v}`} />
                        <Tooltip
                          formatter={(value) => [`$${Number(value).toLocaleString()}`, "Revenue"]}
                          contentStyle={{ borderRadius: "8px", border: "1px solid #e5e7eb" }}
                        />
                        <Bar dataKey="revenue" fill="#10B981" radius={[8, 8, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Detailed Bookings List */}
            <Card className="rounded-2xl">
              <CardContent className="p-4 sm:p-5">
                <SectionHeader
                  title="Bookings"
                  subtitle={`${revenueBookings.length} bookings in range — tap to view vehicle`}
                />
                {revenueBookings.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-8">No revenue bookings found</p>
                ) : (
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {revenueBookings
                      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                      .map((booking) => {
                        const vehicle = vehicleMap.get(booking.vehicle_id);
                        return (
                          <div
                            key={booking.id}
                            className="flex items-center justify-between p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer admin-card-press"
                            onClick={() => vehicle && setSelectedVehicleId(vehicle.id)}
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-lg flex items-center justify-center text-white shrink-0 bg-green-500">
                                  <DollarSign className="h-4 w-4" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium">
                                    {vehicle ? getVehicleDisplayName(vehicle) : "Unknown Vehicle"}
                                  </p>
                                  <p className="text-xs text-gray-500">{formatDate(booking.created_at)}</p>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-3 shrink-0">
                              <div>
                                <Badge
                                  variant="secondary"
                                  className={`text-xs ${
                                    booking.status === "completed"
                                      ? "bg-green-100 text-green-700"
                                      : booking.status === "active"
                                      ? "bg-blue-100 text-blue-700"
                                      : "bg-gray-100 text-gray-700"
                                  }`}
                                >
                                  {booking.status}
                                </Badge>
                              </div>
                              <p className="text-sm font-semibold text-green-600 whitespace-nowrap">
                                ${booking.total_price.toLocaleString()}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* PROFIT TAB                                                 */}
        {/* ═══════════════════════════════════════════════════════════ */}
        {activeTab === "profit" && (
          <div className="space-y-6">
            {/* Summary Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              <StatCard
                label="Total Revenue"
                value={fmtCurrency(summaryData.totalRevenue)}
                icon={<TrendingUp className="h-4 w-4" />}
                accent="green"
              />
              <StatCard
                label="Total Expenses"
                value={fmtCurrency(summaryData.totalExpenses)}
                icon={<TrendingDown className="h-4 w-4" />}
                accent="red"
              />
              <StatCard
                label="Net Profit"
                value={fmtCurrency(summaryData.netProfit)}
                icon={summaryData.netProfit >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                accent={summaryData.netProfit >= 0 ? "purple" : "red"}
              />
              <StatCard
                label="Profit Margin"
                value={`${summaryData.profitMargin.toFixed(1)}%`}
                icon={<BarChart3 className="h-4 w-4" />}
                accent="blue"
              />
            </div>

            {/* Monthly Profit Trend Chart */}
            <Card className="rounded-2xl">
              <CardContent className="p-4 sm:p-5">
                <SectionHeader
                  title="Monthly Profit Trend"
                  subtitle="Revenue (green), Expenses (red), and Net Profit (blue line)"
                />
                <div className="h-56 sm:h-72 lg:h-80">
                  <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                    <ComposedChart data={monthlyProfitData} margin={{ top: 10, right: 10, bottom: 5, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `$${v}`} />
                      <Tooltip
                        formatter={(value, name) => [
                          `$${Number(value).toLocaleString()}`,
                          String(name).charAt(0).toUpperCase() + String(name).slice(1),
                        ]}
                        contentStyle={{ borderRadius: "8px", border: "1px solid #e5e7eb" }}
                      />
                      <Bar dataKey="revenue" fill="#10B981" radius={[8, 8, 0, 0]} name="Revenue" />
                      <Bar dataKey="expenses" fill="#EF4444" radius={[8, 8, 0, 0]} name="Expenses" />
                      <Line type="monotone" dataKey="profit" stroke="#3B82F6" strokeWidth={2} dot={{ fill: "#3B82F6", r: 4 }} name="Profit" />
                      <Legend verticalAlign="top" height={36} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Monthly Breakdown */}
            <Card>
              <CardContent className="p-4 sm:p-5">
                <SectionHeader
                  title="Monthly Breakdown"
                  subtitle="Detailed profit analysis by month"
                />
                {/* Mobile: Card-based */}
                <div className="space-y-2.5 sm:hidden">
                  {monthlyProfitData.map((month) => (
                    <div key={month.date} className="bg-gray-50 rounded-xl p-3.5">
                      <div className="flex items-center justify-between mb-2">
                        <p className="font-semibold text-gray-900 text-sm">{month.month}</p>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${month.revenue > 0 && month.profit >= 0 ? "bg-green-100 text-green-700" : month.revenue > 0 ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-500"}`}>
                          {month.revenue > 0 ? ((month.profit / month.revenue) * 100).toFixed(1) : "0"}%
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div className="bg-white rounded-lg py-1.5">
                          <p className="text-sm font-bold text-green-600">${month.revenue.toLocaleString()}</p>
                          <p className="text-[10px] text-gray-400">Revenue</p>
                        </div>
                        <div className="bg-white rounded-lg py-1.5">
                          <p className="text-sm font-bold text-red-500">${month.expenses.toLocaleString()}</p>
                          <p className="text-[10px] text-gray-400">Expenses</p>
                        </div>
                        <div className="bg-white rounded-lg py-1.5">
                          <p className={`text-sm font-bold ${month.profit >= 0 ? "text-purple-600" : "text-red-600"}`}>${month.profit.toLocaleString()}</p>
                          <p className="text-[10px] text-gray-400">Profit</p>
                        </div>
                      </div>
                    </div>
                  ))}
                  {/* Total row */}
                  <div className="bg-purple-50 border border-purple-100 rounded-xl p-3.5">
                    <p className="text-xs font-semibold text-purple-700 mb-2">Total</p>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div>
                        <p className="text-sm font-bold text-green-600">{fmtCurrency(monthlyProfitData.reduce((s, m) => s + m.revenue, 0))}</p>
                        <p className="text-[10px] text-gray-500">Revenue</p>
                      </div>
                      <div>
                        <p className="text-sm font-bold text-red-500">{fmtCurrency(monthlyProfitData.reduce((s, m) => s + m.expenses, 0))}</p>
                        <p className="text-[10px] text-gray-500">Expenses</p>
                      </div>
                      <div>
                        <p className={`text-sm font-bold ${summaryData.netProfit >= 0 ? "text-purple-600" : "text-red-600"}`}>{fmtCurrency(monthlyProfitData.reduce((s, m) => s + m.profit, 0))}</p>
                        <p className="text-[10px] text-gray-500">Profit</p>
                      </div>
                    </div>
                  </div>
                </div>
                {/* Desktop: Table */}
                <div className="hidden sm:block overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th scope="col" className="text-left py-3 px-4 font-semibold text-gray-700">Month</th>
                        <th scope="col" className="text-right py-3 px-4 font-semibold text-gray-700">Revenue</th>
                        <th scope="col" className="text-right py-3 px-4 font-semibold text-gray-700">Expenses</th>
                        <th scope="col" className="text-right py-3 px-4 font-semibold text-gray-700">Profit</th>
                        <th scope="col" className="text-right py-3 px-4 font-semibold text-gray-700">Margin %</th>
                      </tr>
                    </thead>
                    <tbody>
                      {monthlyProfitData.map((month) => (
                        <tr key={month.date} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-3 px-4 text-gray-700">{month.month}</td>
                          <td className="py-3 px-4 text-right text-green-600 font-medium">
                            ${month.revenue.toLocaleString()}
                          </td>
                          <td className="py-3 px-4 text-right text-red-600 font-medium">
                            ${month.expenses.toLocaleString()}
                          </td>
                          <td
                            className={`py-3 px-4 text-right font-semibold ${
                              month.profit >= 0 ? "text-purple-600" : "text-red-600"
                            }`}
                          >
                            ${month.profit.toLocaleString()}
                          </td>
                          <td
                            className={`py-3 px-4 text-right font-semibold ${
                              month.revenue > 0 && month.profit >= 0
                                ? "text-green-600"
                                : month.revenue > 0 && month.profit < 0
                                ? "text-red-600"
                                : "text-gray-500"
                            }`}
                          >
                            {month.revenue > 0 ? ((month.profit / month.revenue) * 100).toFixed(1) : "0"}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-gray-300 bg-gray-50 font-bold">
                        <td className="py-3 px-4 text-gray-900">Total</td>
                        <td className="py-3 px-4 text-right text-green-600">
                          {fmtCurrency(monthlyProfitData.reduce((s, m) => s + m.revenue, 0))}
                        </td>
                        <td className="py-3 px-4 text-right text-red-600">
                          {fmtCurrency(monthlyProfitData.reduce((s, m) => s + m.expenses, 0))}
                        </td>
                        <td className={`py-3 px-4 text-right ${summaryData.netProfit >= 0 ? "text-purple-600" : "text-red-600"}`}>
                          {fmtCurrency(monthlyProfitData.reduce((s, m) => s + m.profit, 0))}
                        </td>
                        <td className={`py-3 px-4 text-right ${summaryData.profitMargin >= 0 ? "text-green-600" : "text-red-600"}`}>
                          {summaryData.profitMargin.toFixed(1)}%
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* VEHICLES TAB                                               */}
        {/* ═══════════════════════════════════════════════════════════ */}
        {activeTab === "vehicles" && (
          <div className="space-y-4">
            <SectionHeader
              title="Fleet Performance"
              subtitle="Click any vehicle for full financial breakdown"
            />
            {vehicleAnalytics.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-12">No vehicles found</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {vehicleAnalytics.map((v, idx) => (
                  <Card
                    key={v.id}
                    className="cursor-pointer hover:shadow-lg hover:border-purple-200 transition-all rounded-2xl admin-card-press"
                    onClick={() => setSelectedVehicleId(v.id)}
                  >
                    <CardContent className="p-4 sm:p-5">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <p className="font-bold text-gray-900">{v.name}</p>
                          <p className="text-xs text-gray-500">{v.bookings} bookings · {v.bookedDays} days</p>
                        </div>
                        <div className={`text-xs font-bold px-2 py-1 rounded-full ${idx === 0 ? "bg-yellow-100 text-yellow-700" : idx === 1 ? "bg-gray-100 text-gray-600" : idx === 2 ? "bg-orange-100 text-orange-700" : "bg-gray-50 text-gray-400"}`}>
                          #{idx + 1}
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-3 text-center">
                        <div>
                          <p className="text-lg font-bold text-green-600">${v.revenue.toLocaleString()}</p>
                          <p className="text-xs text-gray-500">Revenue</p>
                        </div>
                        <div>
                          <p className="text-lg font-bold text-red-500">${v.expenses.toLocaleString()}</p>
                          <p className="text-xs text-gray-500">Expenses</p>
                        </div>
                        <div>
                          <p className={`text-lg font-bold ${v.profit >= 0 ? "text-purple-600" : "text-red-600"}`}>
                            ${v.profit.toLocaleString()}
                          </p>
                          <p className="text-xs text-gray-500">Profit</p>
                        </div>
                      </div>

                      <div className="mt-4">
                        <div className="flex justify-between text-xs text-gray-500 mb-1">
                          <span>Occupancy</span>
                          <span>{v.occupancy.toFixed(0)}%</span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${v.occupancy >= 60 ? "bg-green-500" : v.occupancy >= 30 ? "bg-amber-500" : "bg-red-400"}`}
                            style={{ width: `${v.occupancy}%` }}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </PageContainer>
    </>
  );
}
