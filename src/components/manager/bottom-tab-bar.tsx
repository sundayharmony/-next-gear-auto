"use client";

import { AlertTriangle, DollarSign, FileText, LayoutDashboard } from "lucide-react";
import { getManagerNavItems } from "@/lib/admin/panel-navigation";
import { staffPanelIconMap } from "@/lib/admin/staff-panel-icons";
import { StaffBottomTabBar } from "@/components/staff/staff-bottom-tab-bar";
import { useAuth } from "@/lib/context/auth-context";
import { userHasRole } from "@/lib/auth/user-roles";

const managerNavItems = getManagerNavItems();
const PRIMARY_TAB_KEYS = new Set(["dashboard", "bookings", "calendar", "messages"]);

const primaryTabs = managerNavItems
  .filter((item) => PRIMARY_TAB_KEYS.has(item.key))
  .map((item) => ({
    href: item.href,
    label: item.key === "dashboard" ? "Home" : item.label,
    icon: staffPanelIconMap[item.iconKey] || LayoutDashboard,
  }));

const moreItems = managerNavItems
  .filter((item) => !PRIMARY_TAB_KEYS.has(item.key))
  .map((item) => ({
    href: item.href,
    label: item.label,
    icon: staffPanelIconMap[item.iconKey] || LayoutDashboard,
  }));

export function ManagerBottomTabBar() {
  const { user } = useAuth();
  const billingShortcuts = [
    { href: "/manager/tickets?tab=invoices", label: "Invoices", icon: FileText },
    { href: "/manager/tickets?tab=incidents", label: "Incidents", icon: AlertTriangle },
  ];
  const more = userHasRole(user, "owner")
    ? [...moreItems, ...billingShortcuts, { href: "/owner/finance", label: "Revenue & profit", icon: DollarSign }]
    : [...moreItems, ...billingShortcuts];

  return (
    <StaffBottomTabBar
      ariaLabel="Manager navigation"
      homeHref="/manager"
      primaryTabs={primaryTabs}
      moreItems={more}
      moreGridCols={3}
    />
  );
}
