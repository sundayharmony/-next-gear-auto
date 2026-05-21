"use client";

import { Suspense } from "react";
import { InvoicesPageClient } from "./InvoicesPageClient";

export default function AdminInvoicesPage() {
  return (
    <Suspense fallback={<p className="p-8 text-center text-sm text-gray-500">Loading invoices…</p>}>
      <InvoicesPageClient bookingsHref="/admin/bookings" isAdmin />
    </Suspense>
  );
}
