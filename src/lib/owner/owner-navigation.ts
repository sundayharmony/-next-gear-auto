import {
  LayoutDashboard,
  CalendarDays,
  DollarSign,
  ShieldBan,
  Bell,
  CalendarPlus,
  type LucideIcon,
} from "lucide-react";
import type { PanelIconKey, PanelNavItem } from "@/lib/admin/panel-navigation";

export interface OwnerNavItem {
  key: string;
  href: string;
  label: string;
  icon: LucideIcon;
  /** Show in the mobile bottom tab bar (vs. the "More" sheet). */
  primary: boolean;
}

export const OWNER_NAV_ITEMS: OwnerNavItem[] = [
  { key: "dashboard", href: "/owner", label: "Dashboard", icon: LayoutDashboard, primary: true },
  { key: "calendar", href: "/owner/calendar", label: "Calendar", icon: CalendarDays, primary: true },
  { key: "finance", href: "/owner/finance", label: "Finance", icon: DollarSign, primary: true },
  { key: "availability", href: "/owner/availability", label: "Availability", icon: ShieldBan, primary: true },
  { key: "notifications", href: "/owner/notifications", label: "Notifications", icon: Bell, primary: false },
  { key: "createBooking", href: "/owner/bookings/create", label: "Create booking", icon: CalendarPlus, primary: false },
];

const OWNER_ICON_KEYS: Record<string, PanelIconKey> = {
  dashboard: "dashboard",
  calendar: "calendarDays",
  finance: "dollarSign",
  availability: "shieldBan",
  notifications: "bell",
  createBooking: "calendar",
};

export function getOwnerNavItems(): PanelNavItem[] {
  return OWNER_NAV_ITEMS.filter((item) => item.key !== "createBooking").map((item) => ({
    key: item.key,
    href: item.href,
    label: item.label,
    iconKey: OWNER_ICON_KEYS[item.key] ?? "dashboard",
    sharedWithManager: false,
  }));
}
