/**
 * Skeleton Components
 * 
 * Unified skeleton loading components for consistent loading states.
 * Consolidates ui/Skeleton and admin/Skeleton into one source.
 */

import * as React from "react";
import { cn } from "@/lib/utils/cn";

/**
 * Base skeleton block
 */
function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-lg bg-gray-200", className)}
      {...props}
    />
  );
}

/**
 * Skeleton text line
 */
function SkeletonText({ 
  className, 
  width = "w-full",
  ...props 
}: React.HTMLAttributes<HTMLDivElement> & { width?: string }) {
  return (
    <Skeleton className={cn("h-4", width, className)} {...props} />
  );
}

/**
 * Skeleton circle (for avatars)
 */
function SkeletonCircle({ 
  className,
  size = "h-10 w-10",
  ...props 
}: React.HTMLAttributes<HTMLDivElement> & { size?: string }) {
  return (
    <Skeleton className={cn("rounded-full", size, className)} {...props} />
  );
}

/**
 * Skeleton card
 */
function SkeletonCard({ 
  className,
  children,
  ...props 
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div 
      className={cn(
        "rounded-xl border border-gray-100 bg-white p-4 space-y-3",
        className
      )}
      {...props}
    >
      {children ?? (
        <>
          <div className="flex items-center gap-3">
            <SkeletonCircle />
            <div className="flex-1 space-y-2">
              <SkeletonText width="w-32" />
              <SkeletonText width="w-24" className="h-3" />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/**
 * Dashboard skeleton preset
 */
function DashboardSkeleton() {
  return (
    <div className="animate-in fade-in duration-200">
      {/* Header skeleton */}
      <div className="page-hero page-hero--compact px-4">
        <Skeleton className="h-7 w-44 bg-white/10 rounded-lg" />
        <Skeleton className="h-4 w-56 bg-white/10 rounded-lg mt-2" />
      </div>

      <div className="px-4 py-6 space-y-6">
        {/* Stat cards */}
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i}>
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <SkeletonText width="w-16" className="h-5" />
                  <SkeletonText width="w-20" className="h-3" />
                </div>
              </div>
            </SkeletonCard>
          ))}
        </div>

        {/* List items */}
        <div className="space-y-2.5">
          <SkeletonText width="w-32" className="h-5" />
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonCard key={i}>
              <div className="flex items-center justify-between">
                <div className="space-y-2 flex-1">
                  <SkeletonText width="w-36" />
                  <SkeletonText width="w-24" className="h-3" />
                </div>
                <SkeletonText width="w-16" className="h-5" />
              </div>
              <div className="flex gap-2">
                <Skeleton className="h-6 w-28 rounded-md" />
                <Skeleton className="h-6 w-28 rounded-md" />
              </div>
            </SkeletonCard>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * List/table skeleton preset
 */
function ListSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="animate-in fade-in duration-200 space-y-4">
      {/* Search + filters */}
      <div className="flex gap-3">
        <Skeleton className="h-10 flex-1 rounded-lg" />
        <Skeleton className="h-10 w-24 rounded-lg" />
      </div>

      {/* Status pills */}
      <div className="flex gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-20 rounded-full" />
        ))}
      </div>

      {/* List items */}
      <div className="space-y-2">
        {Array.from({ length: rows }).map((_, i) => (
          <SkeletonCard key={i}>
            <div className="flex items-center justify-between">
              <div className="space-y-2 flex-1">
                <SkeletonText width="w-40" />
                <SkeletonText width="w-28" className="h-3" />
              </div>
              <Skeleton className="h-6 w-16 rounded-full" />
            </div>
          </SkeletonCard>
        ))}
      </div>
    </div>
  );
}

/**
 * Table skeleton preset
 */
function TableSkeleton({ rows = 5, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="animate-in fade-in duration-200 rounded-xl border border-gray-200 bg-white overflow-hidden">
      {/* Header */}
      <div className="border-b border-gray-100 bg-gray-50 px-4 py-3">
        <div className="flex gap-4">
          {Array.from({ length: cols }).map((_, i) => (
            <SkeletonText key={i} width={i === 0 ? "w-32" : "w-20"} className="h-4" />
          ))}
        </div>
      </div>
      
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="border-b border-gray-100 last:border-0 px-4 py-3">
          <div className="flex gap-4 items-center">
            {Array.from({ length: cols }).map((_, colIndex) => (
              <SkeletonText 
                key={colIndex} 
                width={colIndex === 0 ? "w-32" : colIndex === cols - 1 ? "w-16" : "w-20"} 
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Stat grid skeleton preset
 */
function StatGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i}>
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-lg" />
            <div className="flex-1 space-y-2">
              <SkeletonText width="w-16" className="h-6" />
              <SkeletonText width="w-20" className="h-3" />
            </div>
          </div>
        </SkeletonCard>
      ))}
    </div>
  );
}

export { 
  Skeleton, 
  SkeletonText, 
  SkeletonCircle, 
  SkeletonCard,
  DashboardSkeleton, 
  ListSkeleton,
  TableSkeleton,
  StatGridSkeleton,
};
