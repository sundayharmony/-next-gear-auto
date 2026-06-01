"use client";

import React, { useState } from "react";
import { KeyRound, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { adminFetch } from "@/lib/utils/admin-fetch";
import { useNotification } from "@/lib/context/notification-context";

interface SendPasswordEmailButtonProps {
  ownerId: string;
  ownerEmail: string;
  accountActivated?: boolean;
  variant?: "default" | "secondary" | "outline" | "ghost";
  size?: "default" | "sm" | "lg";
  className?: string;
  fullWidth?: boolean;
}

export function SendPasswordEmailButton({
  ownerId,
  ownerEmail,
  accountActivated,
  variant = "outline",
  size = "sm",
  className,
  fullWidth,
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
      const res = await adminFetch(
        `/api/admin/owners/${encodeURIComponent(ownerId)}/send-password-email`,
        { method: "POST" }
      );
      const json = await res.json();
      if (json.success) {
        showToast(
          "success",
          accountActivated ? "Reset email sent" : "Setup email sent",
          json.message || `Email sent to ${ownerEmail}`
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

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      className={`${fullWidth ? "w-full" : ""} border-blue-300 text-blue-600 hover:bg-blue-50 ${className ?? ""}`}
      onClick={send}
      disabled={sending}
    >
      {sending ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <KeyRound className="h-4 w-4" />
      )}
      {sending ? sendingLabel : label}
    </Button>
  );
}
