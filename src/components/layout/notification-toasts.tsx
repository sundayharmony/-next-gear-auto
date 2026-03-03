"use client";

import { useNotification } from "@/lib/context/notification-context";
import { ToastContainer, ToastNotification } from "@/components/ui/toast";

export function NotificationToasts() {
  const { toasts, dismissToast } = useNotification();

  return (
    <ToastContainer>
      {toasts.map((toast) => (
        <ToastNotification key={toast.id} {...toast} onDismiss={dismissToast} />
      ))}
    </ToastContainer>
  );
}
