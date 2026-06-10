"use client";

import React, { Suspense } from "react";
import { SharedBookingsPage } from "@/app/admin/bookings/shared-bookings-page";
import { managerBookingsConfig } from "@/app/admin/bookings/config";
import { managerPanelConfig } from "@/lib/admin/staff-panel-config";

export default function ManagerBookingsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-24">
          <div role="status" aria-label="Loading bookings" className="animate-spin h-8 w-8 border-4 border-purple-600 border-t-transparent rounded-full" />
        </div>
      }
    >
      <SharedBookingsPage
        config={{
          ...managerBookingsConfig,
          homeHref: managerPanelConfig.panelBase,
          customerDetailsBasePath: `${managerPanelConfig.panelBase}/customers`,
          ticketsPagePath: `${managerPanelConfig.panelBase}/tickets`,
        }}
      />
    </Suspense>
  );
}
