"use client";

import { Suspense } from "react";
import { InvoicesPageClient } from "@/app/admin/invoices/InvoicesPageClient";
import { managerPanelConfig } from "@/lib/admin/staff-panel-config";

export default function ManagerInvoicesPage() {
  return (
    <Suspense fallback={<p className="p-8 text-center text-sm text-gray-500">Loading invoices…</p>}>
      <InvoicesPageClient bookingsHref={`${managerPanelConfig.panelBase}/bookings`} />
    </Suspense>
  );
}
