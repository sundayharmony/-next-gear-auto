export interface AgreementSigningVehicleInfo {
  make: string;
  model: string;
  year: number;
  licensePlate?: string;
  vin?: string;
  color?: string;
  mileage?: number;
}

/** Parse display name (e.g. "2024 Toyota Camry") when fleet row is unavailable. */
export function vehicleForSigningFromDisplayName(
  vehicleName: string,
): AgreementSigningVehicleInfo {
  const trimmed = vehicleName.trim() || "Vehicle";
  const yearLead = trimmed.match(/^(\d{4})\s+(.+)$/);
  if (yearLead) {
    const [, yearStr, rest] = yearLead;
    const parts = rest.trim().split(/\s+/);
    const make = parts[0] || "Vehicle";
    const model = parts.slice(1).join(" ") || make;
    return { year: Number(yearStr), make, model };
  }
  const parts = trimmed.split(/\s+/);
  const make = parts[0] || "Vehicle";
  const model = parts.slice(1).join(" ") || make;
  return { year: new Date().getFullYear(), make, model };
}
