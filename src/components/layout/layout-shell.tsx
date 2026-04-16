"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Header } from "./header";
import { Footer } from "./footer";
import { StaffServiceWorkerBootstrap } from "@/components/messaging/staff-sw-bootstrap";

export function LayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isPanelRoute = pathname.startsWith("/admin") || pathname.startsWith("/manager");
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Detect PWA standalone mode
    const mq = window.matchMedia("(display-mode: standalone)");
    setIsStandalone(mq.matches || ("standalone" in window.navigator && (window.navigator as unknown as { standalone: boolean }).standalone === true));
    const handler = (e: MediaQueryListEvent) => setIsStandalone(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  if (isPanelRoute) {
    // In standalone PWA mode, admin gets no site header/footer at all
    return (
      <div className={isStandalone ? "pwa-safe-top" : ""}>
        <StaffServiceWorkerBootstrap />
        {children}
      </div>
    );
  }

  return (
    <>
      <Header />
      <main id="main-content" className="flex-1">{children}</main>
      <Footer />
    </>
  );
}
