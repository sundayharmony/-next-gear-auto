import type { SupabaseClient } from "@supabase/supabase-js";
import { isMissingColumnError } from "@/lib/utils/supabase-column-errors";

type VehicleAssignmentRow = {
  id: string;
  owner_id: string | null;
  owner_percentage: number | null;
  is_company_owned?: boolean | null;
};

let cachedSupportsCompanyOwned: boolean | null = null;

/** Whether `vehicles.is_company_owned` exists (cached per server instance). */
export async function vehicleSupportsCompanyOwnedFlag(
  supabase: SupabaseClient
): Promise<boolean> {
  if (cachedSupportsCompanyOwned !== null) return cachedSupportsCompanyOwned;
  const { error } = await supabase.from("vehicles").select("is_company_owned").limit(1);
  if (!error) {
    cachedSupportsCompanyOwned = true;
    return true;
  }
  if (isMissingColumnError(error)) {
    cachedSupportsCompanyOwned = false;
    return false;
  }
  // Unknown error — assume unsupported so we don't block owner_id saves
  cachedSupportsCompanyOwned = false;
  return false;
}

/** Load vehicles for the admin owners page; tolerates missing `is_company_owned`. */
export async function fetchVehiclesForOwnerAssignments(
  supabase: SupabaseClient
): Promise<{ rows: VehicleAssignmentRow[]; supportsCompanyOwned: boolean }> {
  const supportsCompanyOwned = await vehicleSupportsCompanyOwnedFlag(supabase);
  if (supportsCompanyOwned) {
    const { data, error } = await supabase
      .from("vehicles")
      .select("id, owner_id, owner_percentage, is_company_owned");
    if (error) throw error;
    return { rows: (data || []) as VehicleAssignmentRow[], supportsCompanyOwned: true };
  }

  const { data, error } = await supabase.from("vehicles").select("id, owner_id, owner_percentage");
  if (error) throw error;

  return {
    rows: ((data || []) as VehicleAssignmentRow[]).map((v) => ({
      ...v,
      is_company_owned: false,
    })),
    supportsCompanyOwned: false,
  };
}

/** Strip `is_company_owned` when the column is not on the database yet. */
export function sanitizeVehicleAssignmentPatch(
  updates: Record<string, string | number | boolean | null>,
  supportsCompanyOwned: boolean
): Record<string, string | number | boolean | null> {
  if (supportsCompanyOwned) return updates;
  const { is_company_owned: _c, ...rest } = updates;
  return rest;
}

/** Apply assignment patch; retries without `is_company_owned` if the column is missing. */
export async function patchVehicleAssignment(
  supabase: SupabaseClient,
  vehicleId: string,
  updates: Record<string, string | number | boolean | null>
): Promise<{
  error: { message?: string; code?: string; details?: string } | null;
  companyOwnedUnsupported?: boolean;
}> {
  const supportsCompanyOwned = await vehicleSupportsCompanyOwnedFlag(supabase);
  const wantsCompanyOwned = updates.is_company_owned === true;

  if (!supportsCompanyOwned && wantsCompanyOwned) {
    return {
      error: {
        message:
          "“Company owned” requires a database update. Run supabase-company-owned-vehicles.sql in Supabase SQL Editor, then try again.",
      },
      companyOwnedUnsupported: true,
    };
  }

  const patch = sanitizeVehicleAssignmentPatch(updates, supportsCompanyOwned);
  const { error } = await supabase.from("vehicles").update(patch).eq("id", vehicleId);

  if (!error) return { error: null };

  if (isMissingColumnError(error) && "is_company_owned" in updates) {
    const retryPatch = sanitizeVehicleAssignmentPatch(updates, false);
    if (wantsCompanyOwned) {
      return {
        error: {
          message:
            "“Company owned” requires a database update. Run supabase-company-owned-vehicles.sql in Supabase SQL Editor, then try again.",
        },
        companyOwnedUnsupported: true,
      };
    }
    const retry = await supabase.from("vehicles").update(retryPatch).eq("id", vehicleId);
    return { error: retry.error, companyOwnedUnsupported: true };
  }

  return { error };
}
