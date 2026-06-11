"use client";

import { getAdminNavItems } from "@/lib/admin/panel-navigation";
import { staffPanelIconMap } from "@/lib/admin/staff-panel-icons";
import { StaffBottomTabBar } from "@/components/staff/staff-bottom-tab-bar";

const adminNavItems = getAdminNavItems();
const PRIMARY_TAB_KEYS = new Set(["dashboard", "bookings", "calendar", "vehicles"]);

const primaryTabs = adminNavItems
  .filter((item) => PRIMARY_TAB_KEYS.has(item.key))
  .map((item) => ({
    href: item.href,
    label: item.key === "dashboard" ? "Home" : item.label,
    icon: staffPanelIconMap[item.iconKey],
  }));

const moreItems = adminNavItems
  .filter((item) => !PRIMARY_TAB_KEYS.has(item.key))
  .map((item) => ({
    href: item.href,
    label: item.label,
    icon: staffPanelIconMap[item.iconKey],
  }));

export function BottomTabBar() {
  return (
    <StaffBottomTabBar
      ariaLabel="Admin navigation"
      homeHref="/admin"
      primaryTabs={primaryTabs}
      moreItems={moreItems}
      moreGridCols={3}
    />
  );
}
