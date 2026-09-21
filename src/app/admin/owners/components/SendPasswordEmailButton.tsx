"use client";

import React, { useState } from "react";
import { KeyRound, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { adminFetch } from "@/lib/utils/admin-fetch";
import { useNotification } from "@/lib/context/notification-context";
import { cn } from "@/lib/utils/cn";

interface SendPasswordEmailButtonProps {
  userId: string;
  userEmail: string;
  apiPath: string;
  accountActivated?: boolean;
  variant?: "default" | "secondary" | "outline" | "ghost";
  size?: "default" | "sm" | "lg";
  className?: string;
  /** Icon-only for compact card/list footers (label becomes aria-label + title). */
  iconOnly?: boolean;
}

export function SendPasswordEmailButton({
  userId,
  userEmail,
  apiPath,
  accountActivated,
  variant = "outline",
  size = "sm",
  className,
  iconOnly = false,
}: SendPasswordEmailButtonProps) {
  const { showToast } = useNotification();
  const [sending, setSending] = useState(false);

  const label = accountActivated ? "Send reset email" : "Send setup email";
  const sendingLabel = accountActivated ? "Sending reset..." : "Sending setup...";

  const send = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setSending(true);
    try {
      const res = await adminFetch(apiPath, { method: "POST" });
      const json = await res.json();
      if (json.success) {
        showToast(
          "success",
          accountActivated ? "Reset email sent" : "Setup email sent",
          json.message || `Email sent to ${userEmail}`
        );
      } else {
        showToast("error", "Send failed", json.message || "Could not send password email.");
      }
    } catch {
      showToast("error", "Send failed", "Network error.");
    } finally {
      setSending(false);
    }
  };

  const activeLabel = sending ? sendingLabel : label;

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      className={cn(
        "border-blue-300 text-blue-600 hover:bg-blue-50",
        iconOnly ? "w-full min-w-0 justify-center px-2" : "w-full min-w-0 justify-center sm:w-auto",
        className
      )}
      onClick={send}
      disabled={sending}
      aria-label={activeLabel}
      title={activeLabel}
    >
      {sending ? (
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
      ) : (
        <KeyRound className="h-4 w-4" aria-hidden />
      )}
      {!iconOnly ? <span className="truncate">{activeLabel}</span> : null}
    </Button>
  );
}
