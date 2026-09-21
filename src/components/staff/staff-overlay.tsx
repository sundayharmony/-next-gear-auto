"use client";

import React, { useEffect, useRef } from "react";
import { X } from "lucide-react";
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
  maxWidthClassName = "lg:max-w-lg",
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
    <div className={cn("fixed inset-0 flex overflow-hidden", STAFF_OVERLAY_Z)} role="presentation">
      <button
        type="button"
        className="hidden lg:block flex-1 cursor-default border-0 bg-black/50 p-0"
        onClick={onClose}
        aria-label="Close panel"
        tabIndex={-1}
      />
      <div
        ref={panelRef}
        className={cn(
          "flex h-full w-full min-w-0 flex-col overflow-hidden bg-white shadow-xl outline-none",
          maxWidthClassName,
          panelClassName
        )}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        tabIndex={-1}
      >
        <div className="nga-overlay-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain">
          {children}
        </div>
      </div>
    </div>
  );
}

export interface StaffPanelHeaderProps {
  title: React.ReactNode;
  onClose: () => void;
  leading?: React.ReactNode;
}

/** Fixed panel header with safe-area padding for full-screen mobile drawers. */
export function StaffPanelHeader({ title, onClose, leading }: StaffPanelHeaderProps) {
  return (
    <div
      className="sticky top-0 z-10 shrink-0 border-b border-gray-200 bg-white px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top,0px))] lg:pt-3"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          {leading}
          <h2 className="truncate text-lg font-semibold text-gray-900">{title}</h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="nga-overlay-close -mr-1 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full hover:bg-gray-100"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>
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
export interface StaffInlineOverlayProps {
  open: boolean;
  onClose?: () => void;
  children: React.ReactNode;
  className?: string;
  backdropClassName?: string;
  elevated?: boolean;
  ariaLabel?: string;
}

/** Lightweight confirm/lightbox layer above the staff tab bar. */
export function StaffInlineOverlay({
  open,
  onClose,
  children,
  className,
  backdropClassName = "bg-black/50",
  elevated = false,
  ariaLabel,
}: StaffInlineOverlayProps) {
  useLockBodyScroll(open);
  if (!open) return null;

  return (
    <div
      className={cn(
        "fixed inset-0 flex items-center justify-center p-4",
        elevated ? "z-[120]" : STAFF_OVERLAY_Z,
        backdropClassName
      )}
      role="presentation"
      onClick={onClose}
    >
      <div
        className={cn("outline-none", className)}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

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
        "fixed inset-0 flex items-end justify-center bg-black/50 lg:items-center lg:p-4",
        elevated ? "z-[120]" : STAFF_OVERLAY_Z
      )}
      onClick={backdropClose}
      role="presentation"
    >
      <div
        ref={dialogRef}
        className={cn(
          "flex w-full max-h-[min(92dvh,100%)] min-h-0 flex-col overflow-hidden bg-white shadow-xl outline-none",
          "rounded-t-2xl pb-[max(0.5rem,env(safe-area-inset-bottom))] lg:max-w-lg lg:rounded-xl lg:pb-0",
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
