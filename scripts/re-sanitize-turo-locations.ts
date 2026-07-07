/**
 * Re-apply storedTuroLocation to all Turo rows (fixes junk tails like "About the guest").
 * Usage: npx tsx --env-file=.env.local scripts/re-sanitize-turo-locations.ts
 *        npx tsx --env-file=.env.local scripts/re-sanitize-turo-locations.ts --apply
 */
import { createClient } from "@supabase/supabase-js";
import { storedTuroLocation } from "../src/lib/utils/turo-email-parser";

const apply = process.argv.includes("--apply");

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function main() {
  const { data: rows, error } = await supabase
    .from("blocked_dates")
    .select("id, reason, location")
    .eq("source", "turo-email")
    .not("location", "is", null);

  if (error) throw error;

  let changed = 0;
  for (const row of rows || []) {
    const cleaned = storedTuroLocation(row.location);
    const current = row.location?.trim() || null;
    if (cleaned === current) continue;
    changed++;
    console.log(`  ${row.reason}: "${current}" -> "${cleaned}"`);
    if (apply) {
      await supabase.from("blocked_dates").update({ location: cleaned }).eq("id", row.id);
    }
  }

  console.log(`\n${apply ? "Updated" : "Would update"} ${changed} row(s).`);
  if (!apply && changed > 0) console.log("Re-run with --apply to write changes.");
}

main().catch(console.error);
