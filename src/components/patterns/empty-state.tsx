/**
 * EmptyState Component
 * 
 * Unified empty state display for when there's no data to show.
 * Replaces AdminEmptyState and various inline empty state patterns.
 */

import * as React from "react";
import { cn } from "@/lib/utils/cn";
import { Inbox, type LucideIcon } from "lucide-react";

export interface EmptyStateProps {
  /** Title message */
  title: string;
  /** Description text */
  description?: string;
  /** Custom icon (defaults to Inbox) */
  icon?: LucideIcon;
  /** Action button or link */
  action?: React.ReactNode;
  /** Additional CSS classes */
  className?: string;
  /** Size variant */
  size?: "sm" | "default" | "lg";
}

const sizeClasses = {
  sm: {
    container: "px-4 py-6",
    icon: "h-6 w-6",
    title: "text-sm",
    description: "text-xs",
  },
  default: {
    container: "px-6 py-10",
    icon: "h-8 w-8",
    title: "text-sm",
    description: "text-sm",
  },
  lg: {
    container: "px-8 py-16",
    icon: "h-12 w-12",
    title: "text-base",
    description: "text-sm",
  },
};

/**
 * Empty state display for lists, tables, and grids.
 * 
 * @example
 * // Basic empty state
 * <EmptyState title="No bookings found" />
 * 
 * @example
 * // With description and action
 * <EmptyState
 *   title="No vehicles"
 *   description="Add your first vehicle to get started"
 *   action={<Button>Add Vehicle</Button>}
 * />
 * 
 * @example
 * // With custom icon
 * <EmptyState
 *   title="No messages"
 *   icon={MessageSquare}
 *   description="Start a conversation"
 * />
 */
export function EmptyState({
  title,
  description,
  icon: Icon = Inbox,
  action,
  className,
  size = "default",
}: EmptyStateProps) {
  const sizes = sizeClasses[size];

  return (
    <div
      className={cn(
        "rounded-xl border border-gray-200 bg-white shadow-sm text-center",
        sizes.container,
        className
      )}
    >
      <Icon className={cn("mx-auto text-gray-300", sizes.icon)} aria-hidden />
      <h3 className={cn("mt-3 font-semibold text-gray-900", sizes.title)}>
        {title}
      </h3>
      {description && (
        <p className={cn("mt-1 text-gray-500", sizes.description)}>
          {description}
        </p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export default EmptyState;
