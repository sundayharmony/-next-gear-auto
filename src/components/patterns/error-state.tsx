/**
 * ErrorState Component
 * 
 * Unified error state display with retry action.
 * Replaces various inline error patterns.
 */

import * as React from "react";
import { cn } from "@/lib/utils/cn";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface ErrorStateProps {
  /** Error title */
  title?: string;
  /** Error message */
  message?: string;
  /** Retry callback */
  onRetry?: () => void;
  /** Retry button label */
  retryLabel?: string;
  /** Additional CSS classes */
  className?: string;
  /** Size variant */
  size?: "sm" | "default" | "lg";
}

const sizeClasses = {
  sm: {
    container: "px-4 py-4",
    icon: "h-5 w-5",
    title: "text-sm",
    message: "text-xs",
  },
  default: {
    container: "px-6 py-8",
    icon: "h-8 w-8",
    title: "text-base",
    message: "text-sm",
  },
  lg: {
    container: "px-8 py-12",
    icon: "h-10 w-10",
    title: "text-lg",
    message: "text-base",
  },
};

/**
 * Error state display with optional retry action.
 * 
 * @example
 * // Basic error
 * <ErrorState message="Failed to load data" />
 * 
 * @example
 * // With retry
 * <ErrorState
 *   title="Something went wrong"
 *   message="Failed to load bookings"
 *   onRetry={() => refetch()}
 * />
 */
export function ErrorState({
  title = "Error",
  message,
  onRetry,
  retryLabel = "Try again",
  className,
  size = "default",
}: ErrorStateProps) {
  const sizes = sizeClasses[size];

  return (
    <div
      className={cn(
        "rounded-xl border border-red-200 bg-red-50 text-center",
        sizes.container,
        className
      )}
    >
      <AlertCircle
        className={cn("mx-auto text-red-500", sizes.icon)}
        aria-hidden
      />
      <h3 className={cn("mt-3 font-semibold text-red-800", sizes.title)}>
        {title}
      </h3>
      {message && (
        <p className={cn("mt-1 text-red-600", sizes.message)}>{message}</p>
      )}
      {onRetry && (
        <div className="mt-4">
          <Button
            variant="outline"
            size={size === "sm" ? "sm" : "default"}
            onClick={onRetry}
            className="border-red-300 text-red-700 hover:bg-red-100"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            {retryLabel}
          </Button>
        </div>
      )}
    </div>
  );
}

export default ErrorState;
