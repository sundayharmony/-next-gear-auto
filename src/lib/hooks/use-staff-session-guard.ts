"use client";

import { useEffect } from "react";
import { useAuth } from "@/lib/context/auth-context";

/** Re-validates JWT on tab focus so revoked manager access clears cached localStorage. */
export function useStaffSessionGuard(enabled: boolean) {
  const { logout } = useAuth();

  useEffect(() => {
    if (!enabled) return;

    async function validate() {
      try {
        const res = await fetch("/api/auth", { credentials: "same-origin" });
        const data = await res.json();
        if (!data.success) {
          await logout();
        }
      } catch {
        // offline — keep cached session
      }
    }

    const onFocus = () => {
      if (!document.hidden) void validate();
    };

    document.addEventListener("visibilitychange", onFocus);
    return () => document.removeEventListener("visibilitychange", onFocus);
  }, [enabled, logout]);
}
