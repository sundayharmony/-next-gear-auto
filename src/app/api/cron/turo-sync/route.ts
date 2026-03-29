import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/db/supabase";
import { parseICal } from "@/lib/utils/ical-parser";
import { logger } from "@/lib/utils/logger";

/**
 * GET /api/cron/turo-sync
 *
 * Fetches iCal feeds for all vehicles that have a turo_ical_url configured,
 * parses the events, and upserts blocked_dates in Supabase.
 *
 * Called by:
 *  - Vercel Cron (every 30 minutes)
 *  - Admin manual sync button (POST with vehicleId)
 */
export async function GET(req: NextRequest) {
  // Verify cron secret (Vercel sends this header for cron jobs)
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return runSync();
}

/**
 * POST /api/cron/turo-sync
 *
 * Admin-triggered sync — can optionally sync a single vehicle.
 * Body: { vehicleId?: string }
 */
export async function POST(req: NextRequest) {
  // Admin auth
  const { verifyAdmin } = await import("@/lib/auth/admin-check");
  const auth = await verifyAdmin(req);
  if (!auth.authorized) return auth.response;

  let vehicleId: string | undefined;
  try {
    const body = await req.json();
    vehicleId = body.vehicleId;
  } catch {
    // No body is fine — sync all
  }

  return runSync(vehicleId);
}

async function runSync(singleVehicleId?: string) {
  const supabase = getServiceSupabase();
  const results: { vehicleId: string; name: string; eventsFound: number; error?: string }[] = [];

  try {
    // Fetch vehicles with Turo iCal URLs
    let query = supabase
      .from("vehicles")
      .select("id, year, make, model, turo_ical_url")
      .not("turo_ical_url", "is", null);

    if (singleVehicleId) {
      query = query.eq("id", singleVehicleId);
    }

    const { data: vehicles, error: vErr } = await query;
    if (vErr) {
      logger.error("Turo sync: failed to fetch vehicles", vErr);
      return NextResponse.json({ success: false, error: "Failed to fetch vehicles" }, { status: 500 });
    }

    if (!vehicles || vehicles.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No vehicles have Turo iCal URLs configured",
        results: [],
      });
    }

    for (const vehicle of vehicles) {
      const name = `${vehicle.year} ${vehicle.make} ${vehicle.model}`;

      if (!vehicle.turo_ical_url || typeof vehicle.turo_ical_url !== "string") {
        results.push({ vehicleId: vehicle.id, name, eventsFound: 0, error: "No iCal URL" });
        continue;
      }

      try {
        // Fetch iCal feed with timeout
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 15000);

        const response = await fetch(vehicle.turo_ical_url, {
          signal: controller.signal,
          headers: {
            "User-Agent": "NGA-Calendar-Sync/1.0",
            Accept: "text/calendar, text/plain, */*",
          },
        });
        clearTimeout(timeout);

        if (!response.ok) {
          results.push({
            vehicleId: vehicle.id,
            name,
            eventsFound: 0,
            error: `HTTP ${response.status} from Turo iCal feed`,
          });
          continue;
        }

        const icsText = await response.text();
        if (!icsText.includes("BEGIN:VCALENDAR")) {
          results.push({
            vehicleId: vehicle.id,
            name,
            eventsFound: 0,
            error: "Response is not a valid iCal feed",
          });
          continue;
        }

        const events = parseICal(icsText);

        // Filter to future/current events only (no need to block past dates)
        const today = new Date().toISOString().split("T")[0];
        const relevantEvents = events.filter((e) => e.endDate >= today);

        // Delete existing Turo blocks for this vehicle, then insert fresh ones
        // This ensures cancelled Turo reservations get unblocked
        const { error: deleteErr } = await supabase
          .from("blocked_dates")
          .delete()
          .eq("vehicle_id", vehicle.id)
          .eq("source", "turo");

        if (deleteErr) {
          logger.error(`Turo sync: delete error for vehicle ${vehicle.id}`, deleteErr);
          results.push({ vehicleId: vehicle.id, name, eventsFound: 0, error: "Failed to clear old blocks" });
          continue;
        }

        if (relevantEvents.length > 0) {
          const rows = relevantEvents.map((evt) => ({
            vehicle_id: vehicle.id,
            start_date: evt.startDate,
            end_date: evt.endDate,
            source: "turo",
            external_event_uid: evt.uid,
            summary: evt.summary.slice(0, 200), // Truncate long summaries
            updated_at: new Date().toISOString(),
          }));

          const { error: insertErr } = await supabase
            .from("blocked_dates")
            .insert(rows);

          if (insertErr) {
            logger.error(`Turo sync: insert error for vehicle ${vehicle.id}`, insertErr);
            results.push({ vehicleId: vehicle.id, name, eventsFound: relevantEvents.length, error: "Failed to insert blocks" });
            continue;
          }
        }

        // Update last synced timestamp
        await supabase
          .from("vehicles")
          .update({ turo_last_synced_at: new Date().toISOString() })
          .eq("id", vehicle.id);

        results.push({ vehicleId: vehicle.id, name, eventsFound: relevantEvents.length });
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        logger.error(`Turo sync error for vehicle ${vehicle.id}:`, err);
        results.push({ vehicleId: vehicle.id, name, eventsFound: 0, error: msg });
      }
    }

    const totalEvents = results.reduce((sum, r) => sum + r.eventsFound, 0);
    const errors = results.filter((r) => r.error);

    logger.info(`Turo sync complete: ${results.length} vehicles, ${totalEvents} events, ${errors.length} errors`);

    return NextResponse.json({
      success: true,
      message: `Synced ${results.length} vehicle(s), found ${totalEvents} blocked date range(s)`,
      results,
    });
  } catch (err) {
    logger.error("Turo sync fatal error:", err);
    return NextResponse.json({ success: false, error: "Sync failed" }, { status: 500 });
  }
}
