"use client";

import React, { useEffect, useRef } from "react";
import { cn } from "@/lib/utils/cn";
import { STAFF_OVERLAY_Z } from "@/components/staff/staff-overlay-z";

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

/** Right-side staff drawer above bottom tab bar (z-[100]). */
export function StaffSidePanel({
  onClose,
  ariaLabel,
  children,
  panelClassName,
  maxWidthClassName = "sm:max-w-lg",
}: StaffSidePanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);

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
    <div className={cn("fixed inset-0 flex", STAFF_OVERLAY_Z)} role="presentation">
      <button
        type="button"
        className="flex-1 cursor-default bg-black/50"
        onClick={onClose}
        aria-label="Close panel"
        tabIndex={-1}
      />
      <div
        ref={panelRef}
        className={cn(
          "w-full max-w-[calc(100vw-1rem)] bg-white shadow-xl overflow-y-auto outline-none",
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

/** Centered staff modal above bottom tab bar (z-[100]). */
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
        "fixed inset-0 flex items-center justify-center bg-black/50 p-4",
        elevated ? "z-[120]" : STAFF_OVERLAY_Z
      )}
      onClick={backdropClose}
      role="presentation"
    >
      <div
        ref={dialogRef}
        className={cn("bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto outline-none", className)}
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
