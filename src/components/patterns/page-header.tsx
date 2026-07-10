/**
 * PageHeader Component
 * 
 * Unified page header that replaces:
 * - AdminPageHeader (purple hero bar)
 * - Custom inline page-hero sections
 * - Various header patterns across panels
 * 
 * Provides consistent page title, subtitle, back navigation, and actions.
 */

"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export interface PageHeaderProps {
  /** Page title */
  title: React.ReactNode;
  /** Optional subtitle/description */
  subtitle?: React.ReactNode;
  /** Back link URL */
  backHref?: string;
  /** Back link label */
  backLabel?: string;
  /** Callback for back button (alternative to backHref) */
  onBack?: () => void;
  /** Action buttons to display on the right */
  actions?: React.ReactNode;
  /** Additional content below title */
  children?: React.ReactNode;
  /** Additional CSS classes */
  className?: string;
  /** Header variant */
  variant?: "default" | "compact" | "hero";
  /** Optional icon next to title */
  icon?: LucideIcon;
}

const variantClasses = {
  default: "page-hero page-hero--compact",
  compact: "page-hero page-hero--sm",
  hero: "page-hero page-hero--md",
};

/**
 * Unified page header component for all panels.
 * 
 * @example
 * // Basic usage
 * <PageHeader title="Dashboard" subtitle="Overview of your business" />
 * 
 * @example
 * // With back navigation
 * <PageHeader
 *   title="Booking Details"
 *   backHref="/admin/bookings"
 *   backLabel="Back to Bookings"
 * />
 * 
 * @example
 * // With actions
 * <PageHeader
 *   title="Vehicles"
 *   actions={<Button>Add Vehicle</Button>}
 * />
 */
export function PageHeader({
  title,
  subtitle,
  backHref,
  backLabel = "Back",
  onBack,
  actions,
  children,
  className,
  variant = "default",
  icon: Icon,
}: PageHeaderProps) {
  return (
    <section className={cn(variantClasses[variant], "text-white", className)}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Back navigation */}
        {backHref ? (
          <Link
            href={backHref}
            className="mb-2 inline-flex items-center gap-1 text-sm text-purple-300 transition-colors hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            {backLabel}
          </Link>
        ) : onBack ? (
          <button
            type="button"
            onClick={onBack}
            className="mb-2 inline-flex items-center gap-1 text-sm text-purple-300 transition-colors hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            {backLabel}
          </button>
        ) : null}

        {/* Title row */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <div className="min-w-0">
            <h1 className="flex items-center gap-2 text-2xl font-bold sm:text-3xl">
              {Icon && <Icon className="h-6 w-6 sm:h-7 sm:w-7 shrink-0" aria-hidden />}
              {title}
            </h1>
            {subtitle && (
              <p className="mt-1 text-sm sm:text-base page-hero-subtitle">{subtitle}</p>
            )}
          </div>
          {actions && (
            <div className="flex shrink-0 items-center gap-2">{actions}</div>
          )}
        </div>

        {/* Additional content */}
        {children}
      </div>
    </section>
  );
}

export default PageHeader;
