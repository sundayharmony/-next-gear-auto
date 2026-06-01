import {
  LayoutDashboard,
  CalendarDays,
  DollarSign,
  ShieldBan,
  Bell,
  type LucideIcon,
} from "lucide-react";

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
];
