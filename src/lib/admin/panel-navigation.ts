import { getAdminFeatures, getManagerFeatures } from "@/lib/admin/panel-registry";

export type PanelIconKey =
  | "dashboard"
  | "calendarDays"
  | "calendar"
  | "car"
  | "shieldBan"
  | "wrench"
  | "mapPin"
  | "dollarSign"
  | "ticket"
  | "users"
  | "tag"
  | "star"
  | "instagram"
  | "clipboard";

export interface PanelNavItem {
  key: string;
  href: string;
  label: string;
  iconKey: PanelIconKey;
  sharedWithManager: boolean;
}

const iconMap: Record<string, PanelIconKey> = {
  dashboard: "dashboard",
  calendar: "calendarDays",
  bookings: "calendar",
  vehicles: "car",
  blockedDates: "shieldBan",
  maintenance: "wrench",
  locations: "mapPin",
  finances: "dollarSign",
  tickets: "ticket",
  customers: "users",
  managers: "users",
  promoCodes: "tag",
  reviews: "star",
  instagram: "instagram",
  analytics: "clipboard",
};

export function getAdminNavItems(): PanelNavItem[] {
  return getAdminFeatures().map((feature) => ({
    key: feature.key,
    href: feature.adminPath,
    label: feature.label,
    iconKey: iconMap[feature.key] ?? "dashboard",
    sharedWithManager: feature.sharedWithManager,
  }));
}

export function getManagerNavItems(): PanelNavItem[] {
  return getManagerFeatures().map((feature) => ({
    key: feature.key,
    href: feature.managerPath as string,
    label: feature.label,
    iconKey: iconMap[feature.key] ?? "dashboard",
    sharedWithManager: feature.sharedWithManager,
  }));
}

export function buildPageTitleMap(navItems: PanelNavItem[]): Record<string, string> {
  const map: Record<string, string> = {};
  for (const item of navItems) {
    map[item.href] = item.label;
  }
  return map;
}
