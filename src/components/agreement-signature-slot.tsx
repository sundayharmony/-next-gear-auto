"use client";

import React from "react";
import { CheckCircle2, PenLine } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface AgreementSignatureSlotProps {
  fieldId: string;
  label: string;
  isInitials?: boolean;
  signature: string | null | undefined;
  onClick: (fieldId: string) => void;
  disabled?: boolean;
  highlighted?: boolean;
  className?: string;
}

export function AgreementSignatureSlot({
  fieldId,
  label,
  isInitials = false,
  signature,
  onClick,
  disabled = false,
  highlighted = false,
  className,
}: AgreementSignatureSlotProps) {
  const signed = Boolean(signature);

  return (
    <button
      type="button"
      onClick={() => !disabled && onClick(fieldId)}
      disabled={disabled}
      className={cn(
        "group relative inline-flex items-center justify-center rounded-md border-2 transition-all text-left",
        isInitials ? "h-10 min-w-[72px] max-w-[120px]" : "h-12 min-w-[140px] max-w-[220px] flex-1",
        signed
          ? "border-green-400 bg-green-50/80"
          : highlighted
            ? "border-purple-500 bg-purple-50 ring-2 ring-purple-200"
            : "border-dashed border-purple-300 bg-purple-50/40 hover:border-purple-500 hover:bg-purple-50",
        disabled && "opacity-60 cursor-not-allowed",
        className,
      )}
      aria-label={
        signed
          ? `${label} — signed. Tap to re-apply signature.`
          : `${label} — tap to apply your saved signature`
      }
    >
      {signed && signature ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={signature}
          alt=""
          className={cn(
            "max-h-full max-w-full object-contain px-1",
            isInitials ? "h-8" : "h-10",
          )}
        />
      ) : (
        <span className="flex items-center gap-1 px-2 text-[11px] font-medium text-purple-700">
          <PenLine className="h-3 w-3 shrink-0" />
          {isInitials ? "Tap to initial" : "Tap to sign"}
        </span>
      )}
      {signed && (
        <CheckCircle2
          className="absolute -top-1.5 -right-1.5 h-4 w-4 text-green-600 bg-white rounded-full"
          aria-hidden
        />
      )}
    </button>
  );
}
