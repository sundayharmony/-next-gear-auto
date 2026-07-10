/**
 * StatGrid and StatCard Components
 * 
 * Unified stat display components for KPIs and metrics.
 * Standardizes the various stat grid patterns found across panels:
 * - grid-cols-2 md:grid-cols-3 lg:grid-cols-5 (Admin Dashboard)
 * - grid-cols-2 sm:grid-cols-4 (Account, Owner)
 * - grid-cols-2 lg:grid-cols-5 (Finance)
 */

import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils/cn";
import { type LucideIcon } from "lucide-react";

export interface StatCardProps {
  /** Stat label */
  label: string;
  /** Stat value */
  value: React.ReactNode;
  /** Icon to display */
  icon: LucideIcon;
  /** Icon color class */
  iconClassName?: string;
  /** Icon background class */
  iconBgClassName?: string;
  /** Link URL (makes card clickable) */
  href?: string;
  /** Change indicator (e.g., "+5%", "-2%") */
  change?: string;
  /** Change direction for styling */
  changeDirection?: "up" | "down" | "neutral";
  /** Additional CSS classes */
  className?: string;
}

/**
 * Individual stat card displaying a metric with icon.
 * 
 * @example
 * // Basic stat
 * <StatCard
 *   label="Total Revenue"
 *   value="$12,345"
 *   icon={DollarSign}
 * />
 * 
 * @example
 * // Stat with link
 * <StatCard
 *   label="Active Bookings"
 *   value={42}
 *   icon={Calendar}
 *   href="/admin/bookings?status=active"
 * />
 * 
 * @example
 * // Stat with change indicator
 * <StatCard
 *   label="Revenue"
 *   value="$15,000"
 *   icon={TrendingUp}
 *   change="+12%"
 *   changeDirection="up"
 * />
 */
export function StatCard({
  label,
  value,
  icon: Icon,
  iconClassName = "text-purple-600",
  iconBgClassName = "bg-purple-50",
  href,
  change,
  changeDirection,
  className,
}: StatCardProps) {
  const content = (
    <div className="flex items-center gap-3">
      <div className={cn("rounded-lg p-2.5", iconBgClassName, iconClassName)}>
        <Icon className="h-5 w-5" aria-hidden />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xl font-bold text-gray-900 tabular-nums">
          {value}
        </p>
        <div className="flex items-center gap-2">
          <p className="truncate text-xs text-gray-500">{label}</p>
          {change && (
            <span
              className={cn(
                "text-xs font-medium",
                changeDirection === "up" && "text-green-600",
                changeDirection === "down" && "text-red-600",
                changeDirection === "neutral" && "text-gray-500"
              )}
            >
              {change}
            </span>
          )}
        </div>
      </div>
    </div>
  );

  const cardClasses = cn(
    "rounded-xl border border-gray-200 bg-white p-4 shadow-sm",
    href && "transition-all hover:shadow-md hover:border-purple-200 cursor-pointer",
    className
  );

  if (href) {
    return (
      <Link href={href} className={cardClasses}>
        {content}
      </Link>
    );
  }

  return <div className={cardClasses}>{content}</div>;
}

export interface StatGridProps {
  /** Number of columns at largest breakpoint */
  columns?: 2 | 3 | 4 | 5;
  /** Stat cards */
  children: React.ReactNode;
  /** Additional CSS classes */
  className?: string;
}

const columnClasses = {
  2: "grid-cols-2",
  3: "grid-cols-2 sm:grid-cols-3",
  4: "grid-cols-2 sm:grid-cols-4",
  5: "grid-cols-2 sm:grid-cols-3 lg:grid-cols-5",
};

/**
 * Grid container for StatCard components.
 * 
 * @example
 * // 4-column stat grid
 * <StatGrid columns={4}>
 *   <StatCard label="Total" value={100} icon={Hash} />
 *   <StatCard label="Active" value={42} icon={Activity} />
 *   <StatCard label="Pending" value={15} icon={Clock} />
 *   <StatCard label="Completed" value={43} icon={Check} />
 * </StatGrid>
 */
export function StatGrid({
  columns = 4,
  children,
  className,
}: StatGridProps) {
  return (
    <div className={cn("grid gap-4", columnClasses[columns], className)}>
      {children}
    </div>
  );
}

export default StatGrid;
