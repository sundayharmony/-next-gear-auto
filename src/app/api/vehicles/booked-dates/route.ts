import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/db/supabase";
import { logger } from "@/lib/utils/logger";
import { isMissingColumnError } from "@/lib/utils/supabase-column-errors";
import { formatYyyyMmDdLocal } from "@/lib/utils/booking-dates";
import { getBookingOccupancyEndDate } from "@/lib/utils/recurring-booking";
import { isActiveCalendarBlock } from "@/lib/utils/blocked-dates";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_BATCH_VEHICLES = 80;

export type BookedRangeDto = {
  pickupDate: string;
  returnDate: string;
  pickupTime: string;
  returnTime: string;
};

function parseVehicleIds(searchParams: URLSearchParams): string[] {
  const batch = searchParams.get("vehicleIds");
  if (batch) {
    const ids = batch
      .split(",")
      .map((id) => id.trim())
      .filter((id) => UUID_RE.test(id) || id.startsWith("v"));
    return [...new Set(ids)].slice(0, MAX_BATCH_VEHICLES);
  }
  const single = searchParams.get("vehicleId");
  if (single?.trim()) return [single.trim()];
  return [];
}

async function fetchRangesForVehicles(
  vehicleIds: string[]
): Promise<Record<string, BookedRangeDto[]>> {
  const supabase = getServiceSupabase();
  const today = formatYyyyMmDdLocal(new Date());
  const result: Record<string, BookedRangeDto[]> = {};
  for (const id of vehicleIds) result[id] = [];

  if (vehicleIds.length === 0) return result;

  const { data: bookings, error } = await supabase
    .from("bookings")
    .select(
      "vehicle_id, pickup_date, return_date, pickup_time, return_time, status, admin_notes"
    )
    .in("vehicle_id", vehicleIds)
    .in("status", ["confirmed", "active", "pending"])
    .order("pickup_date", { ascending: true })
    .limit(5000);

  if (error) {
    throw error;
  }

  for (const b of bookings || []) {
    const vid = String(b.vehicle_id);
    if (!result[vid]) result[vid] = [];
    result[vid].push({
      pickupDate: b.pickup_date,
      returnDate: getBookingOccupancyEndDate(
        {
          pickup_date: b.pickup_date,
          return_date: b.return_date,
          admin_notes: b.admin_notes,
          status: b.status,
        },
        today
      ),
      pickupTime: b.pickup_time || "00:00",
      returnTime: b.return_time || "23:59",
    });
  }

  type CalendarBlockRow = {
    vehicle_id: string;
    start_date: string;
    end_date: string;
    pickup_time?: string | null;
    return_time?: string | null;
    cancelled_at?: string | null;
    reason?: string | null;
  };

  let blocksData: CalendarBlockRow[] | null = null;
  let blocksError: { message: string } | null = null;

  const primaryBlocks = await supabase
    .from("blocked_dates")
    .select("vehicle_id, start_date, end_date, pickup_time, return_time, cancelled_at, reason")
    .in("vehicle_id", vehicleIds)
    .order("start_date", { ascending: true });
  blocksData = primaryBlocks.data;
  blocksError = primaryBlocks.error;

  if (blocksError && isMissingColumnError(blocksError)) {
    const fallback = await supabase
      .from("blocked_dates")
      .select("vehicle_id, start_date, end_date, pickup_time, return_time, reason")
      .in("vehicle_id", vehicleIds)
      .order("start_date", { ascending: true });
    blocksData = (fallback.data || []).map((row) => ({ ...row, cancelled_at: null }));
    blocksError = fallback.error;
  }

  if (blocksError) {
    throw blocksError;
  }

  for (const b of blocksData || []) {
    if (!isActiveCalendarBlock(b)) continue;
    const vid = String(b.vehicle_id);
    if (!result[vid]) result[vid] = [];
    result[vid].push({
      pickupDate: b.start_date,
      returnDate: b.end_date,
      pickupTime: b.pickup_time?.trim() || "00:00",
      returnTime: b.return_time?.trim() || "23:59",
    });
  }

  return result;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const vehicleIds = parseVehicleIds(searchParams);

    if (vehicleIds.length === 0) {
      return NextResponse.json(
        { success: false, error: "vehicleId or vehicleIds param is required" },
        { status: 400 }
      );
    }

    const byVehicle = await fetchRangesForVehicles(vehicleIds);

    // Backward compatible: single vehicleId returns array in `data`
    if (vehicleIds.length === 1 && !searchParams.get("vehicleIds")) {
      return NextResponse.json(
        { success: true, data: byVehicle[vehicleIds[0]] || [] },
        { headers: { "Cache-Control": "no-store" } }
      );
    }

    return NextResponse.json(
      { success: true, data: byVehicle },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (err) {
    logger.error("Booked dates API error:", err);
    return NextResponse.json(
      { success: false, error: "Failed to fetch booked dates" },
      { status: 500 }
    );
  }
}
