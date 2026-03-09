"use client";

import React, { useEffect, useState, useMemo } from "react";
import { adminFetch } from "@/lib/utils/admin-fetch";
import { calculateFinancing, getEffectiveVehicleCost } from "@/lib/utils/financing";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  PieChart as PieIcon,
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
  ChevronRight,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PageContainer } from "@/components/layout/page-container";
import { formatDate } from "@/lib/utils/date-helpers";
import { statusColors } from "@/lib/utils/status-colors";
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
} from "recharts";

interface Booking {
  id: string;
  vehicle_id: string;
  status: string;
  total_price: number;
  pickup_date: string;
  return_date: string;
  created_at: string;
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

const CATEGORY_COLORS: Record<string, string> = {
  maintenance: "#EF4444",
  insurance: "#3B82F6",
  fuel: "#F59E0B",
  cleaning: "#10B981",
  parking: "#8B5CF6",
  registration: "#EC4899",
  financing: "#7C3AED",
  other: "#6B7280",
};

interface SummaryCardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  color: "green" | "red" | "purple" | "blue";
  format?: "currency" | "percentage";
  onClick?: () => void;
}

function SummaryCard({
  title,
  value,
  icon,
  color,
  format = "currency",
  onClick,
}: SummaryCardProps) {
  const bgColors = {
    green: "bg-green-50",
    red: "bg-red-50",
    purple: "bg-purple-50",
    blue: "bg-blue-50",
  };

  const textColors = {
    green: "text-green-600",
    red: "text-red-600",
    purple: "text-purple-600",
    blue: "text-blue-600",
  };

  const iconColors = {
    green: "text-green-500",
    red: "text-red-500",
    purple: "text-purple-500",
    blue: "text-blue-500",
  };

  return (
    <Card
      className={onClick ? "cursor-pointer hover:shadow-md transition-shadow group" : ""}
      onClick={onClick}
    >
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="text-sm text-gray-600 font-medium">{title}</p>
            <p className={`text-3xl font-bold mt-2 ${textColors[color]}`}>
              {format === "currency" ? "$" : ""}
              {typeof value === "number" ? value.toLocaleString() : "0"}
              {format === "percentage" ? "%" : ""}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div
              className={`p-3 rounded-lg ${bgColors[color]} ${iconColors[color]}`}
            >
              {icon}
            </div>
            {onClick && (
              <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600 transition-colors" />
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface RevenueDataPoint {
  month: string;
  revenue: number;
}

interface ExpenseCategoryData {
  name: string;
  value: number;
}

interface VehicleAnalytics {
  vehicleId: string;
  year: number;
  make: string;
  model: string;
  bookings: number;
  revenue: number;
  expenses: number;
  profit: number;
}

interface OccupancyData {
  vehicleId: string;
  year: number;
  make: string;
  model: string;
  occupancyRate: number;
  bookedDays: number;
}

interface EditingExpense {
  id: string;
  category: string;
  amount: string;
  description: string;
  date: string;
  vehicle_id: string | null;
}

export default function AdminFinancesPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
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
  const [editingExpense, setEditingExpense] = useState<EditingExpense | null>(
    null
  );
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [detailView, setDetailView] = useState<"revenue" | "expenses" | "profit" | "occupancy" | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [bookingsRes, expensesRes, vehiclesRes] = await Promise.all([
        adminFetch("/api/admin/bookings"),
        adminFetch(
          `/api/admin/expenses?from=${dateRange.from}&to=${dateRange.to}`
        ),
        adminFetch("/api/admin/vehicles"),
      ]);

      if (!bookingsRes.ok || !expensesRes.ok || !vehiclesRes.ok) {
        throw new Error("Failed to fetch data");
      }

      const bookingsData = await bookingsRes.json();
      const expensesData = await expensesRes.json();
      const vehiclesData = await vehiclesRes.json();

      setBookings(bookingsData.data || []);
      setExpenses(expensesData.data || []);
      setVehicles(vehiclesData.data || []);
    } catch (err) {
      console.error("Error fetching data:", err);
      setError(
        err instanceof Error ? err.message : "Failed to load dashboard data"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [dateRange]);

  const summaryData = useMemo(() => {
    const revenueBookings = bookings.filter((b) =>
      ["confirmed", "active", "completed"].includes(b.status)
    );
    const totalRevenue = revenueBookings.reduce(
      (sum, b) => sum + (b.total_price ?? 0),
      0
    );
    const totalExpenses = expenses.reduce((sum, e) => sum + (e.amount ?? 0), 0);

    // For financed vehicles, use sum of processed monthly payments instead of full purchase price
    const totalFinancingPayments = vehicles.reduce((sum, v) => {
      if (v.isFinanced) {
        return sum + getEffectiveVehicleCost(v);
      }
      return sum;
    }, 0);
    const totalNonFinancedCosts = vehicles.reduce((sum, v) => {
      if (!v.isFinanced) {
        return sum + (v.purchasePrice ?? 0);
      }
      return sum;
    }, 0);
    const totalVehicleCosts = totalNonFinancedCosts + totalFinancingPayments;
    const netProfit = totalRevenue - totalExpenses - totalVehicleCosts;

    const totalDaysInRange = Math.ceil(
      (new Date(dateRange.to).getTime() -
        new Date(dateRange.from).getTime()) /
        (1000 * 60 * 60 * 24)
    );

    let totalBookedDays = 0;
    revenueBookings.forEach((booking) => {
      const pickup = new Date(booking.pickup_date).getTime();
      const returnDate = new Date(booking.return_date).getTime();
      const days = Math.ceil((returnDate - pickup) / (1000 * 60 * 60 * 24));
      totalBookedDays += days;
    });

    const occupancyRate =
      vehicles.length > 0
        ? (totalBookedDays / (totalDaysInRange * vehicles.length)) * 100
        : 0;

    return {
      totalRevenue,
      totalExpenses,
      netProfit,
      occupancyRate: Math.min(100, Math.max(0, occupancyRate)),
    };
  }, [bookings, expenses, vehicles, dateRange]);

  const revenueChartData = useMemo(() => {
    const monthlyData: Record<string, number> = {};

    bookings
      .filter((b) => ["confirmed", "active", "completed"].includes(b.status))
      .forEach((booking) => {
        const date = new Date(booking.created_at);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
        monthlyData[monthKey] = (monthlyData[monthKey] || 0) + (booking.total_price ?? 0);
      });

    return Object.entries(monthlyData)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, revenue]) => ({
        month: new Date(month + "-01").toLocaleDateString("en-US", {
          month: "short",
          year: "numeric",
        }),
        revenue: Math.round(revenue),
      }));
  }, [bookings]);

  const expenseCategoryData = useMemo(() => {
    const categoryTotals: Record<string, number> = {};

    expenses.forEach((expense) => {
      categoryTotals[expense.category] =
        (categoryTotals[expense.category] || 0) + (expense.amount ?? 0);
    });

    // Add financing payments as a virtual expense category
    vehicles.forEach((v) => {
      if (v.isFinanced) {
        const cost = getEffectiveVehicleCost(v);
        if (cost > 0) {
          categoryTotals["financing"] = (categoryTotals["financing"] || 0) + cost;
        }
      }
    });

    return Object.entries(categoryTotals)
      .map(([name, value]) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        value: Math.round(value),
      }))
      .sort((a, b) => b.value - a.value);
  }, [expenses, vehicles]);

  // Daily earnings (last 14 days)
  const dailyEarningsData = useMemo(() => {
    const today = new Date();
    const days: { date: string; label: string; earnings: number }[] = [];

    for (let i = 13; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split("T")[0];
      days.push({
        date: dateStr,
        label: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        earnings: 0,
      });
    }

    bookings
      .filter((b) => ["confirmed", "active", "completed"].includes(b.status))
      .forEach((booking) => {
        const createdDate = new Date(booking.created_at).toISOString().split("T")[0];
        const dayEntry = days.find((d) => d.date === createdDate);
        if (dayEntry) {
          dayEntry.earnings += booking.total_price ?? 0;
        }
      });

    return days.map((d) => ({ ...d, earnings: Math.round(d.earnings) }));
  }, [bookings]);

  // Weekly earnings (last 8 weeks)
  const weeklyEarningsData = useMemo(() => {
    const today = new Date();
    const weeks: { weekStart: string; weekEnd: string; label: string; earnings: number }[] = [];

    for (let i = 7; i >= 0; i--) {
      const weekEnd = new Date(today);
      weekEnd.setDate(weekEnd.getDate() - i * 7);
      const weekStart = new Date(weekEnd);
      weekStart.setDate(weekStart.getDate() - 6);

      weeks.push({
        weekStart: weekStart.toISOString().split("T")[0],
        weekEnd: weekEnd.toISOString().split("T")[0],
        label: `${weekStart.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`,
        earnings: 0,
      });
    }

    bookings
      .filter((b) => ["confirmed", "active", "completed"].includes(b.status))
      .forEach((booking) => {
        const createdDate = booking.created_at.split("T")[0];
        const weekEntry = weeks.find(
          (w) => createdDate >= w.weekStart && createdDate <= w.weekEnd
        );
        if (weekEntry) {
          weekEntry.earnings += booking.total_price ?? 0;
        }
      });

    return weeks.map((w) => ({ ...w, earnings: Math.round(w.earnings) }));
  }, [bookings]);

  const vehicleAnalytics = useMemo(() => {
    const analytics: VehicleAnalytics[] = [];

    vehicles.forEach((vehicle) => {
      const vehicleBookings = bookings.filter(
        (b) => b.vehicle_id === vehicle.id
      );
      const vehicleExpenses = expenses.filter(
        (e) => e.vehicle_id === vehicle.id
      );

      const revenueBookings = vehicleBookings.filter((b) =>
        ["confirmed", "active", "completed"].includes(b.status)
      );
      const revenue = revenueBookings.reduce(
        (sum, b) => sum + (b.total_price ?? 0),
        0
      );
      const expenseTotal = vehicleExpenses.reduce(
        (sum, e) => sum + (e.amount ?? 0),
        0
      );

      // For financed vehicles, add financing payments to expenses
      const vehicleCost = getEffectiveVehicleCost(vehicle);
      const totalExpensesWithFinancing = expenseTotal + vehicleCost;

      analytics.push({
        vehicleId: vehicle.id,
        year: vehicle.year,
        make: vehicle.make,
        model: vehicle.model,
        bookings: revenueBookings.length,
        revenue,
        expenses: totalExpensesWithFinancing,
        profit: revenue - totalExpensesWithFinancing,
      });
    });

    return analytics.sort((a, b) => b.revenue - a.revenue);
  }, [vehicles, bookings, expenses]);

  const occupancyData = useMemo(() => {
    const totalDaysInRange = Math.ceil(
      (new Date(dateRange.to).getTime() -
        new Date(dateRange.from).getTime()) /
        (1000 * 60 * 60 * 24)
    );

    return vehicles
      .map((vehicle) => {
        const vehicleBookings = bookings.filter(
          (b) =>
            b.vehicle_id === vehicle.id &&
            ["confirmed", "active", "completed"].includes(b.status)
        );

        let bookedDays = 0;
        vehicleBookings.forEach((booking) => {
          const pickup = new Date(booking.pickup_date).getTime();
          const returnDate = new Date(booking.return_date).getTime();
          const days = Math.ceil((returnDate - pickup) / (1000 * 60 * 60 * 24));
          bookedDays += days;
        });

        const occupancyRate = Math.min(
          100,
          Math.max(0, (bookedDays / totalDaysInRange) * 100)
        );

        return {
          vehicleId: vehicle.id,
          year: vehicle.year,
          make: vehicle.make,
          model: vehicle.model,
          occupancyRate,
          bookedDays,
        };
      })
      .sort((a, b) => b.occupancyRate - a.occupancyRate);
  }, [vehicles, bookings, dateRange]);

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

      setNewExpense({
        vehicleId: "",
        category: "maintenance",
        amount: "",
        description: "",
        date: new Date().toISOString().split("T")[0],
      });
      setAddingExpense(false);
      fetchData();
    } catch (err) {
      console.error("Error creating expense:", err);
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
      console.error("Error updating expense:", err);
      alert("Failed to update expense");
    }
  };

  const handleDeleteExpense = async (id: string) => {
    try {
      const response = await adminFetch(`/api/admin/expenses?id=${id}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete expense");

      setDeleteConfirm(null);
      fetchData();
    } catch (err) {
      console.error("Error deleting expense:", err);
      alert("Failed to delete expense");
    }
  };

  // Get vehicle detail data
  const getVehicleDetail = (vehicleId: string) => {
    const vehicle = vehicles.find((v) => v.id === vehicleId);
    if (!vehicle) return null;

    const vehicleBookings = bookings.filter(
      (b) =>
        b.vehicle_id === vehicleId &&
        ["confirmed", "active", "completed"].includes(b.status)
    );
    const vehicleExpenses = expenses.filter((e) => e.vehicle_id === vehicleId);

    const revenue = vehicleBookings.reduce(
      (sum, b) => sum + (b.total_price ?? 0),
      0
    );
    const expenseTotal = vehicleExpenses.reduce(
      (sum, e) => sum + (e.amount ?? 0),
      0
    );
    const purchasePrice = vehicle.purchasePrice ?? 0;
    const effectiveCost = getEffectiveVehicleCost(vehicle);
    const financingInfo = vehicle.isFinanced ? calculateFinancing(vehicle) : null;
    const profit = revenue - expenseTotal - effectiveCost;
    const roi =
      effectiveCost > 0 ? ((profit / effectiveCost) * 100).toFixed(2) : "0.00";

    const totalDaysInRange = Math.ceil(
      (new Date(dateRange.to).getTime() -
        new Date(dateRange.from).getTime()) /
        (1000 * 60 * 60 * 24)
    );

    let bookedDays = 0;
    vehicleBookings.forEach((booking) => {
      const pickup = new Date(booking.pickup_date).getTime();
      const returnDate = new Date(booking.return_date).getTime();
      const days = Math.ceil((returnDate - pickup) / (1000 * 60 * 60 * 24));
      bookedDays += days;
    });

    const occupancyRate = Math.min(
      100,
      Math.max(0, (bookedDays / totalDaysInRange) * 100)
    );

    return {
      vehicle,
      bookings: vehicleBookings,
      expenseList: vehicleExpenses,
      revenue,
      expenseAmount: expenseTotal,
      profit,
      purchasePrice,
      effectiveCost,
      financingInfo,
      roi,
      occupancyRate,
      bookedDays,
    };
  };

  const selectedVehicleDetail = selectedVehicleId
    ? getVehicleDetail(selectedVehicleId)
    : null;

  // Render vehicle detail view
  if (selectedVehicleDetail) {
    const { vehicle, bookings: vBookings, expenseList: vExpenses, revenue, expenseAmount, profit, purchasePrice, effectiveCost, financingInfo, roi, occupancyRate, bookedDays } = selectedVehicleDetail;

    const expenseCategoryBreakdown: Record<string, number> = {};
    vExpenses.forEach((exp: Expense) => {
      expenseCategoryBreakdown[exp.category] =
        (expenseCategoryBreakdown[exp.category] || 0) + (exp.amount ?? 0);
    });
    // Add financing payments as a virtual expense category
    if (financingInfo && financingInfo.totalPaid > 0) {
      expenseCategoryBreakdown["financing"] =
        (expenseCategoryBreakdown["financing"] || 0) + financingInfo.totalPaid;
    }

    return (
      <PageContainer>
        <div className="space-y-6">
          {/* Header with back button */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSelectedVehicleId(null)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="h-5 w-5 text-gray-900" />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {vehicle.year} {vehicle.make} {vehicle.model}
              </h1>
              <p className="text-gray-600 mt-1">Vehicle Financial Details</p>
            </div>
          </div>

          {/* Purple gradient header card */}
          <div className="bg-gradient-to-r from-purple-600 to-purple-700 rounded-lg p-6 text-white">
            <div className={`grid grid-cols-1 ${financingInfo ? "md:grid-cols-4" : "md:grid-cols-2"} gap-4`}>
              <div>
                <p className="text-purple-100 text-sm">
                  {vehicle.isFinanced ? "Total Vehicle Price" : "Purchase Price"}
                </p>
                <p className="text-3xl font-bold mt-1">
                  ${purchasePrice.toLocaleString()}
                </p>
              </div>
              {financingInfo && (
                <>
                  <div>
                    <p className="text-purple-100 text-sm">Monthly Payment</p>
                    <p className="text-2xl font-bold mt-1">
                      ${financingInfo.monthlyPayment.toLocaleString()}/mo
                    </p>
                    <p className="text-purple-200 text-xs mt-1">
                      Due on the {financingInfo.paymentDayOfMonth}{financingInfo.paymentDayOfMonth === 1 ? "st" : financingInfo.paymentDayOfMonth === 2 ? "nd" : financingInfo.paymentDayOfMonth === 3 ? "rd" : "th"}
                    </p>
                  </div>
                  <div>
                    <p className="text-purple-100 text-sm">Paid So Far</p>
                    <p className="text-2xl font-bold mt-1">
                      ${financingInfo.totalPaid.toLocaleString()}
                    </p>
                    <p className="text-purple-200 text-xs mt-1">
                      {financingInfo.paymentsProcessed} payment{financingInfo.paymentsProcessed !== 1 ? "s" : ""} made
                    </p>
                  </div>
                </>
              )}
              <div className={financingInfo ? "" : "text-right"}>
                <p className="text-purple-100 text-sm">ROI</p>
                <p className="text-3xl font-bold mt-1">{roi}%</p>
                {financingInfo && (
                  <p className="text-purple-200 text-xs mt-1">
                    ${financingInfo.remainingBalance.toLocaleString()} remaining
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-gray-600">Total Revenue</p>
                <p className="text-2xl font-bold text-green-600 mt-2">
                  ${revenue.toLocaleString()}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-gray-600">Total Expenses</p>
                <p className="text-2xl font-bold text-red-600 mt-2">
                  ${expenseAmount.toLocaleString()}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-gray-600">Net Profit</p>
                <p className="text-2xl font-bold text-purple-600 mt-2">
                  ${profit.toLocaleString()}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-gray-600">Occupancy Rate</p>
                <p className="text-2xl font-bold text-blue-600 mt-2">
                  {occupancyRate.toFixed(1)}%
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-gray-600">Booked Days</p>
                <p className="text-2xl font-bold text-blue-600 mt-2">
                  {bookedDays} days
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-gray-600">Number of Bookings</p>
                <p className="text-2xl font-bold text-orange-600 mt-2">
                  {vBookings.length}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Booking History */}
          <Card>
            <CardContent className="pt-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Booking History
              </h2>
              {vBookings.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="px-4 py-3 text-left font-semibold text-gray-700">
                          Booking ID
                        </th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-700">
                          Dates
                        </th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-700">
                          Status
                        </th>
                        <th className="px-4 py-3 text-right font-semibold text-gray-700">
                          Amount
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {vBookings
                        .sort(
                          (a, b) =>
                            new Date(b.created_at).getTime() -
                            new Date(a.created_at).getTime()
                        )
                        .map((booking) => (
                          <tr
                            key={booking.id}
                            className="border-b border-gray-100 hover:bg-gray-50"
                          >
                            <td className="px-4 py-3 text-gray-900">
                              {booking.id.slice(0, 8)}...
                            </td>
                            <td className="px-4 py-3 text-gray-600">
                              {formatDate(booking.pickup_date)} -
                              {formatDate(booking.return_date)}
                            </td>
                            <td className="px-4 py-3">
                              <Badge
                                className={statusColors[booking.status] || "bg-gray-100 text-gray-600"}
                              >
                                {booking.status.charAt(0).toUpperCase() +
                                  booking.status.slice(1)}
                              </Badge>
                            </td>
                            <td className="px-4 py-3 text-right font-medium text-green-600">
                              ${booking.total_price.toLocaleString()}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-center text-gray-500 py-8">
                  No bookings for this vehicle in the selected period
                </p>
              )}
            </CardContent>
          </Card>

          {/* Expense Breakdown */}
          <Card>
            <CardContent className="pt-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Expense Breakdown
              </h2>
              {vExpenses.length > 0 ? (
                <div className="space-y-3">
                  {Object.entries(expenseCategoryBreakdown)
                    .sort(([, a], [, b]) => b - a)
                    .map(([category, amount]) => (
                      <div
                        key={category}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{
                              backgroundColor:
                                CATEGORY_COLORS[category] || "#6B7280",
                            }}
                          />
                          <span className="font-medium text-gray-900">
                            {category.charAt(0).toUpperCase() +
                              category.slice(1)}
                          </span>
                        </div>
                        <span className="font-semibold text-gray-900">
                          ${amount.toLocaleString()}
                        </span>
                      </div>
                    ))}

                  <div className="mt-4 pt-4 border-t border-gray-200 flex items-center justify-between">
                    <span className="font-semibold text-gray-900">Total</span>
                    <span className="text-lg font-bold text-red-600">
                      ${expenseAmount.toLocaleString()}
                    </span>
                  </div>
                </div>
              ) : (
                <p className="text-center text-gray-500 py-8">
                  No expenses recorded for this vehicle
                </p>
              )}
            </CardContent>
          </Card>

          {/* Detailed Expense List */}
          <Card>
            <CardContent className="pt-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Expense Details
              </h2>
              {vExpenses.length > 0 ? (
                <div className="space-y-2">
                  {vExpenses
                    .sort(
                      (a, b) =>
                        new Date(b.date).getTime() -
                        new Date(a.date).getTime()
                    )
                    .map((expense) => (
                      <div
                        key={expense.id}
                        className="flex items-center justify-between p-3 border border-gray-100 rounded-lg hover:bg-gray-50"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge
                              className="bg-purple-100 text-purple-700"
                              variant="secondary"
                            >
                              {new Date(expense.date).toLocaleDateString()}
                            </Badge>
                            <Badge
                              style={{
                                backgroundColor:
                                  CATEGORY_COLORS[expense.category] + "20",
                                color:
                                  CATEGORY_COLORS[expense.category],
                              }}
                              variant="secondary"
                            >
                              {expense.category.charAt(0).toUpperCase() +
                                expense.category.slice(1)}
                            </Badge>
                          </div>
                          {expense.description && (
                            <p className="text-sm text-gray-600">
                              {expense.description}
                            </p>
                          )}
                        </div>
                        <p className="text-lg font-semibold text-red-600 ml-4">
                          ${expense.amount.toLocaleString()}
                        </p>
                      </div>
                    ))}
                </div>
              ) : (
                <p className="text-center text-gray-500 py-8">
                  No expenses recorded for this vehicle
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </PageContainer>
    );
  }

  if (loading) {
    return (
      <PageContainer>
        <div className="text-center py-12">
          <div className="animate-spin h-8 w-8 border-4 border-purple-600 border-t-transparent rounded-full mx-auto" />
          <p className="mt-4 text-gray-500">Loading financial data...</p>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Financial Analytics
            </h1>
            <p className="text-gray-600 mt-1">
              Fleet performance and expense tracking
            </p>
          </div>
          <Button
            onClick={fetchData}
            variant="outline"
            size="sm"
            className="gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </Button>
        </div>

        {/* Date Range Filter */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex gap-4 items-end">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  From
                </label>
                <Input
                  type="date"
                  value={dateRange.from}
                  onChange={(e) => {
                    if (e.target.value <= dateRange.to) {
                      setDateRange({ ...dateRange, from: e.target.value });
                    }
                  }}
                />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  To
                </label>
                <Input
                  type="date"
                  value={dateRange.to}
                  onChange={(e) => {
                    if (e.target.value >= dateRange.from) {
                      setDateRange({ ...dateRange, to: e.target.value });
                    }
                  }}
                />
              </div>
              <Button
                onClick={() => {
                  const now = new Date();
                  setDateRange({
                    from: new Date(now.getFullYear(), 0, 1)
                      .toISOString()
                      .split("T")[0],
                    to: now.toISOString().split("T")[0],
                  });
                }}
                variant="outline"
              >
                Reset to YTD
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Error State */}
        {error && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="pt-6 flex gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-red-900">Error loading data</p>
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <SummaryCard
            title="Total Revenue"
            value={summaryData.totalRevenue}
            icon={<TrendingUp className="w-6 h-6" />}
            color="green"
            onClick={() => setDetailView("revenue")}
          />
          <SummaryCard
            title="Total Expenses"
            value={summaryData.totalExpenses}
            icon={<TrendingDown className="w-6 h-6" />}
            color="red"
            onClick={() => setDetailView("expenses")}
          />
          <SummaryCard
            title="Net Profit"
            value={summaryData.netProfit}
            icon={<DollarSign className="w-6 h-6" />}
            color="purple"
            onClick={() => setDetailView("profit")}
          />
          <SummaryCard
            title="Fleet Occupancy Rate"
            value={summaryData.occupancyRate}
            icon={<Calendar className="w-6 h-6" />}
            color="blue"
            format="percentage"
            onClick={() => setDetailView("occupancy")}
          />
        </div>

        {/* Earnings Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Daily Earnings */}
          <Card>
            <CardContent className="pt-6">
              <div className="mb-4">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-purple-600" />
                  Daily Earnings
                </h2>
                <p className="text-sm text-gray-500 mt-1">Last 14 days</p>
              </div>
              {dailyEarningsData.some((d) => d.earnings > 0) ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={dailyEarningsData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                    <XAxis dataKey="label" stroke="#9CA3AF" fontSize={11} angle={-45} textAnchor="end" height={60} />
                    <YAxis stroke="#9CA3AF" tickFormatter={(v) => `$${v}`} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#fff",
                        border: "1px solid #e5e7eb",
                        borderRadius: "8px",
                      }}
                      formatter={(value: number) => [`$${value.toLocaleString()}`, "Earnings"]}
                    />
                    <Bar dataKey="earnings" fill="#10B981" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-gray-500">
                  No earnings in the last 14 days
                </div>
              )}
              <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between text-sm">
                <span className="text-gray-500">14-Day Total</span>
                <span className="font-bold text-green-600">
                  ${dailyEarningsData.reduce((s, d) => s + d.earnings, 0).toLocaleString()}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Weekly Earnings */}
          <Card>
            <CardContent className="pt-6">
              <div className="mb-4">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-purple-600" />
                  Weekly Earnings
                </h2>
                <p className="text-sm text-gray-500 mt-1">Last 8 weeks</p>
              </div>
              {weeklyEarningsData.some((w) => w.earnings > 0) ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={weeklyEarningsData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                    <XAxis dataKey="label" stroke="#9CA3AF" fontSize={11} angle={-45} textAnchor="end" height={60} />
                    <YAxis stroke="#9CA3AF" tickFormatter={(v) => `$${v}`} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#fff",
                        border: "1px solid #e5e7eb",
                        borderRadius: "8px",
                      }}
                      formatter={(value: number) => [`$${value.toLocaleString()}`, "Earnings"]}
                    />
                    <Line
                      type="monotone"
                      dataKey="earnings"
                      stroke="#7C3AED"
                      strokeWidth={3}
                      dot={{ fill: "#7C3AED", r: 5 }}
                      activeDot={{ r: 7 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-gray-500">
                  No earnings in the last 8 weeks
                </div>
              )}
              <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between text-sm">
                <span className="text-gray-500">8-Week Total</span>
                <span className="font-bold text-purple-600">
                  ${weeklyEarningsData.reduce((s, w) => s + w.earnings, 0).toLocaleString()}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Revenue Per Vehicle Table */}
        <Card>
          <CardContent className="pt-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Car className="w-5 h-5 text-purple-600" />
              Revenue Per Vehicle
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                      Vehicle
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">
                      Purchase Price
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">
                      Bookings
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">
                      Revenue
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">
                      Expenses
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">
                      Profit
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {vehicleAnalytics.length > 0 ? (
                    vehicleAnalytics.map((vehicle) => {
                      const vehicleData = vehicles.find(
                        (v) => v.id === vehicle.vehicleId
                      );
                      const purchasePrice = vehicleData?.purchasePrice || 0;
                      return (
                        <tr
                          key={vehicle.vehicleId}
                          className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors"
                          onClick={() => setSelectedVehicleId(vehicle.vehicleId)}
                        >
                          <td className="px-4 py-3 text-sm">
                            <span className="font-medium text-gray-900">
                              {vehicle.year} {vehicle.make} {vehicle.model}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right text-sm text-gray-600">
                            ${purchasePrice.toLocaleString()}
                          </td>
                          <td className="px-4 py-3 text-right text-sm text-gray-600">
                            {vehicle.bookings}
                          </td>
                          <td className="px-4 py-3 text-right text-sm font-medium text-green-600">
                            ${vehicle.revenue.toLocaleString()}
                          </td>
                          <td className="px-4 py-3 text-right text-sm font-medium text-red-600">
                            ${vehicle.expenses.toLocaleString()}
                          </td>
                          <td className="px-4 py-3 text-right text-sm font-medium text-purple-600">
                            ${vehicle.profit.toLocaleString()}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={6} className="px-4 py-6 text-center text-gray-500">
                        No vehicle data available
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Occupancy Rate Table */}
        <Card>
          <CardContent className="pt-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-purple-600" />
              Fleet Occupancy Rate
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                      Vehicle
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">
                      Booked Days
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">
                      Occupancy Rate
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {occupancyData.length > 0 ? (
                    occupancyData.map((vehicle) => (
                      <tr
                        key={vehicle.vehicleId}
                        className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors"
                        onClick={() => setSelectedVehicleId(vehicle.vehicleId)}
                      >
                        <td className="px-4 py-3 text-sm">
                          <span className="font-medium text-gray-900">
                            {vehicle.year} {vehicle.make} {vehicle.model}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right text-sm text-gray-600">
                          {vehicle.bookedDays}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-purple-500 to-purple-600"
                                style={{
                                  width: `${vehicle.occupancyRate}%`,
                                }}
                              />
                            </div>
                            <span className="text-sm font-medium text-gray-900 w-12 text-right">
                              {vehicle.occupancyRate.toFixed(1)}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={3} className="px-4 py-6 text-center text-gray-500">
                        No vehicle data available
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Expenses Table */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">
                Expenses
              </h2>
              {!addingExpense && (
                <Button
                  onClick={() => setAddingExpense(true)}
                  className="gap-2 bg-purple-600 hover:bg-purple-700"
                >
                  <Plus className="w-4 h-4" />
                  Add Expense
                </Button>
              )}
            </div>

            {/* Add Expense Form */}
            {addingExpense && (
              <div className="mb-6 p-4 bg-purple-50 rounded-lg border border-purple-200">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Vehicle (Optional)
                    </label>
                    <select
                      value={newExpense.vehicleId}
                      onChange={(e) =>
                        setNewExpense({
                          ...newExpense,
                          vehicleId: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    >
                      <option value="">General</option>
                      {vehicles.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.year} {v.make} {v.model}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Category
                    </label>
                    <select
                      value={newExpense.category}
                      onChange={(e) =>
                        setNewExpense({
                          ...newExpense,
                          category: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    >
                      <option value="maintenance">Maintenance</option>
                      <option value="insurance">Insurance</option>
                      <option value="fuel">Fuel</option>
                      <option value="cleaning">Cleaning</option>
                      <option value="parking">Parking</option>
                      <option value="registration">Registration</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Amount
                    </label>
                    <Input
                      type="number"
                      placeholder="0.00"
                      value={newExpense.amount}
                      onChange={(e) =>
                        setNewExpense({
                          ...newExpense,
                          amount: e.target.value,
                        })
                      }
                      step="0.01"
                      min="0"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Date
                    </label>
                    <Input
                      type="date"
                      value={newExpense.date}
                      onChange={(e) =>
                        setNewExpense({ ...newExpense, date: e.target.value })
                      }
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Description
                    </label>
                    <Input
                      type="text"
                      placeholder="e.g., Oil change service"
                      value={newExpense.description}
                      onChange={(e) =>
                        setNewExpense({
                          ...newExpense,
                          description: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={handleAddExpense}
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    Save Expense
                  </Button>
                  <Button
                    onClick={() => {
                      setAddingExpense(false);
                      setNewExpense({
                        vehicleId: "",
                        category: "maintenance",
                        amount: "",
                        description: "",
                        date: new Date().toISOString().split("T")[0],
                      });
                    }}
                    variant="outline"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {/* Expenses List */}
            <div className="space-y-2">
              {expenses.length > 0 ? (
                expenses
                  .sort(
                    (a, b) =>
                      new Date(b.date).getTime() -
                      new Date(a.date).getTime()
                  )
                  .map((expense) => (
                    <div
                      key={expense.id}
                      className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
                    >
                      {editingExpense?.id === expense.id ? (
                        <div className="flex-1 grid grid-cols-1 md:grid-cols-5 gap-3">
                          <div>
                            <Input
                              type="date"
                              value={editingExpense.date}
                              onChange={(e) =>
                                setEditingExpense({
                                  ...editingExpense,
                                  date: e.target.value,
                                })
                              }
                            />
                          </div>
                          <div>
                            <select
                              value={editingExpense.category}
                              onChange={(e) =>
                                setEditingExpense({
                                  ...editingExpense,
                                  category: e.target.value,
                                })
                              }
                              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                            >
                              <option value="maintenance">Maintenance</option>
                              <option value="insurance">Insurance</option>
                              <option value="fuel">Fuel</option>
                              <option value="cleaning">Cleaning</option>
                              <option value="parking">Parking</option>
                              <option value="registration">
                                Registration
                              </option>
                              <option value="other">Other</option>
                            </select>
                          </div>
                          <div>
                            <Input
                              type="number"
                              value={editingExpense.amount}
                              onChange={(e) =>
                                setEditingExpense({
                                  ...editingExpense,
                                  amount: e.target.value,
                                })
                              }
                              step="0.01"
                              min="0"
                            />
                          </div>
                          <div className="md:col-span-2">
                            <Input
                              type="text"
                              value={editingExpense.description}
                              onChange={(e) =>
                                setEditingExpense({
                                  ...editingExpense,
                                  description: e.target.value,
                                })
                              }
                              placeholder="Description"
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <Badge
                                  className="bg-purple-100 text-purple-700"
                                  variant="secondary"
                                >
                                  {new Date(expense.date).toLocaleDateString()}
                                </Badge>
                                <Badge
                                  style={{
                                    backgroundColor:
                                      CATEGORY_COLORS[expense.category] + "20",
                                    color:
                                      CATEGORY_COLORS[expense.category],
                                  }}
                                  variant="secondary"
                                >
                                  {expense.category.charAt(0).toUpperCase() +
                                    expense.category.slice(1)}
                                </Badge>
                                {expense.vehicle_id && (
                                  <Badge
                                    className="bg-blue-100 text-blue-700"
                                    variant="secondary"
                                  >
                                    {(() => {
                                      const v = vehicles.find(
                                        (v) => v.id === expense.vehicle_id
                                      );
                                      return v
                                        ? `${v.year} ${v.make} ${v.model}`
                                        : "Unknown";
                                    })()}
                                  </Badge>
                                )}
                              </div>
                              {expense.description && (
                                <p className="text-sm text-gray-600">
                                  {expense.description}
                                </p>
                              )}
                            </div>
                            <div className="text-right ml-4">
                              <p className="text-lg font-semibold text-gray-900">
                                ${expense.amount.toLocaleString()}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="flex gap-2 ml-4">
                        {editingExpense?.id === expense.id ? (
                          <>
                            <Button
                              onClick={handleUpdateExpense}
                              size="sm"
                              className="bg-purple-600 hover:bg-purple-700"
                            >
                              Save
                            </Button>
                            <Button
                              onClick={() => setEditingExpense(null)}
                              size="sm"
                              variant="outline"
                            >
                              Cancel
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button
                              onClick={() =>
                                setEditingExpense({
                                  id: expense.id,
                                  category: expense.category,
                                  amount: expense.amount.toString(),
                                  description: expense.description || "",
                                  date: expense.date,
                                  vehicle_id: expense.vehicle_id,
                                })
                              }
                              size="sm"
                              variant="outline"
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            {deleteConfirm === expense.id ? (
                              <>
                                <Button
                                  onClick={() =>
                                    handleDeleteExpense(expense.id)
                                  }
                                  size="sm"
                                  className="bg-red-600 hover:bg-red-700"
                                >
                                  Confirm
                                </Button>
                                <Button
                                  onClick={() => setDeleteConfirm(null)}
                                  size="sm"
                                  variant="outline"
                                >
                                  Cancel
                                </Button>
                              </>
                            ) : (
                              <Button
                                onClick={() => setDeleteConfirm(expense.id)}
                                size="sm"
                                variant="outline"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <p>No expenses recorded yet</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detail Breakdown Panel */}
      {detailView && (
        <div className="fixed inset-0 z-50 flex">
          <div
            className="flex-1 bg-black/50"
            onClick={() => setDetailView(null)}
          />
          <div className="w-full max-w-2xl bg-white shadow-xl overflow-y-auto">
            {/* Panel Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
              <h2 className="text-xl font-bold text-gray-900">
                {detailView === "revenue" && "Revenue Breakdown"}
                {detailView === "expenses" && "Expense Breakdown"}
                {detailView === "profit" && "Profit Breakdown"}
                {detailView === "occupancy" && "Fleet Occupancy Breakdown"}
              </h2>
              <button
                onClick={() => setDetailView(null)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* REVENUE BREAKDOWN */}
              {detailView === "revenue" && (() => {
                const revenueBookings = bookings
                  .filter((b) => ["confirmed", "active", "completed"].includes(b.status))
                  .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

                // Per-vehicle revenue
                const vehicleRevenues = vehicles.map((v) => {
                  const vBookings = revenueBookings.filter((b) => b.vehicle_id === v.id);
                  const total = vBookings.reduce((s, b) => s + (b.total_price ?? 0), 0);
                  return { vehicle: v, total, count: vBookings.length };
                }).sort((a, b) => b.total - a.total);

                return (
                  <>
                    {/* Summary header */}
                    <div className="bg-green-50 rounded-lg p-4">
                      <p className="text-sm text-green-700 font-medium">Total Revenue</p>
                      <p className="text-3xl font-bold text-green-600">${summaryData.totalRevenue.toLocaleString()}</p>
                      <p className="text-sm text-green-600 mt-1">{revenueBookings.length} qualifying bookings</p>
                    </div>

                    {/* Revenue by vehicle */}
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-3">Revenue by Vehicle</h3>
                      <div className="space-y-2">
                        {vehicleRevenues.map(({ vehicle, total, count }) => (
                          <div
                            key={vehicle.id}
                            className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors"
                            onClick={() => { setDetailView(null); setSelectedVehicleId(vehicle.id); }}
                          >
                            <div>
                              <p className="font-medium text-gray-900">{vehicle.year} {vehicle.make} {vehicle.model}</p>
                              <p className="text-sm text-gray-500">{count} booking{count !== 1 ? "s" : ""}</p>
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-green-600">${total.toLocaleString()}</p>
                              <p className="text-xs text-gray-400">
                                {summaryData.totalRevenue > 0 ? ((total / summaryData.totalRevenue) * 100).toFixed(1) : 0}%
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Monthly trend */}
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-3">Monthly Trend</h3>
                      {revenueChartData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={200}>
                          <BarChart data={revenueChartData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                            <XAxis dataKey="month" stroke="#9CA3AF" fontSize={11} />
                            <YAxis stroke="#9CA3AF" tickFormatter={(v) => `$${v}`} />
                            <Tooltip formatter={(value: number) => [`$${value.toLocaleString()}`, "Revenue"]} />
                            <Bar dataKey="revenue" fill="#10B981" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      ) : (
                        <p className="text-gray-500 text-sm text-center py-4">No monthly data</p>
                      )}
                    </div>

                    {/* Recent bookings */}
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-3">Recent Bookings</h3>
                      <div className="space-y-2 max-h-80 overflow-y-auto">
                        {revenueBookings.slice(0, 20).map((booking) => {
                          const v = vehicles.find((veh) => veh.id === booking.vehicle_id);
                          return (
                            <div key={booking.id} className="flex items-center justify-between p-3 border border-gray-100 rounded-lg">
                              <div>
                                <p className="text-sm font-medium text-gray-900">
                                  {v ? `${v.year} ${v.make} ${v.model}` : "Unknown"}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {formatDate(booking.pickup_date)} - {formatDate(booking.return_date)}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="font-semibold text-green-600">${(booking.total_price ?? 0).toLocaleString()}</p>
                                <Badge className={statusColors[booking.status] || "bg-gray-100 text-gray-600"} variant="secondary">
                                  {booking.status}
                                </Badge>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </>
                );
              })()}

              {/* EXPENSE BREAKDOWN */}
              {detailView === "expenses" && (() => {
                return (
                  <>
                    <div className="bg-red-50 rounded-lg p-4">
                      <p className="text-sm text-red-700 font-medium">Total Expenses</p>
                      <p className="text-3xl font-bold text-red-600">${summaryData.totalExpenses.toLocaleString()}</p>
                      <p className="text-sm text-red-600 mt-1">{expenses.length} expense records</p>
                    </div>

                    {/* By category */}
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-3">By Category</h3>
                      <div className="space-y-2">
                        {expenseCategoryData.map((cat) => (
                          <div key={cat.name} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div className="flex items-center gap-3">
                              <div
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: CATEGORY_COLORS[cat.name.toLowerCase()] || "#6B7280" }}
                              />
                              <span className="font-medium text-gray-900">{cat.name}</span>
                            </div>
                            <div className="text-right">
                              <span className="font-bold text-red-600">${cat.value.toLocaleString()}</span>
                              <p className="text-xs text-gray-400">
                                {summaryData.totalExpenses > 0 ? ((cat.value / (summaryData.totalExpenses + expenseCategoryData.filter(c => c.name === "Financing").reduce((s, c) => s + c.value, 0))) * 100).toFixed(1) : 0}%
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Donut chart */}
                    {expenseCategoryData.length > 0 && (
                      <div>
                        <h3 className="font-semibold text-gray-900 mb-3">Category Distribution</h3>
                        <ResponsiveContainer width="100%" height={250}>
                          <PieChart>
                            <Pie data={expenseCategoryData} cx="50%" cy="50%" innerRadius={50} outerRadius={90} paddingAngle={2} dataKey="value">
                              {expenseCategoryData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={CATEGORY_COLORS[entry.name.toLowerCase()] || "#6B7280"} />
                              ))}
                            </Pie>
                            <Tooltip formatter={(value: number) => `$${value.toLocaleString()}`} />
                            <Legend />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    )}

                    {/* By vehicle */}
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-3">By Vehicle</h3>
                      <div className="space-y-2">
                        {vehicles.map((v) => {
                          const vExpenses = expenses.filter((e) => e.vehicle_id === v.id);
                          const total = vExpenses.reduce((s, e) => s + (e.amount ?? 0), 0);
                          if (total === 0) return null;
                          return (
                            <div
                              key={v.id}
                              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors"
                              onClick={() => { setDetailView(null); setSelectedVehicleId(v.id); }}
                            >
                              <p className="font-medium text-gray-900">{v.year} {v.make} {v.model}</p>
                              <p className="font-bold text-red-600">${total.toLocaleString()}</p>
                            </div>
                          );
                        })}
                        {(() => {
                          const unassigned = expenses.filter((e) => !e.vehicle_id);
                          const total = unassigned.reduce((s, e) => s + (e.amount ?? 0), 0);
                          if (total === 0) return null;
                          return (
                            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                              <p className="font-medium text-gray-500">General (unassigned)</p>
                              <p className="font-bold text-red-600">${total.toLocaleString()}</p>
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  </>
                );
              })()}

              {/* PROFIT BREAKDOWN */}
              {detailView === "profit" && (() => {
                const totalVehicleCosts = vehicles.reduce((sum, v) => {
                  return sum + getEffectiveVehicleCost(v);
                }, 0);

                return (
                  <>
                    <div className={`rounded-lg p-4 ${summaryData.netProfit >= 0 ? "bg-purple-50" : "bg-red-50"}`}>
                      <p className={`text-sm font-medium ${summaryData.netProfit >= 0 ? "text-purple-700" : "text-red-700"}`}>Net Profit</p>
                      <p className={`text-3xl font-bold ${summaryData.netProfit >= 0 ? "text-purple-600" : "text-red-600"}`}>
                        ${summaryData.netProfit.toLocaleString()}
                      </p>
                    </div>

                    {/* P&L breakdown */}
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-3">Profit & Loss</h3>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                          <span className="font-medium text-green-800">Revenue</span>
                          <span className="font-bold text-green-600">+${summaryData.totalRevenue.toLocaleString()}</span>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                          <span className="font-medium text-red-800">Operating Expenses</span>
                          <span className="font-bold text-red-600">-${summaryData.totalExpenses.toLocaleString()}</span>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                          <span className="font-medium text-red-800">Vehicle Costs / Financing</span>
                          <span className="font-bold text-red-600">-${totalVehicleCosts.toLocaleString()}</span>
                        </div>
                        <div className="flex items-center justify-between p-4 bg-gray-100 rounded-lg border-2 border-gray-300">
                          <span className="font-bold text-gray-900">Net Profit</span>
                          <span className={`text-xl font-bold ${summaryData.netProfit >= 0 ? "text-green-600" : "text-red-600"}`}>
                            ${summaryData.netProfit.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Per-vehicle profit */}
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-3">Profit by Vehicle</h3>
                      <div className="space-y-2">
                        {vehicleAnalytics.map((va) => (
                          <div
                            key={va.vehicleId}
                            className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors"
                            onClick={() => { setDetailView(null); setSelectedVehicleId(va.vehicleId); }}
                          >
                            <div>
                              <p className="font-medium text-gray-900">{va.year} {va.make} {va.model}</p>
                              <div className="flex gap-3 text-xs text-gray-500 mt-1">
                                <span className="text-green-600">Rev: ${va.revenue.toLocaleString()}</span>
                                <span className="text-red-600">Exp: ${va.expenses.toLocaleString()}</span>
                              </div>
                            </div>
                            <p className={`font-bold ${va.profit >= 0 ? "text-green-600" : "text-red-600"}`}>
                              ${va.profit.toLocaleString()}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                );
              })()}

              {/* OCCUPANCY BREAKDOWN */}
              {detailView === "occupancy" && (() => {
                return (
                  <>
                    <div className="bg-blue-50 rounded-lg p-4">
                      <p className="text-sm text-blue-700 font-medium">Fleet Occupancy Rate</p>
                      <p className="text-3xl font-bold text-blue-600">{summaryData.occupancyRate.toFixed(1)}%</p>
                      <p className="text-sm text-blue-600 mt-1">{vehicles.length} vehicles in fleet</p>
                    </div>

                    {/* Per-vehicle occupancy */}
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-3">Occupancy by Vehicle</h3>
                      <div className="space-y-3">
                        {occupancyData.map((v) => (
                          <div
                            key={v.vehicleId}
                            className="p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors"
                            onClick={() => { setDetailView(null); setSelectedVehicleId(v.vehicleId); }}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <p className="font-medium text-gray-900">{v.year} {v.make} {v.model}</p>
                              <div className="text-right">
                                <span className="font-bold text-blue-600">{v.occupancyRate.toFixed(1)}%</span>
                                <p className="text-xs text-gray-500">{v.bookedDays} days</p>
                              </div>
                            </div>
                            <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-purple-500 to-purple-600 rounded-full"
                                style={{ width: `${v.occupancyRate}%` }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </PageContainer>
  );
}
