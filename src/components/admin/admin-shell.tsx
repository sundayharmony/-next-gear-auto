import React from "react";
import Link from "next/link";
import { ArrowLeft, type LucideIcon } from "lucide-react";
import { PageContainer } from "@/components/layout/page-container";
import { cn } from "@/lib/utils/cn";

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

interface AdminPageHeaderProps {
  title: string;
  subtitle?: string;
  backHref?: string;
  backLabel?: string;
  actions?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}

export function AdminPageHeader({
  title,
  subtitle,
  backHref,
  backLabel = "Back",
  actions,
  children,
  className,
}: AdminPageHeaderProps) {
  return (
    <section className={cn("page-hero page-hero--compact text-white", className)}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {backHref ? (
          <Link
            href={backHref}
            className="mb-2 inline-flex items-center gap-1 text-sm text-purple-300 transition-colors hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            {backLabel}
          </Link>
        ) : null}
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold sm:text-3xl">{title}</h1>
            {subtitle ? (
              <p className="mt-1 text-sm sm:text-base page-hero-subtitle">{subtitle}</p>
            ) : null}
          </div>
          {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
        </div>
        {children}
      </div>
    </section>
  );
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

interface AdminSectionProps {
  title?: string;
  description?: string;
  icon?: LucideIcon;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

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

interface AdminStatCardProps {
  label: string;
  value: React.ReactNode;
  icon: LucideIcon;
  iconClassName?: string;
  iconBgClassName?: string;
}

export function AdminStatCard({
  label,
  value,
  icon: Icon,
  iconClassName = "text-purple-600",
  iconBgClassName = "bg-purple-50",
}: AdminStatCardProps) {
  return (
    <AdminCard padding="sm" className="h-full">
      <div className="flex items-center gap-3">
        <div className={cn("rounded-lg p-2.5", iconBgClassName, iconClassName)}>
          <Icon className="h-5 w-5" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xl font-bold text-gray-900 tabular-nums">{value}</p>
          <p className="truncate text-xs text-gray-500">{label}</p>
        </div>
      </div>
    </AdminCard>
  );
}
