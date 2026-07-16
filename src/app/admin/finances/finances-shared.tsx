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
import {
  AdminCard,
  adminSectionTitleClass,
  adminMutedClass,
} from "@/components/admin/admin-shell";
import { cn } from "@/lib/utils/cn";

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

const ACCENT_ICON_BG: Record<string, string> = {
  green: "bg-green-50 text-green-600",
  red: "bg-red-50 text-red-600",
  purple: "bg-purple-50 text-purple-600",
  blue: "bg-blue-50 text-blue-600",
  amber: "bg-amber-50 text-amber-600",
  gray: "bg-gray-100 text-gray-600",
};

/** Finance-specific stat tile — uses shared AdminCard chrome. */
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
  const inner = (
    <>
      <div className="mb-2 flex items-start justify-between sm:mb-3">
        <div className={cn("rounded-lg p-2 sm:p-2.5", ACCENT_ICON_BG[accent])}>{icon}</div>
        {trend ? (
          <div
            className={cn(
              "flex items-center gap-0.5 text-xs font-medium",
              trend === "up" ? "text-green-600" : trend === "down" ? "text-red-500" : "text-gray-400"
            )}
          >
            {trend === "up" ? (
              <ArrowUpRight className="h-3.5 w-3.5" />
            ) : trend === "down" ? (
              <ArrowDownRight className="h-3.5 w-3.5" />
            ) : null}
          </div>
        ) : null}
      </div>
      <p className="text-xl font-bold tracking-tight text-gray-900 tabular-nums sm:text-2xl">{value}</p>
      <p className="mt-0.5 text-[11px] font-medium uppercase tracking-wide text-gray-500 sm:mt-1 sm:text-xs">
        {label}
      </p>
      {subtext ? <p className="mt-0.5 text-[11px] text-gray-500 sm:text-xs">{subtext}</p> : null}
    </>
  );

  if (!onClick) {
    return (
      <AdminCard padding="sm" className="h-full">
        {inner}
      </AdminCard>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className="block h-full w-full rounded-xl text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2"
    >
      <AdminCard
        padding="sm"
        hover
        className="h-full cursor-pointer admin-card-press hover:border-purple-200/80"
      >
        {inner}
      </AdminCard>
    </button>
  );
}

/** @deprecated Prefer AdminSection — kept for finance tab call sites. */
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
    <div className="mb-4 flex items-start justify-between gap-3">
      <div className="min-w-0">
        <h2 className={adminSectionTitleClass}>{title}</h2>
        {subtitle ? <p className={cn(adminMutedClass, "mt-0.5")}>{subtitle}</p> : null}
      </div>
      {action ? <div className="flex shrink-0 items-center gap-2">{action}</div> : null}
    </div>
  );
}
