export interface SyncException {
  reason: string;
  expiresAt: string;
}

export interface PanelFeature {
  key: string;
  label: string;
  /** Present for routes that exist under /admin. Manager-only features omit this. */
  adminPath?: string;
  managerPath?: string;
  sharedWithManager: boolean;
  syncException?: SyncException;
}

export const panelFeatureRegistry: PanelFeature[] = [
  { key: "dashboard", label: "Dashboard", adminPath: "/admin", managerPath: "/manager", sharedWithManager: true },
  { key: "bookings", label: "Bookings", adminPath: "/admin/bookings", managerPath: "/manager/bookings", sharedWithManager: true },
  { key: "invoices", label: "Invoices", adminPath: "/admin/invoices", managerPath: "/manager/invoices", sharedWithManager: true },
  { key: "calendar", label: "Calendar", adminPath: "/admin/calendar", managerPath: "/manager/calendar", sharedWithManager: true },
  { key: "vehicles", label: "Vehicles", adminPath: "/admin/vehicles", managerPath: "/manager/vehicles", sharedWithManager: false },
  { key: "blockedDates", label: "Blocked Dates", adminPath: "/admin/blocked-dates", sharedWithManager: false },
  { key: "maintenance", label: "Maintenance", adminPath: "/admin/maintenance", managerPath: "/manager/maintenance", sharedWithManager: true },
  { key: "locations", label: "Locations", adminPath: "/admin/locations", managerPath: "/manager/locations", sharedWithManager: true },
  { key: "finances", label: "Finances", adminPath: "/admin/finances", sharedWithManager: false },
  { key: "tickets", label: "Tickets", adminPath: "/admin/tickets", managerPath: "/manager/tickets", sharedWithManager: true },
  { key: "customers", label: "Customers", adminPath: "/admin/customers", managerPath: "/manager/customers", sharedWithManager: true },
  { key: "messages", label: "Messages", adminPath: "/admin/messages", managerPath: "/manager/messages", sharedWithManager: true },
  { key: "managers", label: "Managers", adminPath: "/admin/managers", sharedWithManager: false },
  { key: "promoCodes", label: "Promo Codes", adminPath: "/admin/promo-codes", managerPath: "/manager/promo-codes", sharedWithManager: true },
  { key: "reviews", label: "Reviews", adminPath: "/admin/reviews", managerPath: "/manager/reviews", sharedWithManager: true },
  { key: "instagram", label: "Instagram", adminPath: "/admin/instagram", managerPath: "/manager/instagram", sharedWithManager: true },
  { key: "marketing", label: "Marketing", adminPath: "/admin/marketing", sharedWithManager: false },
  /** Manager-only: admin uses Finances at /admin/finances (see finances row). */
  { key: "analytics", label: "Analytics", managerPath: "/manager/analytics", sharedWithManager: true },
];

export function getAdminFeatures(): Array<PanelFeature & { adminPath: string }> {
  return panelFeatureRegistry.filter(
    (feature): feature is PanelFeature & { adminPath: string } => Boolean(feature.adminPath)
  );
}

export function getManagerFeatures(): Array<PanelFeature & { managerPath: string }> {
  return panelFeatureRegistry.filter(
    (feature): feature is PanelFeature & { managerPath: string } =>
      feature.sharedWithManager && Boolean(feature.managerPath)
  );
}

export function getCorrelatedFeatures(): PanelFeature[] {
  return panelFeatureRegistry.filter((feature) => feature.sharedWithManager);
}

export function getExpiredSyncExceptions(now = new Date()): PanelFeature[] {
  return panelFeatureRegistry.filter((feature) => {
    if (!feature.syncException?.expiresAt) return false;
    return new Date(feature.syncException.expiresAt).getTime() <= now.getTime();
  });
}
