import { getServiceSupabase } from "@/lib/db/supabase";
import { logger } from "@/lib/utils/logger";

export type OwnerNotificationType =
  | "booking_created"
  | "booking_modified"
  | "booking_cancelled"
  | "payout_issued"
  | "availability_changed";

interface NotifyOwnerInput {
  ownerId: string;
  type: OwnerNotificationType;
  title: string;
  message?: string | null;
  bookingId?: string | null;
  vehicleId?: string | null;
}

/** Insert an owner notification. Best-effort: never throws to the caller. */
export async function notifyOwner(input: NotifyOwnerInput): Promise<void> {
  try {
    const supabase = getServiceSupabase();
    await supabase.from("owner_notifications").insert({
      owner_id: input.ownerId,
      type: input.type,
      title: input.title,
      message: input.message ?? null,
      booking_id: input.bookingId ?? null,
      vehicle_id: input.vehicleId ?? null,
    });
  } catch (err) {
    logger.error("notifyOwner failed:", err);
  }
}

/**
 * Look up the owner of a vehicle and notify them about a booking event.
 * No-op when the vehicle has no owner assigned.
 */
export async function notifyVehicleOwner(
  vehicleId: string | null | undefined,
  type: OwnerNotificationType,
  title: string,
  message?: string | null,
  bookingId?: string | null
): Promise<void> {
  if (!vehicleId) return;
  try {
    const supabase = getServiceSupabase();
    const { data: vehicle } = await supabase
      .from("vehicles")
      .select("owner_id, is_company_owned")
      .eq("id", vehicleId)
      .maybeSingle();
    if (vehicle?.is_company_owned) return;
    const ownerId = vehicle?.owner_id as string | null | undefined;
    if (!ownerId) return;
    await notifyOwner({ ownerId, type, title, message, bookingId, vehicleId });
  } catch (err) {
    logger.error("notifyVehicleOwner failed:", err);
  }
}
