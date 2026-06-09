export type StaffPanelBase = "/admin" | "/manager";

/** Resolve staff panel base path from the current route (or explicit override). */
export function getStaffPanelBase(pathname?: string | null): StaffPanelBase {
  return pathname?.startsWith("/manager") ? "/manager" : "/admin";
}

export function staffBookingsHref(panelBase: StaffPanelBase, query?: string): string {
  const q = query ? (query.startsWith("?") ? query : `?${query}`) : "";
  return `${panelBase}/bookings${q}`;
}

export function staffCustomersHref(panelBase: StaffPanelBase, query?: string): string {
  const q = query ? (query.startsWith("?") ? query : `?${query}`) : "";
  return `${panelBase}/customers${q}`;
}
