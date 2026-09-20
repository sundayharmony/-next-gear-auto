import type { SupabaseClient } from "@supabase/supabase-js";
import { logger } from "@/lib/utils/logger";
import { TURO_BLOCKED_SOURCE } from "@/lib/utils/blocked-dates";

type ServiceSupabase = SupabaseClient;

export type VehicleDeleteSummary = {
  bookings: number;
  blockedDates: number;
  maintenanceRecords: number;
};

function isMissingRelationError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const anyErr = error as { code?: string; message?: string };
  return (
    anyErr.code === "42P01" ||
    /relation\s+.+\s+does\s+not\s+exist/i.test(anyErr.message || "")
  );
}

async function deleteInBatches(
  supabase: ServiceSupabase,
  table: string,
  column: string,
  ids: string[],
  optional = false
): Promise<void> {
  if (ids.length === 0) return;
  const chunkSize = 100;
  for (let i = 0; i < ids.length; i += chunkSize) {
    const chunk = ids.slice(i, i + chunkSize);
    const { error } = await supabase.from(table).delete().in(column, chunk);
    if (!error) continue;
    if (optional && isMissingRelationError(error)) return;
    throw new Error(`${table} cleanup failed: ${error.message}`);
  }
}

async function runOptional(
  label: string,
  fn: () => Promise<{ error: { message: string; code?: string } | null }>
): Promise<void> {
  const { error } = await fn();
  if (!error) return;
  if (isMissingRelationError(error)) return;
  throw new Error(`${label} failed: ${error.message}`);
}

/**
 * Remove a vehicle and dependent rows that would block deletion.
 * Bookings, blocked dates, and maintenance for the vehicle are removed.
 * Expenses and tickets keep their records with vehicle_id cleared.
 */
export async function deleteVehicleWithDependencies(
  supabase: ServiceSupabase,
  vehicleId: string
): Promise<VehicleDeleteSummary> {
  const [{ data: bookingRows }, { data: blockedRows }, { count: maintenanceCount }] =
    await Promise.all([
      supabase.from("bookings").select("id").eq("vehicle_id", vehicleId),
      supabase.from("blocked_dates").select("id, source").eq("vehicle_id", vehicleId),
      supabase
        .from("maintenance_records")
        .select("id", { count: "exact", head: true })
        .eq("vehicle_id", vehicleId),
    ]);

  const bookingIds = (bookingRows || []).map((row) => String(row.id));
  const blockedDates = (blockedRows || []) as Array<{ id: string; source?: string | null }>;
  const blockedIds = blockedDates.map((row) => String(row.id));

  for (const bookingId of bookingIds) {
    await supabase
      .from("google_calendar_event_links")
      .delete()
      .eq("source_kind", "booking")
      .eq("source_id", bookingId);
  }

  for (const row of blockedDates) {
    const kind = row.source === TURO_BLOCKED_SOURCE ? "turo" : "blocked";
    await supabase
      .from("google_calendar_event_links")
      .delete()
      .eq("source_kind", kind)
      .eq("source_id", row.id);
  }

  if (bookingIds.length > 0) {
    await deleteInBatches(supabase, "payment_records", "booking_id", bookingIds, true);
    await deleteInBatches(supabase, "invoices", "booking_id", bookingIds, true);
    await deleteInBatches(supabase, "owner_payouts", "booking_id", bookingIds, true);
    await deleteInBatches(supabase, "booking_payments", "booking_id", bookingIds, true);
    await deleteInBatches(supabase, "booking_activity", "booking_id", bookingIds, true);
    await deleteInBatches(supabase, "reviews", "booking_id", bookingIds, true);
    await deleteInBatches(
      supabase,
      "customer_credit_ledger",
      "source_booking_id",
      bookingIds,
      true
    );

    await runOptional("tickets booking unlink", () =>
      supabase.from("tickets").update({ booking_id: null }).in("booking_id", bookingIds)
    );

    const { error: bookingsErr } = await supabase
      .from("bookings")
      .delete()
      .eq("vehicle_id", vehicleId);
    if (bookingsErr) throw new Error(`bookings cleanup failed: ${bookingsErr.message}`);
  }

  await runOptional("reviews by vehicle", () =>
    supabase.from("reviews").delete().eq("vehicle_id", vehicleId)
  );
  await runOptional("owner_payouts by vehicle", () =>
    supabase.from("owner_payouts").delete().eq("vehicle_id", vehicleId)
  );
  await runOptional("owner_notifications by vehicle", () =>
    supabase.from("owner_notifications").delete().eq("vehicle_id", vehicleId)
  );
  await runOptional("vehicle_sales", () =>
    supabase.from("vehicle_sales").delete().eq("vehicle_id", vehicleId)
  );

  if (blockedIds.length > 0) {
    await runOptional("expenses blocked_date unlink", () =>
      supabase.from("expenses").update({ blocked_date_id: null }).in("blocked_date_id", blockedIds)
    );
  }

  await runOptional("expenses vehicle unlink", () =>
    supabase.from("expenses").update({ vehicle_id: null }).eq("vehicle_id", vehicleId)
  );
  await runOptional("tickets vehicle unlink", () =>
    supabase.from("tickets").update({ vehicle_id: null }).eq("vehicle_id", vehicleId)
  );

  const { error: blockedErr } = await supabase
    .from("blocked_dates")
    .delete()
    .eq("vehicle_id", vehicleId);
  if (blockedErr) throw new Error(`blocked_dates cleanup failed: ${blockedErr.message}`);

  const { error: maintenanceErr } = await supabase
    .from("maintenance_records")
    .delete()
    .eq("vehicle_id", vehicleId);
  if (maintenanceErr) throw new Error(`maintenance_records cleanup failed: ${maintenanceErr.message}`);

  const { error: vehicleErr } = await supabase.from("vehicles").delete().eq("id", vehicleId);
  if (vehicleErr) {
    logger.error("Vehicle delete failed after dependency cleanup", { vehicleId, vehicleErr });
    if ((vehicleErr as { code?: string }).code === "23503") {
      throw new Error(
        "Could not delete vehicle because other records still reference it. Contact support."
      );
    }
    throw new Error(`Failed to delete vehicle: ${vehicleErr.message}`);
  }

  return {
    bookings: bookingIds.length,
    blockedDates: blockedIds.length,
    maintenanceRecords: maintenanceCount ?? 0,
  };
}
