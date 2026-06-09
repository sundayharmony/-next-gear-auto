export type StaffPanelMode = "admin" | "manager";

export interface StaffPanelCapabilities {
  canViewBlockedDatesLink: boolean;
  canMutateCustomers: boolean;
  canViewAdminOnlyFeatures: boolean;
}

export interface StaffPanelConfig {
  panelMode: StaffPanelMode;
  panelBase: "/admin" | "/manager";
  capabilities: StaffPanelCapabilities;
}

export const adminPanelConfig: StaffPanelConfig = {
  panelMode: "admin",
  panelBase: "/admin",
  capabilities: {
    canViewBlockedDatesLink: true,
    canMutateCustomers: true,
    canViewAdminOnlyFeatures: true,
  },
};

export const managerPanelConfig: StaffPanelConfig = {
  panelMode: "manager",
  panelBase: "/manager",
  capabilities: {
    canViewBlockedDatesLink: false,
    canMutateCustomers: false,
    canViewAdminOnlyFeatures: false,
  },
};

export function staffInvoicesHref(panelBase: StaffPanelConfig["panelBase"]): string {
  return `${panelBase}/invoices`;
}
