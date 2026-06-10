"use client";

import React from "react";
import { StaffPanelShell } from "@/components/staff/StaffPanelShell";
import { OwnerBottomTabBar } from "@/components/owner/bottom-tab-bar";
import { getOwnerNavItems } from "@/lib/owner/owner-navigation";
import { useOwnerUnreadCount } from "@/lib/owner/use-owner-notifications";
import { OwnerDataProvider } from "@/lib/owner/owner-data-context";
import { useAuth } from "@/lib/context/auth-context";
import { userHasRole } from "@/lib/auth/user-roles";

function OwnerLayoutInner({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const isOwner = isAuthenticated && userHasRole(user, "owner");
  const unread = useOwnerUnreadCount(isOwner && !authLoading);

  return (
    <StaffPanelShell
      panelTitle="Owner Portal"
      navItems={getOwnerNavItems()}
      requiredRole="owner"
      homeHref="/owner"
      useSessionGuard
      messagesHref="/owner/notifications"
      unreadCount={unread}
      unreadHref="/owner/notifications"
      bottomTabBar={<OwnerBottomTabBar unread={unread} />}
    >
      <OwnerDataProvider>{children}</OwnerDataProvider>
    </StaffPanelShell>
  );
}

export default function OwnerLayout({ children }: { children: React.ReactNode }) {
  return <OwnerLayoutInner>{children}</OwnerLayoutInner>;
}
