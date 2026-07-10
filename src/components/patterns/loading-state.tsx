/**
 * LoadingState Component
 * 
 * Unified loading state display.
 * Replaces various inline loading spinner patterns.
 */

import * as React from "react";
import { cn } from "@/lib/utils/cn";
import { Loader2 } from "lucide-react";

export interface LoadingStateProps {
  /** Loading message */
  label?: string;
  /** Additional CSS classes */
  className?: string;
  /** Size variant */
  size?: "sm" | "default" | "lg";
  /** Display inline or as a block */
  inline?: boolean;
}

const sizeClasses = {
  sm: {
    container: "py-4",
    spinner: "h-4 w-4",
    text: "text-xs",
  },
  default: {
    container: "py-8",
    spinner: "h-6 w-6",
    text: "text-sm",
  },
  lg: {
    container: "py-16",
    spinner: "h-8 w-8",
    text: "text-base",
  },
};

/**
 * Loading state display.
 * 
 * @example
 * // Basic loading
 * <LoadingState />
 * 
 * @example
 * // With label
 * <LoadingState label="Loading bookings..." />
 * 
 * @example
 * // Inline loading
 * <LoadingState inline size="sm" />
 */
export function LoadingState({
  label,
  className,
  size = "default",
  inline = false,
}: LoadingStateProps) {
  const sizes = sizeClasses[size];

  if (inline) {
    return (
      <span className={cn("inline-flex items-center gap-2", className)}>
        <Loader2 className={cn("animate-spin text-purple-600", sizes.spinner)} />
        {label && <span className={cn("text-gray-500", sizes.text)}>{label}</span>}
      </span>
    );
  }

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center",
        sizes.container,
        className
      )}
    >
      <Loader2 className={cn("animate-spin text-purple-600", sizes.spinner)} />
      {label && (
        <p className={cn("mt-2 text-gray-500", sizes.text)}>{label}</p>
      )}
    </div>
  );
}

export default LoadingState;
