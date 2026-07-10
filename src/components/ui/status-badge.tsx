/**
 * StatusBadge Component
 * 
 * A unified status display component that replaces:
 * - Inline status badges in tables
 * - OwnerStatusBadge
 * - PayoutStatusBadge
 * - statusColors utility usage
 * 
 * Uses the design system's unified status color definitions.
 */

import * as React from "react";
import { cn } from "@/lib/utils/cn";
import { getStatusColors, getStatusLabel, type AnyStatus } from "@/lib/design-system/status";

export interface StatusBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** The status to display */
  status: string;
  /** Custom label (overrides default label) */
  label?: string;
  /** Size variant */
  size?: "sm" | "default" | "lg";
  /** Show a colored dot indicator */
  showDot?: boolean;
  /** Show border */
  bordered?: boolean;
}

const sizeClasses = {
  sm: "px-1.5 py-0.5 text-[10px]",
  default: "px-2.5 py-0.5 text-xs",
  lg: "px-3 py-1 text-sm",
};

/**
 * StatusBadge displays a status with consistent styling.
 * 
 * @example
 * // Basic usage
 * <StatusBadge status="confirmed" />
 * 
 * @example
 * // With custom label
 * <StatusBadge status="active" label="In Progress" />
 * 
 * @example
 * // With dot indicator
 * <StatusBadge status="pending" showDot />
 * 
 * @example
 * // Small size
 * <StatusBadge status="completed" size="sm" />
 */
export function StatusBadge({
  status,
  label,
  size = "default",
  showDot = false,
  bordered = false,
  className,
  ...props
}: StatusBadgeProps) {
  const colors = getStatusColors(status);
  const displayLabel = label ?? getStatusLabel(status);

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full font-medium",
        sizeClasses[size],
        colors.bg,
        colors.text,
        bordered && `border ${colors.border}`,
        className
      )}
      {...props}
    >
      {showDot && (
        <span
          className={cn(
            "rounded-full",
            size === "sm" ? "h-1.5 w-1.5" : size === "lg" ? "h-2.5 w-2.5" : "h-2 w-2",
            colors.dot
          )}
        />
      )}
      {displayLabel}
    </span>
  );
}

/**
 * Convenience component for booking statuses
 */
export function BookingStatusBadge({
  status,
  ...props
}: Omit<StatusBadgeProps, "status"> & { status: string }) {
  return <StatusBadge status={status} {...props} />;
}

/**
 * Convenience component for payment statuses
 */
export function PaymentStatusBadge({
  status,
  ...props
}: Omit<StatusBadgeProps, "status"> & { status: string }) {
  return <StatusBadge status={status} {...props} />;
}

export default StatusBadge;
