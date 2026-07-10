/**
 * Section Component
 * 
 * Unified section component for grouping related content.
 * Provides consistent title, description, and action patterns.
 * 
 * Replaces AdminSection and various inline section patterns.
 */

import * as React from "react";
import { cn } from "@/lib/utils/cn";
import { type LucideIcon } from "lucide-react";

export interface SectionProps {
  /** Section title */
  title?: string;
  /** Section description */
  description?: string;
  /** Icon displayed before title */
  icon?: LucideIcon;
  /** Action buttons displayed on the right */
  actions?: React.ReactNode;
  /** Section content */
  children: React.ReactNode;
  /** Additional CSS classes */
  className?: string;
  /** Remove default spacing between title and content */
  compact?: boolean;
}

/**
 * Section component for grouping content with optional header.
 * 
 * @example
 * // Basic section
 * <Section title="Recent Bookings">
 *   <BookingList />
 * </Section>
 * 
 * @example
 * // Section with icon and actions
 * <Section
 *   title="Vehicles"
 *   icon={Car}
 *   actions={<Button size="sm">Add Vehicle</Button>}
 * >
 *   <VehicleGrid />
 * </Section>
 * 
 * @example
 * // Section with description
 * <Section
 *   title="Maintenance"
 *   description="Track vehicle maintenance and repairs"
 * >
 *   <MaintenanceList />
 * </Section>
 */
export function Section({
  title,
  description,
  icon: Icon,
  actions,
  children,
  className,
  compact = false,
}: SectionProps) {
  const hasHeader = title || actions;

  return (
    <section className={cn(compact ? "space-y-2" : "space-y-4", className)}>
      {hasHeader && (
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            {title && (
              <h2
                className={cn(
                  "text-base font-semibold text-gray-900",
                  Icon && "flex items-center gap-2"
                )}
              >
                {Icon && (
                  <Icon className="h-4 w-4 shrink-0 text-purple-600" aria-hidden />
                )}
                {title}
              </h2>
            )}
            {description && (
              <p className="mt-0.5 text-sm text-gray-500">{description}</p>
            )}
          </div>
          {actions && (
            <div className="flex shrink-0 items-center gap-2">{actions}</div>
          )}
        </div>
      )}
      {children}
    </section>
  );
}

export default Section;
