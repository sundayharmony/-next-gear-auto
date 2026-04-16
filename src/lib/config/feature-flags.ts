function parseBooleanFlag(value: string | undefined): boolean {
  if (!value) return false;
  const normalized = value
    .replace(/\\r/g, "")
    .replace(/\\n/g, "")
    .replace(/[\r\n]/g, "")
    .trim()
    .toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes" || normalized === "on";
}

function getEnvFlag(serverKey: string, clientKey?: string): boolean {
  if (typeof window === "undefined") {
    return parseBooleanFlag(process.env[serverKey]);
  }
  if (!clientKey) return false;
  return parseBooleanFlag(process.env[clientKey]);
}

export const featureFlags = {
  managerPanelMaster: () => getEnvFlag("FF_MANAGER_PANEL_MASTER", "NEXT_PUBLIC_FF_MANAGER_PANEL_MASTER"),
  managerRoleEnabled: () => getEnvFlag("FF_MANAGER_ROLE_ENABLED", "NEXT_PUBLIC_FF_MANAGER_ROLE_ENABLED"),
  managerPanelRoutes: () => getEnvFlag("FF_MANAGER_PANEL_ROUTES", "NEXT_PUBLIC_FF_MANAGER_PANEL_ROUTES"),
  managerBookingWrite: () => getEnvFlag("FF_MANAGER_BOOKING_WRITE", "NEXT_PUBLIC_FF_MANAGER_BOOKING_WRITE"),
  managerAnalytics: () => getEnvFlag("FF_MANAGER_ANALYTICS", "NEXT_PUBLIC_FF_MANAGER_ANALYTICS"),
  adminManagerAccessUi: () => getEnvFlag("FF_ADMIN_MANAGER_ACCESS_UI", "NEXT_PUBLIC_FF_ADMIN_MANAGER_ACCESS_UI"),
  staffMessagingEnabled: () => getEnvFlag("FF_STAFF_MESSAGING_ENABLED", "NEXT_PUBLIC_FF_STAFF_MESSAGING_ENABLED"),
  staffMessagingPushEnabled: () => getEnvFlag("FF_STAFF_MESSAGING_PUSH_ENABLED", "NEXT_PUBLIC_FF_STAFF_MESSAGING_PUSH_ENABLED"),
  staffMessagingEmailEnabled: () => getEnvFlag("FF_STAFF_MESSAGING_EMAIL_ENABLED", "NEXT_PUBLIC_FF_STAFF_MESSAGING_EMAIL_ENABLED"),
};

export function isManagerFeatureEnabled(flag: keyof typeof featureFlags): boolean {
  if (!featureFlags.managerPanelMaster()) {
    return false;
  }
  return featureFlags[flag]();
}

export function isStaffMessagingEnabled(flag: "staffMessagingEnabled" | "staffMessagingPushEnabled" | "staffMessagingEmailEnabled"): boolean {
  if (!featureFlags.staffMessagingEnabled()) {
    return false;
  }
  if (flag === "staffMessagingEnabled") {
    return true;
  }
  return featureFlags[flag]();
}
