"use client";

import { OWNER_NAV_ITEMS } from "@/lib/owner/owner-navigation";
import { StaffBottomTabBar } from "@/components/staff/staff-bottom-tab-bar";

const PRIMARY_TABS = OWNER_NAV_ITEMS.filter((item) => item.primary);
const MORE_ITEMS = OWNER_NAV_ITEMS.filter((item) => !item.primary);

export function OwnerBottomTabBar({ unread = 0 }: { unread?: number }) {
  return (
    <StaffBottomTabBar
      ariaLabel="Owner navigation"
      homeHref="/owner"
      primaryTabs={PRIMARY_TABS.map((item) => ({
        href: item.href,
        label: item.label,
        icon: item.icon,
        badge: item.key === "notifications" ? unread : undefined,
      }))}
      moreItems={MORE_ITEMS.map((item) => ({
        href: item.href,
        label: item.label,
        icon: item.icon,
        badge: item.key === "notifications" ? unread : undefined,
      }))}
      moreGridCols={2}
    />
  );
}
