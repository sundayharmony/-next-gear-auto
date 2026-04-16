"use client";

import React, { Suspense } from "react";
import { SharedBookingsPage } from "./shared-bookings-page";
import { adminBookingsConfig } from "./config";

export default function AdminBookingsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-24">
          <div role="status" aria-label="Loading bookings" className="animate-spin h-8 w-8 border-4 border-purple-600 border-t-transparent rounded-full" />
        </div>
      }
    >
      <SharedBookingsPage config={adminBookingsConfig} />
    </Suspense>
  );
}
