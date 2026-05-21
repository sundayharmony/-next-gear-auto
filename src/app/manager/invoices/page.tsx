"use client";

import { Suspense } from "react";
import { InvoicesPageClient } from "@/app/admin/invoices/InvoicesPageClient";

export default function ManagerInvoicesPage() {
  return (
    <Suspense fallback={<p className="p-8 text-center text-sm text-gray-500">Loading invoices…</p>}>
      <InvoicesPageClient bookingsHref="/manager/bookings" />
    </Suspense>
  );
}
