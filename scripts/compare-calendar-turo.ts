/**
 * Compare active Turo rows in DB vs fetchGlobalOccupancy (calendar merge path).
 */
import { createClient } from "@supabase/supabase-js";
import { fetchGlobalOccupancy } from "../src/lib/admin/vehicle-occupancy";
import { addDaysToYmd } from "../src/lib/utils/date-helpers";
import { getDefaultTimelineStart } from "../src/app/admin/calendar/calendar-timeline-range";
import { TURO_BLOCKED_SOURCE, isBlockedDateCancelled } from "../src/lib/utils/blocked-dates";
import { formatYyyyMmDdLocal } from "../src/lib/utils/booking-dates";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_KEY;
if (!url || !key) {
  console.error("Missing Supabase env");
  process.exit(1);
}

const supabase = createClient(url, key);
const today = formatYyyyMmDdLocal(new Date());

async function main() {
  const start = getDefaultTimelineStart();
  const fromYmd = start.toISOString().slice(0, 10);
  const from = addDaysToYmd(fromYmd, -120);
  const to = addDaysToYmd(fromYmd, 180 + 120);

  const { data: activeRows } = await supabase
    .from("blocked_dates")
    .select("id, vehicle_id, start_date, end_date, reason, cancelled_at, created_at")
    .eq("source", "turo-email")
    .is("cancelled_at", null)
    .order("start_date", { ascending: true });

  const inProgress = (activeRows || []).filter(
    (r) => r.start_date < today && r.end_date > today
  );

  const { data: bookingRows } = await supabase
    .from("bookings")
    .select("*, vehicles(year, make, model)")
    .lte("pickup_date", to)
    .limit(2000);

  const merged = await fetchGlobalOccupancy(supabase, "admin", "admin", {
    bookingRows: (bookingRows || []) as Record<string, unknown>[],
    from,
    to,
  });

  const turoIds = new Set(
    merged.filter((e) => e.kind === "turo").map((e) => e.blocked_date_id || e.id.replace(/^turo:/, ""))
  );

  console.log(`Calendar fetch range: ${from} → ${to}`);
  console.log(`Active Turo rows in DB: ${activeRows?.length ?? 0}`);
  console.log(`In-progress active (start < today < end): ${inProgress.length}`);
  console.log(`Turo entries in calendar merge: ${merged.filter((e) => e.kind === "turo").length}`);

  const missing = inProgress.filter((r) => !turoIds.has(r.id));
  if (missing.length) {
    console.log("\nIn-progress trips in DB but MISSING from calendar merge:");
    for (const r of missing) {
      const reasonPrefix = r.reason?.trimStart().startsWith("[CANCELLED]");
      console.log(`  ${r.id}  ${r.start_date}→${r.end_date}  ${r.reason ?? ""}${reasonPrefix ? "  [CANCELLED in reason]" : ""}`);
    }
  } else {
    console.log("\nAll in-progress DB trips present in calendar merge.");
  }

  const { data: allActive } = await supabase
    .from("blocked_dates")
    .select("id, start_date, end_date, reason, cancelled_at")
    .eq("source", "turo-email")
    .is("cancelled_at", null);

  const missingAny = (allActive || []).filter((r) => !turoIds.has(r.id));
  console.log(`\nActive rows missing from merge (any dates): ${missingAny.length}`);

  let turoQuery = supabase
    .from("blocked_dates")
    .select("id, vehicle_id, start_date, end_date, reason, cancelled_at, created_at")
    .eq("source", TURO_BLOCKED_SOURCE)
    .order("start_date", { ascending: false })
    .limit(2000);
  turoQuery = turoQuery.gte("end_date", from).lte("start_date", to);
  const { data: rawQuery } = await turoQuery;

  console.log(`Raw fetchGlobalOccupancy query rows: ${rawQuery?.length ?? 0}`);
  for (const r of missingAny.slice(0, 8)) {
    const inRaw = rawQuery?.find((x) => x.id === r.id);
    const cancelled = inRaw ? isBlockedDateCancelled(inRaw) : null;
    console.log(
      `  ${r.start_date}→${r.end_date}  inRaw=${!!inRaw}  cancelled=${cancelled}  ${r.reason?.slice(0, 40)}`
    );
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
