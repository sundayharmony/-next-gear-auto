/**
 * CardList Component
 * 
 * Unified clickable card list for displaying items.
 * Replaces various inline card list patterns used for:
 * - Bookings (recent bookings on dashboard)
 * - Tickets
 * - Reviews
 * - Notifications
 */

"use client";

import * as React from "react";
import { cn } from "@/lib/utils/cn";
import { ChevronRight } from "lucide-react";

export interface CardListItem {
  id: string;
  [key: string]: unknown;
}

export interface CardListProps<T extends CardListItem> {
  /** Items to display */
  items: T[];
  /** Render function for each item */
  renderItem: (item: T, index: number) => React.ReactNode;
  /** Click handler for items */
  onItemClick?: (item: T) => void;
  /** Additional CSS classes */
  className?: string;
  /** Gap between items */
  gap?: "sm" | "default" | "lg";
  /** Show chevron indicator on clickable items */
  showChevron?: boolean;
  /** Empty state content */
  emptyState?: React.ReactNode;
  /** Loading state */
  loading?: boolean;
  /** Loading skeleton count */
  loadingCount?: number;
}

const gapClasses = {
  sm: "space-y-2",
  default: "space-y-3",
  lg: "space-y-4",
};

/**
 * Clickable card list for displaying items.
 * 
 * @example
 * <CardList
 *   items={bookings}
 *   onItemClick={(booking) => openDetail(booking.id)}
 *   renderItem={(booking) => (
 *     <>
 *       <div className="font-medium">{booking.vehicleName}</div>
 *       <div className="text-sm text-gray-500">{booking.dates}</div>
 *     </>
 *   )}
 * />
 */
export function CardList<T extends CardListItem>({
  items,
  renderItem,
  onItemClick,
  className,
  gap = "default",
  showChevron = false,
  emptyState,
  loading = false,
  loadingCount = 3,
}: CardListProps<T>) {
  if (loading) {
    return (
      <div className={cn(gapClasses[gap], className)}>
        {Array.from({ length: loadingCount }).map((_, i) => (
          <div
            key={i}
            className="animate-pulse rounded-xl border border-gray-100 bg-white p-4"
          >
            <div className="flex items-center justify-between">
              <div className="space-y-2 flex-1">
                <div className="h-4 w-40 bg-gray-200 rounded" />
                <div className="h-3 w-28 bg-gray-200 rounded" />
              </div>
              <div className="h-6 w-16 bg-gray-200 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (items.length === 0 && emptyState) {
    return <>{emptyState}</>;
  }

  return (
    <div className={cn(gapClasses[gap], className)}>
      {items.map((item, index) => {
        const isClickable = Boolean(onItemClick);
        const content = (
          <div className="flex items-center gap-3">
            <div className="flex-1 min-w-0">{renderItem(item, index)}</div>
            {showChevron && isClickable && (
              <ChevronRight className="h-5 w-5 shrink-0 text-gray-400" />
            )}
          </div>
        );

        if (isClickable) {
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onItemClick?.(item)}
              className={cn(
                "w-full text-left rounded-xl border border-gray-200 bg-white p-4",
                "transition-colors hover:border-purple-200 hover:bg-purple-50/30",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500"
              )}
            >
              {content}
            </button>
          );
        }

        return (
          <div
            key={item.id}
            className="rounded-xl border border-gray-200 bg-white p-4"
          >
            {content}
          </div>
        );
      })}
    </div>
  );
}

export default CardList;
