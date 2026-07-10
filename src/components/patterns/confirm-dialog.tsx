/**
 * ConfirmDialog Component
 * 
 * Reusable confirmation dialog for destructive or important actions.
 * Wraps Modal component with standard confirm/cancel pattern.
 */

"use client";

import * as React from "react";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalDescription,
} from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";
import { AlertTriangle, Info, AlertCircle, CheckCircle, type LucideIcon } from "lucide-react";

export interface ConfirmDialogProps {
  /** Whether the dialog is open */
  open: boolean;
  /** Close handler */
  onOpenChange: (open: boolean) => void;
  /** Dialog title */
  title: string;
  /** Dialog description/message */
  description?: React.ReactNode;
  /** Confirm button text */
  confirmLabel?: string;
  /** Cancel button text */
  cancelLabel?: string;
  /** Confirm action handler */
  onConfirm: () => void | Promise<void>;
  /** Cancel action handler */
  onCancel?: () => void;
  /** Dialog variant */
  variant?: "default" | "danger" | "warning" | "success";
  /** Whether confirm action is loading */
  loading?: boolean;
  /** Additional CSS classes for content */
  className?: string;
}

const variantConfig: Record<
  NonNullable<ConfirmDialogProps["variant"]>,
  { icon: LucideIcon; iconClass: string; buttonVariant: "default" | "danger" }
> = {
  default: {
    icon: Info,
    iconClass: "text-blue-500 bg-blue-50",
    buttonVariant: "default",
  },
  danger: {
    icon: AlertTriangle,
    iconClass: "text-red-500 bg-red-50",
    buttonVariant: "danger",
  },
  warning: {
    icon: AlertCircle,
    iconClass: "text-amber-500 bg-amber-50",
    buttonVariant: "default",
  },
  success: {
    icon: CheckCircle,
    iconClass: "text-green-500 bg-green-50",
    buttonVariant: "default",
  },
};

/**
 * Confirmation dialog for important actions.
 * 
 * @example
 * // Danger confirmation
 * <ConfirmDialog
 *   open={showDelete}
 *   onOpenChange={setShowDelete}
 *   title="Delete Booking"
 *   description="Are you sure you want to delete this booking? This action cannot be undone."
 *   variant="danger"
 *   confirmLabel="Delete"
 *   onConfirm={handleDelete}
 * />
 * 
 * @example
 * // Standard confirmation
 * <ConfirmDialog
 *   open={showConfirm}
 *   onOpenChange={setShowConfirm}
 *   title="Confirm Changes"
 *   description="Do you want to save these changes?"
 *   onConfirm={handleSave}
 * />
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  onConfirm,
  onCancel,
  variant = "default",
  loading = false,
  className,
}: ConfirmDialogProps) {
  const config = variantConfig[variant];
  const Icon = config.icon;

  const handleCancel = () => {
    onCancel?.();
    onOpenChange(false);
  };

  const handleConfirm = async () => {
    await onConfirm();
    onOpenChange(false);
  };

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent className={cn("sm:max-w-md", className)}>
        <div className="flex gap-4">
          <div
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
              config.iconClass
            )}
          >
            <Icon className="h-5 w-5" aria-hidden />
          </div>
          <div className="flex-1">
            <ModalHeader className="p-0">
              <ModalTitle>{title}</ModalTitle>
              {description && (
                <ModalDescription className="mt-2">
                  {description}
                </ModalDescription>
              )}
            </ModalHeader>
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <Button
            variant="ghost"
            onClick={handleCancel}
            disabled={loading}
          >
            {cancelLabel}
          </Button>
          <Button
            variant={config.buttonVariant}
            onClick={handleConfirm}
            loading={loading}
          >
            {confirmLabel}
          </Button>
        </div>
      </ModalContent>
    </Modal>
  );
}

export default ConfirmDialog;
