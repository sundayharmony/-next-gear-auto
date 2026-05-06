export function getStaffVehicleDetailsHref(vehicleId: string, pathname?: string | null): string {
  const base = pathname?.startsWith("/manager") ? "/manager/vehicles" : "/admin/vehicles";
  return `${base}/${encodeURIComponent(vehicleId)}`;
}

