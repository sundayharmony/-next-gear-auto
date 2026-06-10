"use client";

import { useState } from "react";
import { adminFetch } from "@/lib/utils/admin-fetch";
import { staffKeys, useStaffQuery } from "@/lib/hooks/use-staff-query";

export function useStaffMessageUnreadCount(enabled = true, intervalMs = 15000) {
  const [jitter] = useState(() => intervalMs + Math.random() * 5000);

  const query = useStaffQuery<number>(
    staffKeys.messageUnreadCount(),
    enabled ? "/api/admin/messages/unread-count" : null,
    {
      enabled,
      queryFn: async () => {
        const res = await adminFetch("/api/admin/messages/unread-count");
        const json = await res.json();
        if (!res.ok || !json?.success) return 0;
        if (json.messagingEnabled === false) return 0;
        return typeof json.data?.unreadCount === "number" ? json.data.unreadCount : 0;
      },
      refetchInterval: enabled
        ? () => (typeof document !== "undefined" && document.hidden ? false : jitter)
        : false,
      staleTime: 10_000,
    }
  );

  return query.data ?? 0;
}
