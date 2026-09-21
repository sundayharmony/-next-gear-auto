"use client";

import React, { useEffect, useRef } from "react";
import { cn } from "@/lib/utils/cn";
import { STAFF_OVERLAY_Z } from "@/components/staff/staff-overlay-z";
import { useLockBodyScroll } from "@/lib/hooks/use-lock-body-scroll";

function getFocusable(container: HTMLElement): HTMLElement[] {
  return Array.from(
    container.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
    )
  ).filter((el) => !el.hasAttribute("disabled") && el.offsetParent !== null);
}

export interface StaffSidePanelProps {
  onClose: () => void;
  ariaLabel: string;
  children: React.ReactNode;
  panelClassName?: string;
  maxWidthClassName?: string;
}

/** Right-side staff drawer above bottom tab bar (z-[100]). Full-screen sheet on phones. */
export function StaffSidePanel({
  onClose,
  ariaLabel,
  children,
  panelClassName,
  maxWidthClassName = "sm:max-w-lg",
}: StaffSidePanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  useLockBodyScroll(true);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key !== "Tab" || !panelRef.current) return;
      const focusable = getFocusable(panelRef.current);
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    panelRef.current?.focus();
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div className={cn("fixed inset-0 flex flex-col justify-end sm:flex-row sm:justify-end", STAFF_OVERLAY_Z)} role="presentation">
      <button
        type="button"
        className="absolute inset-0 cursor-default bg-black/50 sm:static sm:flex-1"
        onClick={onClose}
        aria-label="Close panel"
        tabIndex={-1}
      />
      <div
        ref={panelRef}
        className={cn(
          "nga-overlay-scroll relative z-10 w-full max-h-[min(92dvh,100%)] overflow-y-auto overscroll-contain bg-white shadow-xl outline-none",
          "rounded-t-2xl sm:h-full sm:max-h-none sm:rounded-none",
          maxWidthClassName,
          panelClassName
        )}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        tabIndex={-1}
      >
        {children}
      </div>
    </div>
  );
}

export interface StaffCenterModalProps {
  onClose: () => void;
  ariaLabel: string;
  children: React.ReactNode;
  className?: string;
  /** Nested modals (e.g. invoice over booking detail) need a higher stack. */
  elevated?: boolean;
  onBackdropClick?: () => void;
}

/** Centered staff modal above bottom tab bar (z-[100]). Bottom sheet on phones. */
export function StaffCenterModal({
  onClose,
  ariaLabel,
  children,
  className,
  elevated = false,
  onBackdropClick,
}: StaffCenterModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const backdropClose = onBackdropClick ?? onClose;
  useLockBodyScroll(true);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    dialogRef.current?.focus();
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div
      className={cn(
        "fixed inset-0 flex items-end justify-center bg-black/50 sm:items-center sm:p-4",
        elevated ? "z-[120]" : STAFF_OVERLAY_Z
      )}
      onClick={backdropClose}
      role="presentation"
    >
      <div
        ref={dialogRef}
        className={cn(
          "flex w-full max-h-[min(92dvh,100%)] min-h-0 flex-col overflow-hidden bg-white shadow-xl outline-none",
          "rounded-t-2xl pb-[max(0.5rem,env(safe-area-inset-bottom))] sm:max-w-lg sm:rounded-xl sm:pb-0",
          className
        )}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}
