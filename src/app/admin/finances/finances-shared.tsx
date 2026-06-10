"use client";

import React from "react";
import {
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
  Car,
} from "lucide-react";
import type { Vehicle as SharedVehicle } from "@/lib/types";

export interface Booking {
  id: string;
  vehicle_id: string;
  status: string;
  total_price: number;
  pickup_date: string;
  return_date: string;
  created_at: string;
}

export interface MaintenanceRecord {
  id: string;
  vehicleId: string;
  title: string;
  status: string;
  cost: number | null;
  scheduledDate: string;
  completedDate: string | null;
  createdAt: string;
}

export interface Expense {
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

export type Vehicle = SharedVehicle;

export interface EditingExpense {
  id: string;
  category: string;
  amount: string;
  description: string;
  date: string;
  vehicle_id: string | null;
  blocked_date_id?: string | null;
}

export interface UnifiedExpense {
  id: string;
  vehicle_id: string | null;
  category: string;
  amount: number;
  description: string | null;
  date: string;
  created_at: string;
  source: "manual" | "maintenance" | "financing" | "ticket";
  blocked_date_id?: string | null;
}

export const CATEGORY_COLORS: Record<string, string> = {
  maintenance: "#EF4444",
  insurance: "#3B82F6",
  fuel: "#F59E0B",
  cleaning: "#10B981",
  parking: "#06B6D4",
  registration: "#EC4899",
  financing: "#6366F1",
  tickets: "#F97316",
  rideshare: "#8B5CF6",
  turo_trip: "#0D9488",
  other: "#6B7280",
};

export const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  maintenance: <Wrench className="h-4 w-4" />,
  insurance: <Shield className="h-4 w-4" />,
  fuel: <Fuel className="h-4 w-4" />,
  cleaning: <Sparkles className="h-4 w-4" />,
  parking: <ParkingCircle className="h-4 w-4" />,
  registration: <FileText className="h-4 w-4" />,
  financing: <Wallet className="h-4 w-4" />,
  tickets: <Receipt className="h-4 w-4" />,
  rideshare: <Car className="h-4 w-4" />,
  turo_trip: <Target className="h-4 w-4" />,
  other: <MoreHorizontal className="h-4 w-4" />,
};

export const CATEGORIES = [
  "maintenance",
  "insurance",
  "fuel",
  "cleaning",
  "parking",
  "registration",
  "financing",
  "tickets",
  "rideshare",
  "turo_trip",
  "other",
];

export function fmtCurrency(val: number): string {
  return `$${Math.round(val).toLocaleString()}`;
}

export function StatCard({
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

export function SectionHeader({
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
