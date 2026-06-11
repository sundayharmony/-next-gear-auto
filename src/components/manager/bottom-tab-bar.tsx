"use client";

import { LayoutDashboard } from "lucide-react";
import { getManagerNavItems } from "@/lib/admin/panel-navigation";
import { staffPanelIconMap } from "@/lib/admin/staff-panel-icons";
import { StaffBottomTabBar } from "@/components/staff/staff-bottom-tab-bar";

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
  return (
    <StaffBottomTabBar
      ariaLabel="Manager navigation"
      homeHref="/manager"
      primaryTabs={primaryTabs}
      moreItems={moreItems}
      moreGridCols={3}
    />
  );
}
