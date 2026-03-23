"use client";

import React, { useEffect, useState, useMemo } from "react";
import { adminFetch } from "@/lib/utils/admin-fetch";
import { calculateFinancing } from "@/lib/utils/financing";
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
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PageContainer } from "@/components/layout/page-container";
import { formatDate } from "@/lib/utils/date-helpers";
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

interface Vehicle {
  id: string;
  year: number;
  make: string;
  model: string;
  purchasePrice?: number;
  isFinanced?: boolean;
  monthlyPayment?: number;
  paymentDayOfMonth?: number;
  financingStartDate?: string;
  createdAt?: string;
}

interface EditingExpense {
  id: string;
  category: string;
  amount: string;
  description: string;
  date: string;
  vehicle_id: string | null;
}

// ─── Constants ────────────────────────────────────────────────────
const CATEGORY_COLORS: Record<string, string> = {
  maintenance: "#EF4444",
  insurance: "#3B82F6",
  fuel: "#F59E0B",
  cleaning: "#10B981",
  parking: "#8B5CF6",
  registration: "#EC4899",
  financing: "#7C3AED",
  tickets: "#F97316",
  other: "#6B7280",
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
      className={`bg-white rounded-xl border border-gray-100 p-5 hover:shadow-md transition-shadow ${onClick ? "cursor-pointer hover:border-purple-200" : ""}`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-3">
        <div
          className={`p-2.5 rounded-lg bg-gradient-to-br ${accentMap[accent]} text-white`}
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
      <p className="text-2xl font-bold text-gray-900 tracking-tight">{value}</p>
      <p className="text-xs text-gray-500 mt-1 font-medium uppercase tracking-wide">
        {label}
      </p>
      {subtext && <p className="text-xs text-gray-400 mt-0.5">{subtext}</p>}
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
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState({
    from: new Date(new Date().getFullYear(), 0, 1).toISOString().split("T")[0],
    to: new Date().toISOString().split("T")[0],
  });
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
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [showDailyRevenue, setShowDailyRevenue] = useState(false);
  const [tickets, setTickets] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<"overview" | "expenses" | "revenue" | "profit" | "vehicles">("overview");

  // ─── Data Fetching ──────────────────────────────────────────────
  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [bookingsRes, expensesRes, vehiclesRes, maintenanceRes, ticketsRes] = await Promise.all([
        adminFetch("/api/admin/bookings"),
        adminFetch(`/api/admin/expenses?from=${dateRange.from}&to=${dateRange.to}`),
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
      const ticketsData = ticketsRes.ok ? await ticketsRes.json() : { data: [] };

      setBookings(bookingsData.data || []);
      setExpenses(expensesData.data || []);
      setVehicles(vehiclesData.data || []);
      setMaintenance(maintenanceData.data || []);
      setTickets(ticketsData.data || []);
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
  }, [dateRange]);

  // ─── Computed Data ──────────────────────────────────────────────
  const revenueBookings = useMemo(
    () => bookings.filter((b) => ["confirmed", "active", "completed"].includes(b.status)),
    [bookings]
  );

  // Maintenance costs (all completed maintenance records show as expenses)
  const maintenanceCosts = useMemo(() => {
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
        fromMaintenance: true,
      }));
  }, [maintenance]);

  // Financing costs (monthly payments for financed vehicles, generated as individual expense entries)
  const financingCosts = useMemo(() => {
    const entries: Array<{
      id: string;
      vehicle_id: string;
      category: string;
      amount: number;
      description: string;
      date: string;
      created_at: string;
      fromFinancing: boolean;
    }> = [];

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

          entries.push({
            id: `financing-${vehicle.id}-${i}`,
            vehicle_id: vehicle.id,
            category: "financing",
            amount: financing.monthlyPayment,
            description: `Monthly payment — ${vehicle.year} ${vehicle.make} ${vehicle.model}`,
            date: dateStr,
            created_at: dateStr,
            fromFinancing: true,
          });
        } catch {
          // Skip any date that fails
          continue;
        }
      }
    });

    return entries;
  }, [vehicles]);

  // Ticket costs (traffic violations converted to expense entries)
  const ticketCosts = useMemo(() => {
    return tickets.map((ticket) => ({
      id: ticket.id,
      vehicle_id: ticket.vehicle_id,
      category: "tickets" as const,
      amount: ticket.amount_due ?? 0,
      description: `${ticket.ticket_type} — ${ticket.municipality}, ${ticket.state}`,
      date: ticket.violation_date || ticket.created_at || new Date().toISOString().split("T")[0],
      created_at: ticket.created_at || new Date().toISOString(),
      fromTickets: true,
    }));
  }, [tickets]);

  // All costs = explicit expenses + maintenance record costs + financing payments + tickets
  const allExpenses = useMemo(() => {
    return [...expenses, ...maintenanceCosts, ...financingCosts, ...ticketCosts];
  }, [expenses, maintenanceCosts, financingCosts, ticketCosts]);

  const summaryData = useMemo(() => {
    const totalRevenue = revenueBookings.reduce((sum, b) => sum + (b.total_price ?? 0), 0);
    const totalExpenses = allExpenses.reduce((sum, e) => sum + (e.amount ?? 0), 0);

    // Non-financed vehicle purchase prices (financed vehicles are already in allExpenses as monthly payments)
    const nonFinancedCosts = vehicles
      .filter((v) => !v.isFinanced)
      .reduce((sum, v) => sum + (v.purchasePrice ?? 0), 0);
    const netProfit = totalRevenue - totalExpenses - nonFinancedCosts;

    const totalDaysInRange = Math.max(
      1,
      Math.ceil(
        (new Date(dateRange.to).getTime() - new Date(dateRange.from).getTime()) /
          (1000 * 60 * 60 * 24)
      )
    );

    let totalBookedDays = 0;
    revenueBookings.forEach((booking) => {
      const pickup = new Date(booking.pickup_date).getTime();
      const returnDate = new Date(booking.return_date).getTime();
      totalBookedDays += Math.ceil((returnDate - pickup) / (1000 * 60 * 60 * 24));
    });

    const occupancyRate =
      vehicles.length > 0
        ? Math.min(100, Math.max(0, (totalBookedDays / (totalDaysInRange * vehicles.length)) * 100))
        : 0;

    const avgBookingValue =
      revenueBookings.length > 0 ? totalRevenue / revenueBookings.length : 0;

    return {
      totalRevenue,
      totalExpenses: totalExpenses + nonFinancedCosts,
      netProfit,
      occupancyRate,
      totalBookings: revenueBookings.length,
      avgBookingValue,
      totalBookedDays,
    };
  }, [revenueBookings, allExpenses, vehicles, dateRange]);

  // Cash flow data — monthly money in vs money out
  const cashFlowData = useMemo(() => {
    const months: Record<string, { month: string; income: number; expenses: number }> = {};

    // Build last 6 months
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      months[key] = {
        month: d.toLocaleDateString("en-US", { month: "short" }),
        income: 0,
        expenses: 0,
      };
    }

    revenueBookings.forEach((b) => {
      const d = new Date(b.created_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (months[key]) months[key].income += b.total_price ?? 0;
    });

    allExpenses.forEach((e) => {
      const d = new Date(e.date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (months[key]) months[key].expenses += e.amount ?? 0;
    });

    return Object.values(months).map((m) => ({
      ...m,
      income: Math.round(m.income),
      expenses: Math.round(m.expenses),
      net: Math.round(m.income - m.expenses),
    }));
  }, [revenueBookings, allExpenses]);

  // Daily earnings (last 14 days)
  const dailyEarningsData = useMemo(() => {
    const today = new Date();
    const days: { label: string; date: string; revenue: number; expenses: number }[] = [];

    for (let i = 13; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      days.push({
        date: d.toISOString().split("T")[0],
        label: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        revenue: 0,
        expenses: 0,
      });
    }

    revenueBookings.forEach((b) => {
      const dateStr = new Date(b.created_at).toISOString().split("T")[0];
      const day = days.find((d) => d.date === dateStr);
      if (day) day.revenue += b.total_price ?? 0;
    });

    allExpenses.forEach((e) => {
      const dateStr = new Date(e.date).toISOString().split("T")[0];
      const day = days.find((d) => d.date === dateStr);
      if (day) day.expenses += e.amount ?? 0;
    });

    return days.map((d) => ({
      ...d,
      revenue: Math.round(d.revenue),
      expenses: Math.round(d.expenses),
    }));
  }, [revenueBookings, allExpenses]);

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
  }, [allExpenses, vehicles]);

  // Vehicle profitability rankings
  const vehicleAnalytics = useMemo(() => {
    return vehicles
      .map((vehicle) => {
        const vBookings = revenueBookings.filter((b) => b.vehicle_id === vehicle.id);
        const vExpenses = allExpenses.filter((e) => e.vehicle_id === vehicle.id);
        const revenue = vBookings.reduce((s, b) => s + (b.total_price ?? 0), 0);
        const expenseTotal = vExpenses.reduce((s, e) => s + (e.amount ?? 0), 0);
        // For financed vehicles, costs are already in allExpenses as financing entries
        const vehicleCost = vehicle.isFinanced ? 0 : (vehicle.purchasePrice ?? 0);

        const totalDaysInRange = Math.max(
          1,
          Math.ceil(
            (new Date(dateRange.to).getTime() - new Date(dateRange.from).getTime()) /
              (1000 * 60 * 60 * 24)
          )
        );
        let bookedDays = 0;
        vBookings.forEach((b) => {
          bookedDays += Math.ceil(
            (new Date(b.return_date).getTime() - new Date(b.pickup_date).getTime()) /
              (1000 * 60 * 60 * 24)
          );
        });

        return {
          id: vehicle.id,
          name: `${vehicle.year} ${vehicle.make} ${vehicle.model}`,
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

  // Revenue by month
  const revenueByMonth = useMemo(() => {
    const months: Record<string, { month: string; date: string; revenue: number; bookings: number }> = {};

    // Build last 12 months
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      months[key] = {
        month: d.toLocaleDateString("en-US", { month: "short", year: "numeric" }),
        date: key,
        revenue: 0,
        bookings: 0,
      };
    }

    revenueBookings.forEach((b) => {
      const d = new Date(b.created_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (months[key]) {
        months[key].revenue += b.total_price ?? 0;
        months[key].bookings += 1;
      }
    });

    return Object.values(months).map((m) => ({
      ...m,
      revenue: Math.round(m.revenue),
    }));
  }, [revenueBookings]);

  // Monthly profit data (revenue, expenses, profit)
  const monthlyProfitData = useMemo(() => {
    const months: Record<string, { month: string; date: string; revenue: number; expenses: number }> = {};

    // Build last 12 months
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      months[key] = {
        month: d.toLocaleDateString("en-US", { month: "short" }),
        date: key,
        revenue: 0,
        expenses: 0,
      };
    }

    revenueBookings.forEach((b) => {
      const d = new Date(b.created_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (months[key]) months[key].revenue += b.total_price ?? 0;
    });

    allExpenses.forEach((e) => {
      const d = new Date(e.date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (months[key]) months[key].expenses += e.amount ?? 0;
    });

    return Object.values(months).map((m) => ({
      ...m,
      revenue: Math.round(m.revenue),
      expenses: Math.round(m.expenses),
      profit: Math.round(m.revenue - m.expenses),
    }));
  }, [revenueBookings, allExpenses]);

  // ─── Expense CRUD ───────────────────────────────────────────────
  const handleAddExpense = async () => {
    if (!newExpense.amount || !newExpense.date) {
      alert("Please fill in all required fields");
      return;
    }
    try {
      const response = await adminFetch("/api/admin/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vehicleId: newExpense.vehicleId || null,
          category: newExpense.category,
          amount: parseFloat(newExpense.amount),
          description: newExpense.description || null,
          date: newExpense.date,
        }),
      });
      if (!response.ok) throw new Error("Failed to create expense");
      setNewExpense({ vehicleId: "", category: "maintenance", amount: "", description: "", date: new Date().toISOString().split("T")[0] });
      setAddingExpense(false);
      fetchData();
    } catch (err) {
      logger.error("Error creating expense:", err);
      alert("Failed to create expense");
    }
  };

  const handleUpdateExpense = async () => {
    if (!editingExpense || !editingExpense.amount || !editingExpense.date) {
      alert("Please fill in all required fields");
      return;
    }
    try {
      const response = await adminFetch("/api/admin/expenses", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingExpense.id,
          vehicleId: editingExpense.vehicle_id || null,
          category: editingExpense.category,
          amount: parseFloat(editingExpense.amount),
          description: editingExpense.description || null,
          date: editingExpense.date,
        }),
      });
      if (!response.ok) throw new Error("Failed to update expense");
      setEditingExpense(null);
      fetchData();
    } catch (err) {
      logger.error("Error updating expense:", err);
      alert("Failed to update expense");
    }
  };

  const handleDeleteExpense = async (id: string) => {
    try {
      const response = await adminFetch(`/api/admin/expenses?id=${id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Failed to delete expense");
      setDeleteConfirm(null);
      fetchData();
    } catch (err) {
      logger.error("Error deleting expense:", err);
      alert("Failed to delete expense");
    }
  };

  const handleExportExpensesCSV = () => {
    const exportData = expenses.map((expense) => ({
      Date: formatDate(expense.date),
      Category: expense.category.charAt(0).toUpperCase() + expense.category.slice(1),
      Description: expense.description || "",
      Vehicle: expense.vehicle_id ? ((() => { const v = vehicles.find((v) => v.id === expense.vehicle_id); return v ? `${v.make} ${v.model}` : "N/A"; })()) : "N/A",
      Amount: `$${expense.amount}`,
    }));
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
    const totalDays = Math.max(1, Math.ceil((new Date(dateRange.to).getTime() - new Date(dateRange.from).getTime()) / (1000 * 60 * 60 * 24)));
    let bookedDays = 0;
    vBookings.forEach((b) => {
      bookedDays += Math.ceil((new Date(b.return_date).getTime() - new Date(b.pickup_date).getTime()) / (1000 * 60 * 60 * 24));
    });
    const occupancy = Math.min(100, (bookedDays / totalDays) * 100);
    return { vehicle, bookings: vBookings, expenses: vExpenses, revenue, expenseTotal, effectiveCost, financingInfo, profit, roi, occupancy, bookedDays };
  };

  const selectedVehicleDetail = selectedVehicleId ? getVehicleDetail(selectedVehicleId) : null;

  // All-time daily revenue breakdown
  const allTimeDailyRevenue = useMemo(() => {
    const dayMap: Record<string, { date: string; revenue: number; bookingCount: number; bookings: Booking[] }> = {};

    revenueBookings.forEach((b) => {
      const dateStr = new Date(b.created_at).toISOString().split("T")[0];
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
            <button onClick={() => setShowDailyRevenue(false)} className="p-2 hover:bg-gray-100 rounded-lg">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Daily Revenue</h1>
              <p className="text-sm text-gray-500">Day-by-day revenue breakdown — all time</p>
            </div>
          </div>

          {/* Summary stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard label="Total Revenue" value={`$${totalAllTime.toLocaleString()}`} icon={<DollarSign className="h-4 w-4" />} accent="green" />
            <StatCard label="Total Bookings" value={`${totalBookings}`} icon={<Car className="h-4 w-4" />} accent="blue" />
            <StatCard label="Avg / Day" value={`$${Math.round(avgPerDay).toLocaleString()}`} icon={<BarChart3 className="h-4 w-4" />} accent="purple" />
            <StatCard label="Best Day" value={bestDay ? `$${bestDay.revenue.toLocaleString()}` : "$0"} subtext={bestDay ? formatDate(bestDay.date) : ""} icon={<TrendingUp className="h-4 w-4" />} accent="amber" />
          </div>

          {/* Chart */}
          <Card>
            <CardContent className="p-5">
              <SectionHeader title="Revenue Over Time" subtitle={`${allTimeDailyRevenue.length} days with revenue`} />
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={[...allTimeDailyRevenue].reverse().slice(-30)} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 10 }}
                      tickFormatter={(d) => new Date(d + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      interval={Math.max(0, Math.floor(Math.min(30, allTimeDailyRevenue.length) / 8))}
                    />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `$${v}`} />
                    <Tooltip
                      formatter={(value: number) => [`$${value.toLocaleString()}`, "Revenue"]}
                      labelFormatter={(d) => new Date(d + "T00:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })}
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
                      <th className="pb-3 font-medium">Date</th>
                      <th className="pb-3 font-medium text-center">Bookings</th>
                      <th className="pb-3 font-medium text-right">Revenue</th>
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
            <button onClick={() => setSelectedVehicleId(null)} className="p-2 hover:bg-gray-100 rounded-lg">
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
            <div className={`grid grid-cols-2 ${financingInfo ? "md:grid-cols-4" : "md:grid-cols-3"} gap-6`}>
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
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
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
                <p className="text-sm text-gray-400 text-center py-6">No bookings found</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-gray-500">
                        <th className="pb-2 font-medium">Booking ID</th>
                        <th className="pb-2 font-medium">Pickup</th>
                        <th className="pb-2 font-medium">Return</th>
                        <th className="pb-2 font-medium text-right">Amount</th>
                        <th className="pb-2 font-medium text-right">Status</th>
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
                <p className="text-sm text-gray-400 text-center py-6">No expenses recorded</p>
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
                <p className="text-sm text-gray-400 text-center py-6">No expenses</p>
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
                          <p className="text-xs text-gray-400">{formatDate(exp.date)}</p>
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
        <div className="flex items-center justify-center py-20">
          <RefreshCw className="h-8 w-8 animate-spin text-purple-600" />
        </div>
      </PageContainer>
    );
  }

  // ─── Main Dashboard ─────────────────────────────────────────────
  return (
    <>
      {/* Header */}
      <section className="bg-gradient-to-br from-gray-900 to-purple-900 py-8 text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Finances</h1>
              <p className="text-gray-300 mt-1">Track revenue, expenses, and profitability</p>
            </div>
            <Button
              onClick={fetchData}
              variant="outline"
              size="sm"
              className="border-white/20 text-white hover:bg-white/10 bg-transparent"
            >
              <RefreshCw className={`h-4 w-4 mr-1 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>

          {/* Date range + tabs */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mt-6">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 bg-white/10 rounded-lg px-3 py-1.5">
                <Calendar className="h-4 w-4 text-gray-300" />
                <input
                  type="date"
                  value={dateRange.from}
                  onChange={(e) => setDateRange((p) => ({ ...p, from: e.target.value }))}
                  className="bg-transparent text-white text-sm border-none outline-none"
                />
                <span className="text-gray-400">—</span>
                <input
                  type="date"
                  value={dateRange.to}
                  onChange={(e) => setDateRange((p) => ({ ...p, to: e.target.value }))}
                  className="bg-transparent text-white text-sm border-none outline-none"
                />
              </div>
              <button
                onClick={() =>
                  setDateRange({
                    from: new Date(new Date().getFullYear(), 0, 1).toISOString().split("T")[0],
                    to: new Date().toISOString().split("T")[0],
                  })
                }
                className="text-xs text-purple-300 hover:text-white transition-colors"
              >
                Reset YTD
              </button>
            </div>
            <div className="flex gap-1 bg-white/10 rounded-lg p-1">
              {(["overview", "expenses", "revenue", "profit", "vehicles"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-3 py-1.5 text-sm rounded-md transition-colors capitalize ${
                    activeTab === tab
                      ? "bg-white text-gray-900 font-medium"
                      : "text-gray-300 hover:text-white"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <PageContainer>
        {error && (
          <div className="mb-6 flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* OVERVIEW TAB                                               */}
        {/* ═══════════════════════════════════════════════════════════ */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              <StatCard
                label="Total Revenue"
                value={`$${summaryData.totalRevenue.toLocaleString()}`}
                icon={<DollarSign className="h-4 w-4" />}
                accent="green"
                trend={summaryData.totalRevenue > 0 ? "up" : "neutral"}
                onClick={() => setActiveTab("revenue")}
              />
              <StatCard
                label="Total Expenses"
                value={`$${summaryData.totalExpenses.toLocaleString()}`}
                icon={<Receipt className="h-4 w-4" />}
                accent="red"
                onClick={() => setActiveTab("expenses")}
              />
              <StatCard
                label="Net Profit"
                value={`$${summaryData.netProfit.toLocaleString()}`}
                icon={summaryData.netProfit >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                accent={summaryData.netProfit >= 0 ? "purple" : "red"}
                trend={summaryData.netProfit > 0 ? "up" : summaryData.netProfit < 0 ? "down" : "neutral"}
                onClick={() => setActiveTab("profit")}
              />
              <StatCard
                label="Fleet Occupancy"
                value={`${summaryData.occupancyRate.toFixed(0)}%`}
                icon={<Target className="h-4 w-4" />}
                accent="blue"
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
                value={`$${Math.round(summaryData.avgBookingValue).toLocaleString()}`}
                icon={<BarChart3 className="h-4 w-4" />}
                accent="gray"
                onClick={() => setActiveTab("vehicles")}
              />
            </div>

            {/* Cash Flow Chart */}
            <Card className="cursor-pointer hover:shadow-lg hover:border-purple-200 transition-all" onClick={() => setActiveTab("expenses")}>
              <CardContent className="p-5">
                <SectionHeader
                  title="Cash Flow"
                  subtitle="Monthly income vs. expenses (last 6 months) — click for details"
                />
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={cashFlowData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `$${v}`} />
                      <Tooltip
                        formatter={(value: number, name: string) => [`$${value.toLocaleString()}`, name === "income" ? "Income" : name === "expenses" ? "Expenses" : "Net"]}
                        contentStyle={{ borderRadius: "8px", border: "1px solid #e5e7eb" }}
                      />
                      <Bar dataKey="income" fill="#10B981" radius={[4, 4, 0, 0]} name="income" />
                      <Bar dataKey="expenses" fill="#EF4444" radius={[4, 4, 0, 0]} name="expenses" />
                      <Line type="monotone" dataKey="net" stroke="#7C3AED" strokeWidth={2} dot={{ r: 4 }} name="net" />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Daily Revenue + Expense Breakdown side by side */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Daily revenue */}
              <Card className="cursor-pointer hover:shadow-lg hover:border-purple-200 transition-all" onClick={() => setShowDailyRevenue(true)}>
                <CardContent className="p-5">
                  <SectionHeader title="Daily Revenue" subtitle="Last 14 days — click for full breakdown" />
                  <div className="h-52">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={dailyEarningsData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
                        <defs>
                          <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#7C3AED" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#7C3AED" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="label" tick={{ fontSize: 10 }} interval={2} />
                        <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `$${v}`} />
                        <Tooltip
                          formatter={(value: number) => [`$${value.toLocaleString()}`, "Revenue"]}
                          contentStyle={{ borderRadius: "8px", border: "1px solid #e5e7eb" }}
                        />
                        <Area type="monotone" dataKey="revenue" stroke="#7C3AED" fill="url(#revenueGradient)" strokeWidth={2} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Expense categories */}
              <Card className="cursor-pointer hover:shadow-lg hover:border-purple-200 transition-all" onClick={() => setActiveTab("expenses")}>
                <CardContent className="p-5">
                  <SectionHeader title="Expense Categories" subtitle="Click for full expense list" />
                  {expenseCategoryData.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-10">No expenses recorded</p>
                  ) : (
                    <div className="flex gap-4">
                      <div className="w-40 h-40 shrink-0">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={expenseCategoryData}
                              dataKey="value"
                              nameKey="name"
                              cx="50%"
                              cy="50%"
                              innerRadius={35}
                              outerRadius={65}
                              paddingAngle={2}
                            >
                              {expenseCategoryData.map((entry) => (
                                <Cell key={entry.key} fill={CATEGORY_COLORS[entry.key] || "#6B7280"} />
                              ))}
                            </Pie>
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="flex-1 space-y-1.5 overflow-y-auto max-h-44">
                        {expenseCategoryData.map((cat) => (
                          <div key={cat.key} className="flex items-center gap-2 text-sm">
                            <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: CATEGORY_COLORS[cat.key] || "#6B7280" }} />
                            <span className="flex-1 truncate">{cat.name}</span>
                            <span className="font-semibold">${cat.value.toLocaleString()}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Vehicle Profitability Rankings */}
            <Card>
              <CardContent className="p-5">
                <SectionHeader
                  title="Vehicle Profitability"
                  subtitle="Ranked by profit — click to view details"
                />
                {vehicleAnalytics.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-8">No vehicles found</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-left text-gray-500 text-xs uppercase tracking-wider">
                          <th className="pb-3 font-medium">#</th>
                          <th className="pb-3 font-medium">Vehicle</th>
                          <th className="pb-3 font-medium text-center">Bookings</th>
                          <th className="pb-3 font-medium text-right">Revenue</th>
                          <th className="pb-3 font-medium text-right">Expenses</th>
                          <th className="pb-3 font-medium text-right">Profit</th>
                          <th className="pb-3 font-medium text-right">Occupancy</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {vehicleAnalytics.map((v, idx) => (
                          <tr
                            key={v.id}
                            onClick={() => setSelectedVehicleId(v.id)}
                            className="cursor-pointer hover:bg-purple-50 transition-colors"
                          >
                            <td className="py-3 text-gray-400 font-medium">{idx + 1}</td>
                            <td className="py-3 font-medium text-gray-900">{v.name}</td>
                            <td className="py-3 text-center">{v.bookings}</td>
                            <td className="py-3 text-right text-green-600 font-medium">${v.revenue.toLocaleString()}</td>
                            <td className="py-3 text-right text-red-500">${v.expenses.toLocaleString()}</td>
                            <td className={`py-3 text-right font-bold ${v.profit >= 0 ? "text-green-600" : "text-red-600"}`}>
                              ${v.profit.toLocaleString()}
                            </td>
                            <td className="py-3 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                  <div
                                    className="h-full rounded-full bg-purple-500"
                                    style={{ width: `${v.occupancy}%` }}
                                  />
                                </div>
                                <span className="text-xs text-gray-500 w-8 text-right">{v.occupancy.toFixed(0)}%</span>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
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
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {expenseCategoryData.map((cat) => (
                <div
                  key={cat.key}
                  className="bg-white rounded-xl border border-gray-100 p-4 hover:shadow-md transition-shadow"
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
                  <p className="text-xl font-bold text-gray-900">${cat.value.toLocaleString()}</p>
                  {cat.key === "financing" && (
                    <p className="text-xs text-gray-400 mt-0.5">
                      ${Math.round(cat.value / Math.max(1, new Set(financingCosts.map((f) => f.vehicle_id)).size)).toLocaleString()}/vehicle avg
                    </p>
                  )}
                  {cat.key === "maintenance" && (
                    <p className="text-xs text-gray-400 mt-0.5">
                      {maintenanceCosts.length} completed records
                    </p>
                  )}
                </div>
              ))}
              <div className="bg-gradient-to-br from-gray-900 to-purple-900 rounded-xl p-4 text-white">
                <p className="text-xs font-medium text-gray-300 uppercase tracking-wider mb-2">Total Expenses</p>
                <p className="text-xl font-bold">${allExpenses.reduce((s, e) => s + (e.amount ?? 0), 0).toLocaleString()}</p>
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
                        <label className="text-xs font-medium text-gray-600 block mb-1">Category</label>
                        <select
                          value={newExpense.category}
                          onChange={(e) => setNewExpense((p) => ({ ...p, category: e.target.value }))}
                          className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
                        >
                          {CATEGORIES.map((c) => (
                            <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-600 block mb-1">Amount</label>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          value={newExpense.amount}
                          onChange={(e) => setNewExpense((p) => ({ ...p, amount: e.target.value }))}
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-600 block mb-1">Date</label>
                        <Input
                          type="date"
                          value={newExpense.date}
                          onChange={(e) => setNewExpense((p) => ({ ...p, date: e.target.value }))}
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-600 block mb-1">Vehicle (optional)</label>
                        <select
                          value={newExpense.vehicleId}
                          onChange={(e) => setNewExpense((p) => ({ ...p, vehicleId: e.target.value }))}
                          className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
                        >
                          <option value="">General (no vehicle)</option>
                          {vehicles.map((v) => (
                            <option key={v.id} value={v.id}>{v.year} {v.make} {v.model}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-600 block mb-1">Description (optional)</label>
                      <Input
                        placeholder="e.g. Oil change, monthly premium..."
                        value={newExpense.description}
                        onChange={(e) => setNewExpense((p) => ({ ...p, description: e.target.value }))}
                      />
                    </div>
                    <Button onClick={handleAddExpense} className="w-full sm:w-auto">
                      <Plus className="h-4 w-4 mr-1" /> Save Expense
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
                          const vehicle = vehicles.find((v) => v.id === fc.vehicle_id);
                          return (
                            <div
                              key={fc.id}
                              className="flex items-center gap-3 p-3 rounded-lg bg-purple-50 border border-purple-100 cursor-pointer hover:bg-purple-100 transition-colors"
                              onClick={() => setSelectedVehicleId(fc.vehicle_id)}
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
                                <p className="text-xs text-gray-400">{formatDate(fc.date)}</p>
                              </div>
                            </div>
                          );
                        })}
                      {financingCosts.length > 12 && (
                        <p className="text-xs text-gray-400 text-center py-1">
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
                          const vehicle = vehicles.find((v) => v.id === mc.vehicle_id);
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
                                <p className="text-xs text-gray-400">{formatDate(mc.date)}</p>
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
                          const vehicle = vehicles.find((v) => v.id === ticket.vehicle_id);
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
                                <p className="text-xs text-gray-400">{formatDate(ticket.date)}</p>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                )}

                {/* Manual Expenses List */}
                {expenses.length > 0 && (
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Manual Expenses</p>
                )}
                {expenses.length === 0 && maintenanceCosts.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-8">No expenses recorded in this date range</p>
                ) : (
                  <div className="space-y-2">
                    {expenses
                      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                      .map((exp) => {
                        const vehicle = vehicles.find((v) => v.id === exp.vehicle_id);
                        const isEditing = editingExpense?.id === exp.id;
                        const isDeleting = deleteConfirm === exp.id;

                        if (isEditing && editingExpense) {
                          return (
                            <div key={exp.id} className="bg-purple-50 border border-purple-200 rounded-lg p-4 space-y-3">
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                                <div>
                                  <label className="text-xs font-medium text-gray-600 block mb-1">Category</label>
                                  <select
                                    value={editingExpense.category}
                                    onChange={(e) => setEditingExpense((p) => p ? { ...p, category: e.target.value } : p)}
                                    className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
                                  >
                                    {CATEGORIES.map((c) => (
                                      <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                                    ))}
                                  </select>
                                </div>
                                <div>
                                  <label className="text-xs font-medium text-gray-600 block mb-1">Amount</label>
                                  <Input
                                    type="number"
                                    step="0.01"
                                    value={editingExpense.amount}
                                    onChange={(e) => setEditingExpense((p) => p ? { ...p, amount: e.target.value } : p)}
                                  />
                                </div>
                                <div>
                                  <label className="text-xs font-medium text-gray-600 block mb-1">Date</label>
                                  <Input
                                    type="date"
                                    value={editingExpense.date}
                                    onChange={(e) => setEditingExpense((p) => p ? { ...p, date: e.target.value } : p)}
                                  />
                                </div>
                                <div>
                                  <label className="text-xs font-medium text-gray-600 block mb-1">Vehicle</label>
                                  <select
                                    value={editingExpense.vehicle_id || ""}
                                    onChange={(e) => setEditingExpense((p) => p ? { ...p, vehicle_id: e.target.value || null } : p)}
                                    className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
                                  >
                                    <option value="">General</option>
                                    {vehicles.map((v) => (
                                      <option key={v.id} value={v.id}>{v.year} {v.make} {v.model}</option>
                                    ))}
                                  </select>
                                </div>
                              </div>
                              <Input
                                placeholder="Description"
                                value={editingExpense.description}
                                onChange={(e) => setEditingExpense((p) => p ? { ...p, description: e.target.value } : p)}
                              />
                              <div className="flex gap-2">
                                <Button onClick={handleUpdateExpense} size="sm">Save</Button>
                                <Button onClick={() => setEditingExpense(null)} variant="outline" size="sm">Cancel</Button>
                              </div>
                            </div>
                          );
                        }

                        return (
                          <div key={exp.id} className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors group">
                            <div
                              className="w-9 h-9 rounded-lg flex items-center justify-center text-white shrink-0"
                              style={{ backgroundColor: CATEGORY_COLORS[exp.category] || "#6B7280" }}
                            >
                              {CATEGORY_ICONS[exp.category] || <MoreHorizontal className="h-4 w-4" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-medium capitalize">{exp.category}</p>
                                {vehicle && (
                                  <Badge variant="secondary" className="text-xs">
                                    {vehicle.year} {vehicle.make} {vehicle.model}
                                  </Badge>
                                )}
                              </div>
                              {exp.description && <p className="text-xs text-gray-500 truncate">{exp.description}</p>}
                            </div>
                            <div className="text-right shrink-0">
                              <p className="text-sm font-semibold">${exp.amount.toLocaleString()}</p>
                              <p className="text-xs text-gray-400">{formatDate(exp.date)}</p>
                            </div>
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
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
                                className="p-1.5 rounded-md hover:bg-blue-100 text-blue-600"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </button>
                              {isDeleting ? (
                                <div className="flex gap-1">
                                  <button
                                    onClick={() => handleDeleteExpense(exp.id)}
                                    className="px-2 py-1 text-xs bg-red-500 text-white rounded-md hover:bg-red-600"
                                  >
                                    Confirm
                                  </button>
                                  <button
                                    onClick={() => setDeleteConfirm(null)}
                                    className="px-2 py-1 text-xs bg-gray-200 rounded-md hover:bg-gray-300"
                                  >
                                    No
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => setDeleteConfirm(exp.id)}
                                  className="p-1.5 rounded-md hover:bg-red-100 text-red-600"
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
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <StatCard
                label="Total Revenue"
                value={`$${summaryData.totalRevenue.toLocaleString()}`}
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
                value={`$${Math.round(summaryData.avgBookingValue).toLocaleString()}`}
                icon={<BarChart3 className="h-4 w-4" />}
                accent="purple"
              />
              <StatCard
                label="Best Month"
                value={`$${Math.max(0, ...revenueByMonth.map((m) => m.revenue)).toLocaleString()}`}
                icon={<TrendingUp className="h-4 w-4" />}
                accent="amber"
              />
            </div>

            {/* Revenue by Month Chart */}
            <Card>
              <CardContent className="p-5">
                <SectionHeader
                  title="Revenue by Month"
                  subtitle="Last 12 months of booking revenue"
                />
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={revenueByMonth} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `$${v}`} />
                      <Tooltip formatter={(value) => `$${value.toLocaleString()}`} />
                      <Bar dataKey="revenue" fill="#10B981" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Detailed Bookings List */}
            <Card>
              <CardContent className="p-5">
                <SectionHeader
                  title="Recent Bookings"
                  subtitle="Click any booking to view vehicle details"
                />
                {revenueBookings.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-8">No revenue bookings found</p>
                ) : (
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {revenueBookings
                      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                      .map((booking) => {
                        const vehicle = vehicles.find((v) => v.id === booking.vehicle_id);
                        return (
                          <div
                            key={booking.id}
                            className="flex items-center justify-between p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer"
                            onClick={() => vehicle && setSelectedVehicleId(vehicle.id)}
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-lg flex items-center justify-center text-white shrink-0 bg-green-500">
                                  <DollarSign className="h-4 w-4" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium">
                                    {vehicle ? `${vehicle.year} ${vehicle.make} ${vehicle.model}` : "Unknown Vehicle"}
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
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <StatCard
                label="Total Revenue"
                value={`$${summaryData.totalRevenue.toLocaleString()}`}
                icon={<TrendingUp className="h-4 w-4" />}
                accent="green"
              />
              <StatCard
                label="Total Expenses"
                value={`$${summaryData.totalExpenses.toLocaleString()}`}
                icon={<TrendingDown className="h-4 w-4" />}
                accent="red"
              />
              <StatCard
                label="Net Profit"
                value={`$${summaryData.netProfit.toLocaleString()}`}
                icon={summaryData.netProfit >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                accent={summaryData.netProfit >= 0 ? "purple" : "red"}
              />
              <StatCard
                label="Profit Margin"
                value={`${summaryData.totalRevenue > 0 ? ((summaryData.netProfit / summaryData.totalRevenue) * 100).toFixed(1) : 0}%`}
                icon={<BarChart3 className="h-4 w-4" />}
                accent="blue"
              />
            </div>

            {/* Monthly Profit Trend Chart */}
            <Card>
              <CardContent className="p-5">
                <SectionHeader
                  title="Monthly Profit Trend"
                  subtitle="Revenue (green), Expenses (red), and Net Profit (blue line) over the last 12 months"
                />
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={monthlyProfitData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `$${v}`} />
                      <Tooltip formatter={(value) => `$${value.toLocaleString()}`} />
                      <Bar dataKey="revenue" fill="#10B981" radius={[8, 8, 0, 0]} />
                      <Bar dataKey="expenses" fill="#EF4444" radius={[8, 8, 0, 0]} />
                      <Line type="monotone" dataKey="profit" stroke="#3B82F6" strokeWidth={2} dot={{ fill: "#3B82F6", r: 4 }} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Monthly Breakdown Table */}
            <Card>
              <CardContent className="p-5">
                <SectionHeader
                  title="Monthly Breakdown"
                  subtitle="Detailed profit analysis by month"
                />
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Month</th>
                        <th className="text-right py-3 px-4 font-semibold text-gray-700">Revenue</th>
                        <th className="text-right py-3 px-4 font-semibold text-gray-700">Expenses</th>
                        <th className="text-right py-3 px-4 font-semibold text-gray-700">Profit</th>
                        <th className="text-right py-3 px-4 font-semibold text-gray-700">Margin %</th>
                      </tr>
                    </thead>
                    <tbody>
                      {monthlyProfitData.map((month, idx) => (
                        <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50">
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
              <p className="text-sm text-gray-400 text-center py-12">No vehicles found</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {vehicleAnalytics.map((v, idx) => (
                  <Card
                    key={v.id}
                    className="cursor-pointer hover:shadow-lg hover:border-purple-200 transition-all"
                    onClick={() => setSelectedVehicleId(v.id)}
                  >
                    <CardContent className="p-5">
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
