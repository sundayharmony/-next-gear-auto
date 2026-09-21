"use client";

import * as React from "react";
import { Button, type ButtonProps } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";

/**
 * Consistent footer action row for admin list/card tiles.
 * Uses a 2×2 grid on narrow screens and a single row on wider screens so
 * buttons never overlap when labels differ in length.
 */
export function AdminCardActionBar({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid grid-cols-2 gap-2 border-t border-gray-100 px-3 py-2.5 sm:grid-cols-4 sm:px-4",
        className
      )}
    >
      {children}
    </div>
  );
}

/** Full-width action button sized for AdminCardActionBar grid cells. */
export function AdminCardActionButton({ className, size = "sm", ...props }: ButtonProps) {
  return (
    <Button
      size={size}
      className={cn("w-full min-w-0 justify-center", className)}
      {...props}
    />
  );
}

/** Icon-only action with accessible label + tooltip for compact card footers. */
export function AdminIconActionButton({
  label,
  className,
  children,
  size = "sm",
  variant = "outline",
  ...props
}: ButtonProps & { label: string }) {
  return (
    <Button
      type="button"
      size={size}
      variant={variant}
      className={cn("w-full min-w-0 justify-center px-2", className)}
      aria-label={label}
      title={label}
      {...props}
    >
      {children}
    </Button>
  );
}
