/**
 * Breadcrumbs Component
 * 
 * Accessible breadcrumb navigation for hierarchical page structure.
 */

"use client";

import * as React from "react";
import Link from "next/link";
import { ChevronRight, Home } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export interface BreadcrumbsProps {
  /** Breadcrumb items */
  items: BreadcrumbItem[];
  /** Home link (defaults to '/') */
  homeHref?: string;
  /** Show home icon */
  showHome?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Breadcrumb navigation component.
 * 
 * @example
 * <Breadcrumbs
 *   items={[
 *     { label: "Bookings", href: "/admin/bookings" },
 *     { label: "Booking #123" },
 *   ]}
 * />
 */
export function Breadcrumbs({
  items,
  homeHref = "/",
  showHome = true,
  className,
}: BreadcrumbsProps) {
  return (
    <nav
      aria-label="Breadcrumb"
      className={cn("flex items-center text-sm text-gray-500", className)}
    >
      <ol className="flex items-center gap-1">
        {showHome && (
          <li className="flex items-center">
            <Link
              href={homeHref}
              className="hover:text-gray-700 transition-colors"
              aria-label="Home"
            >
              <Home className="h-4 w-4" />
            </Link>
            <ChevronRight className="h-4 w-4 mx-1 text-gray-300" aria-hidden />
          </li>
        )}
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <li key={item.label} className="flex items-center">
              {item.href && !isLast ? (
                <Link
                  href={item.href}
                  className="hover:text-gray-700 transition-colors"
                >
                  {item.label}
                </Link>
              ) : (
                <span
                  className={isLast ? "font-medium text-gray-900" : ""}
                  aria-current={isLast ? "page" : undefined}
                >
                  {item.label}
                </span>
              )}
              {!isLast && (
                <ChevronRight
                  className="h-4 w-4 mx-1 text-gray-300"
                  aria-hidden
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export default Breadcrumbs;
