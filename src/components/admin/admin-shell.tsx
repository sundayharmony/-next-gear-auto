/**
 * Admin Shell Components
 * 
 * Admin-specific wrappers around the base pattern components.
 * Provides backward compatibility while using the unified design system.
 * 
 * For new code, consider using @/components/patterns directly.
 */

import React from "react";
import Link from "next/link";
import { type LucideIcon } from "lucide-react";
import { PageContainer } from "@/components/layout/page-container";
import { cn } from "@/lib/utils/cn";
import { 
  PageHeader, 
  type PageHeaderProps,
} from "@/components/patterns";

/**
 * Admin panel UI conventions:
 * - Page body: `AdminPageBody` → py-6 sm:py-8, space-y-6
 * - Page title: text-2xl sm:text-3xl font-bold (hero)
 * - Section title: text-base font-semibold text-gray-900
 * - Muted copy: text-sm text-gray-500
 * - Cards: rounded-xl border border-gray-200/80 bg-white shadow-sm, p-5
 */

export const adminCardClass =
  "rounded-xl border border-gray-200/80 bg-white shadow-sm";

export const adminSectionTitleClass = "text-base font-semibold text-gray-900";

export const adminMutedClass = "text-sm text-gray-500";

/** List row inside admin cards — readable in light and dark admin themes */
export const adminListItemClass =
  "admin-list-item rounded-xl border border-gray-200/80 bg-gray-100 p-4 transition-colors hover:border-purple-200/80 hover:bg-purple-50/50";

export interface AdminPageHeaderProps extends Omit<PageHeaderProps, 'variant'> {}

/**
 * Admin page header - wrapper around the base PageHeader.
 * Uses the default variant styling for admin panels.
 */
export function AdminPageHeader(props: AdminPageHeaderProps) {
  return <PageHeader {...props} />;
}

interface AdminPageBodyProps {
  children: React.ReactNode;
  className?: string;
  narrow?: boolean;
}

export function AdminPageBody({ children, className, narrow }: AdminPageBodyProps) {
  return (
    <PageContainer className={cn("space-y-6 py-6 sm:py-8", className)} narrow={narrow}>
      {children}
    </PageContainer>
  );
}

interface AdminCardProps {
  children: React.ReactNode;
  className?: string;
  padding?: "none" | "sm" | "md";
  hover?: boolean;
  as?: "div" | "article";
}

export function AdminCard({
  children,
  className,
  padding = "md",
  hover = false,
  as: Tag = "div",
}: AdminCardProps) {
  const paddingClass =
    padding === "none" ? "" : padding === "sm" ? "p-4" : "p-5";

  return (
    <Tag
      className={cn(
        adminCardClass,
        paddingClass,
        hover && "transition-shadow duration-200 hover:shadow-md",
        className
      )}
    >
      {children}
    </Tag>
  );
}

export interface AdminSectionProps {
  title?: string;
  description?: string;
  icon?: LucideIcon;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

/**
 * Admin section - groups content with optional title and actions.
 * Uses the design system Section pattern internally.
 */
export function AdminSection({
  title,
  description,
  icon: Icon,
  actions,
  children,
  className,
}: AdminSectionProps) {
  return (
    <section className={cn("space-y-4", className)}>
      {(title || actions) && (
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            {title ? (
              <h2
                className={cn(
                  adminSectionTitleClass,
                  Icon && "flex items-center gap-2"
                )}
              >
                {Icon ? <Icon className="h-4 w-4 shrink-0 text-purple-600" aria-hidden /> : null}
                {title}
              </h2>
            ) : null}
            {description ? (
              <p className={cn(adminMutedClass, "mt-0.5")}>{description}</p>
            ) : null}
          </div>
          {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
        </div>
      )}
      {children}
    </section>
  );
}

interface AdminTableWrapProps {
  children: React.ReactNode;
  className?: string;
}

/** Wraps tables with consistent card chrome and row hover. */
export function AdminTableWrap({ children, className }: AdminTableWrapProps) {
  return (
    <div className={cn(adminCardClass, "overflow-hidden", className)}>
      <div className="admin-table-wrap overflow-x-auto">{children}</div>
    </div>
  );
}

export interface AdminStatCardProps {
  label: string;
  value: React.ReactNode;
  icon: LucideIcon;
  iconClassName?: string;
  iconBgClassName?: string;
  href?: string;
}

/**
 * Admin stat card - displays a KPI/metric with icon.
 * Uses the design system StatCard pattern internally.
 */
export function AdminStatCard({
  label,
  value,
  icon: Icon,
  iconClassName = "text-purple-600",
  iconBgClassName = "bg-purple-50",
  href,
}: AdminStatCardProps) {
  const content = (
    <div className="flex items-center gap-3">
      <div className={cn("rounded-lg p-2.5", iconBgClassName, iconClassName)}>
        <Icon className="h-5 w-5" aria-hidden />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xl font-bold text-gray-900 tabular-nums">{value}</p>
        <p className="truncate text-xs text-gray-500">{label}</p>
      </div>
    </div>
  );

  if (!href) {
    return (
      <AdminCard padding="sm" className="h-full">
        {content}
      </AdminCard>
    );
  }

  return (
    <Link
      href={href}
      className="block h-full rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2"
    >
      <AdminCard
        padding="sm"
        hover
        className="h-full cursor-pointer admin-card-press transition-all hover:border-purple-200/80"
      >
        {content}
      </AdminCard>
    </Link>
  );
}
