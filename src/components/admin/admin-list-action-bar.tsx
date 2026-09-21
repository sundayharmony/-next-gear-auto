"use client";

import * as React from "react";
import { Button, type ButtonProps } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";

/**
 * Horizontal action cluster for admin list rows (managers, customers, etc.).
 * Stacks on narrow screens and aligns end-to-end on larger breakpoints.
 */
export function AdminListActionBar({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:flex-wrap sm:justify-end",
        className
      )}
    >
      {children}
    </div>
  );
}

/** List-row action button that fills grid cells on mobile. */
export function AdminListActionButton({ className, size = "sm", ...props }: ButtonProps) {
  return (
    <Button
      size={size}
      className={cn("w-full min-w-0 justify-center sm:w-auto", className)}
      {...props}
    />
  );
}
