"use client";

import React, { Suspense } from "react";
import { adminPanelConfig, type StaffPanelConfig } from "@/lib/admin/staff-panel-config";
import { useRecordsHubTab } from "./records-hub-tabs";
import { IncidentReportsPanel } from "./incident-reports-panel";
import { InvoicesPageClient } from "@/app/admin/invoices/InvoicesPageClient";
import { TicketsMainTab } from "./tickets-main-tab";

function AdminTicketsPageInner({
  panelConfig = adminPanelConfig,
}: {
  panelConfig?: StaffPanelConfig;
}) {
  const hubTab = useRecordsHubTab();
  const panelBase = panelConfig.panelBase;

  if (hubTab === "incidents") {
    return <IncidentReportsPanel panelConfig={panelConfig} />;
  }

  if (hubTab === "invoices") {
    return (
      <Suspense fallback={<p className="p-8 text-center text-sm text-gray-500">Loading invoices…</p>}>
        <InvoicesPageClient
          bookingsHref={`${panelBase}/bookings`}
          isAdmin={panelBase === "/admin"}
          embeddedInRecordsHub
          recordsHubPanelBase={panelBase}
        />
      </Suspense>
    );
  }

  return <TicketsMainTab panelConfig={panelConfig} />;
}

export default function AdminTicketsPage(props: { panelConfig?: StaffPanelConfig }) {
  return (
    <Suspense fallback={<p className="p-8 text-center text-sm text-gray-500">Loading…</p>}>
      <AdminTicketsPageInner {...props} />
    </Suspense>
  );
}
