/**
 * Clear invalid junk from blocked_dates.location for Turo trips.
 * Usage: npx tsx --env-file=.env.local scripts/clean-turo-locations.ts [--apply]
 */
import { createClient } from "@supabase/supabase-js";
import { storedTuroLocation } from "../src/lib/utils/turo-email-parser";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_KEY;
if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_KEY");
  process.exit(1);
}

const apply = process.argv.includes("--apply");
const supabase = createClient(url, key);

async function main() {
  const { data, error } = await supabase
    .from("blocked_dates")
    .select("id, reason, location, start_date")
    .eq("source", "turo-email")
    .is("cancelled_at", null);

  if (error) throw new Error(error.message);

  const junk = (data || []).filter((r) => r.location && !storedTuroLocation(r.location));
  const missing = (data || []).filter((r) => !r.location?.trim());

  console.log(`Active Turo trips: ${data?.length ?? 0}`);
  console.log(`Invalid location values: ${junk.length}`);
  console.log(`Missing location: ${missing.length}`);

  for (const row of junk) {
    console.log(`  CLEAR ${row.start_date} ${row.reason?.slice(0, 40)} | was: ${String(row.location).slice(0, 60)}...`);
  }

  if (!apply) {
    console.log("\nDry run. Re-run with --apply to null invalid locations.");
    console.log("Then run runLocationBackfill30() in Google Apps Script to fill from booking emails.");
    return;
  }

  for (const row of junk) {
    const { error: upErr } = await supabase
      .from("blocked_dates")
      .update({ location: null })
      .eq("id", row.id);
    if (upErr) console.error("Failed", row.id, upErr.message);
  }
  console.log(`Cleared ${junk.length} invalid location(s).`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
