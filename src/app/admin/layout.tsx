"use client";

import React from "react";
import { BottomTabBar } from "@/components/admin/bottom-tab-bar";
import { StaffPanelShell } from "@/components/staff/StaffPanelShell";
import { getAdminNavItems } from "@/lib/admin/panel-navigation";
import { adminPanelConfig } from "@/lib/admin/staff-panel-config";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <StaffPanelShell
      panelTitle="Admin Panel"
      navItems={getAdminNavItems()}
      requiredRole="admin"
      homeHref="/admin"
      panelConfig={adminPanelConfig}
      bottomTabBar={<BottomTabBar />}
      pendingBookingsNotifications
      messagesHref="/admin/messages"
    >
      {children}
    </StaffPanelShell>
  );
}
