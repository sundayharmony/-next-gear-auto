"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

export function StaffServiceWorkerBootstrap() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname.startsWith("/admin") && !pathname.startsWith("/manager")) return;
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Best-effort only: the app remains usable without SW registration.
    });
  }, [pathname]);

  return null;
}
