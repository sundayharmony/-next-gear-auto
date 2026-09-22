"use client";

import { usePathname } from "next/navigation";
import { Header } from "./header";
import { Footer } from "./footer";
import { StaffServiceWorkerBootstrap } from "@/components/messaging/staff-sw-bootstrap";

export function LayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isPanelRoute =
    pathname.startsWith("/admin") ||
    pathname.startsWith("/manager") ||
    pathname.startsWith("/owner");

  if (isPanelRoute) {
    // Panel chrome (StaffPanelShell) owns top safe-area padding — do not add it here
    // or standalone PWA shows a black band above the header bar.
    return (
      <div className="h-dvh min-h-0 overflow-hidden lg:h-screen">
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
