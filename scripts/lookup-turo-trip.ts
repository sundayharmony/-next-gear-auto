import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_KEY;
if (!url || !key) {
  console.error("Missing Supabase env");
  process.exit(1);
}

const supabase = createClient(url, key);

async function main() {
  const { data: vehicles } = await supabase
    .from("vehicles")
    .select("id, year, make, model, is_available")
    .ilike("model", "%A6%");
  console.log("Audi A6 vehicles:", vehicles);

  const { data: henry } = await supabase
    .from("blocked_dates")
    .select(
      "id, vehicle_id, start_date, end_date, reason, source, cancelled_at, location, created_at"
    )
    .eq("source", "turo-email")
    .or("reason.ilike.%Henry%,reason.ilike.%58403709%")
    .order("start_date", { ascending: false })
    .limit(20);
  console.log("Henry / 58403709 rows:", JSON.stringify(henry, null, 2));

  const { data: june18 } = await supabase
    .from("blocked_dates")
    .select(
      "id, vehicle_id, start_date, end_date, reason, source, cancelled_at, location"
    )
    .eq("source", "turo-email")
    .gte("start_date", "2026-06-15")
    .lte("start_date", "2026-06-20")
    .order("start_date");
  console.log("Turo trips starting Jun 15-20 2026:", JSON.stringify(june18, null, 2));

  const henryId = "eb6994c0-7672-4c17-b50a-547c996d0a5a";
  const { data: henryRow } = await supabase
    .from("blocked_dates")
    .select("*")
    .eq("id", henryId)
    .single();
  console.log("Henry Audi trip full row:", JSON.stringify(henryRow, null, 2));

  if (henryRow?.vehicle_id) {
    const { data: sameDay } = await supabase
      .from("blocked_dates")
      .select("id, start_date, end_date, reason, cancelled_at, created_at")
      .eq("source", "turo-email")
      .eq("vehicle_id", henryRow.vehicle_id)
      .eq("start_date", "2026-06-18");
    console.log("All Audi A6 Jun 18 rows:", JSON.stringify(sameDay, null, 2));
  }

  const audiId = "82ebfb26-80ce-4fbd-a164-b4b77b928647";
  const { data: allAudi } = await supabase
    .from("blocked_dates")
    .select("id, start_date, end_date, reason, cancelled_at, created_at")
    .eq("source", "turo-email")
    .eq("vehicle_id", audiId)
    .gte("start_date", "2026-06-01")
    .lte("start_date", "2026-06-30")
    .order("created_at");
  console.log("All Audi A6 June 2026 Turo rows:", JSON.stringify(allAudi, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
