import { getStaffPanelBase } from "@/lib/admin/staff-panel-base";

export function getStaffVehicleDetailsHref(vehicleId: string, pathname?: string | null): string {
  const base = getStaffPanelBase(pathname);
  return `${base}/vehicles/${encodeURIComponent(vehicleId)}`;
}

