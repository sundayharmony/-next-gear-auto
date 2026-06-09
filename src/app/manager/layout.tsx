"use client";

import React from "react";
import { ManagerBottomTabBar } from "@/components/manager/bottom-tab-bar";
import { StaffPanelShell } from "@/components/staff/StaffPanelShell";
import { getManagerNavItems } from "@/lib/admin/panel-navigation";
import { managerPanelConfig } from "@/lib/admin/staff-panel-config";

export default function ManagerLayout({ children }: { children: React.ReactNode }) {
  return (
    <StaffPanelShell
      panelTitle="Manager Panel"
      navItems={getManagerNavItems()}
      requiredRole="manager"
      homeHref="/manager"
      panelConfig={managerPanelConfig}
      bottomTabBar={<ManagerBottomTabBar />}
      useSessionGuard
      messagesHref="/manager/messages"
    >
      {children}
    </StaffPanelShell>
  );
}
