/**
 * PageBody Component
 * 
 * Unified page content wrapper that provides consistent:
 * - Max width container
 * - Horizontal padding
 * - Vertical spacing
 * - Section gaps
 * 
 * Replaces AdminPageBody and various PageContainer usages.
 */

import * as React from "react";
import { cn } from "@/lib/utils/cn";

export interface PageBodyProps {
  children: React.ReactNode;
  /** Additional CSS classes */
  className?: string;
  /** Use narrower max-width (for forms, legal pages) */
  narrow?: boolean;
  /** Remove default padding (for custom layouts) */
  noPadding?: boolean;
}

/**
 * Page body content wrapper with consistent spacing.
 * 
 * @example
 * // Basic usage
 * <PageBody>
 *   <Section title="Overview">...</Section>
 * </PageBody>
 * 
 * @example
 * // Narrow width for forms
 * <PageBody narrow>
 *   <Form>...</Form>
 * </PageBody>
 */
export function PageBody({ 
  children, 
  className, 
  narrow = false,
  noPadding = false,
}: PageBodyProps) {
  return (
    <main
      className={cn(
        "mx-auto w-full",
        narrow ? "max-w-4xl" : "max-w-7xl",
        !noPadding && "px-4 py-6 sm:px-6 sm:py-8 lg:px-8",
        "space-y-6",
        className
      )}
    >
      {children}
    </main>
  );
}

export default PageBody;
