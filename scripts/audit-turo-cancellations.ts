/**
 * Audit Turo blocked_dates rows (works with or without cancelled_at column).
 */
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_KEY;
if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_KEY");
  process.exit(1);
}

const supabase = createClient(url, key);

type Row = {
  id: string;
  vehicle_id: string;
  start_date: string;
  end_date: string;
  source: string;
  reason: string | null;
  cancelled_at?: string | null;
  created_at: string;
};

function reasonLooksCancelled(reason: string | null): boolean {
  if (!reason) return false;
  return /cancel(?:led|ed|lation)/i.test(reason);
}

async function fetchTuroRows(): Promise<{ rows: Row[]; hasCancelledAt: boolean }> {
  const full = await supabase
    .from("blocked_dates")
    .select("id, vehicle_id, start_date, end_date, source, reason, cancelled_at, created_at")
    .eq("source", "turo-email")
    .order("created_at", { ascending: false });

  if (!full.error) {
    return { rows: (full.data || []) as Row[], hasCancelledAt: true };
  }

  const minimal = await supabase
    .from("blocked_dates")
    .select("id, vehicle_id, start_date, end_date, source, reason, created_at")
    .eq("source", "turo-email")
    .order("created_at", { ascending: false });

  if (minimal.error) throw new Error(minimal.error.message);
  return { rows: (minimal.data || []) as Row[], hasCancelledAt: false };
}

async function main() {
  const { rows, hasCancelledAt } = await fetchTuroRows();
  const today = new Date().toISOString().slice(0, 10);

  const markedCancelled = hasCancelledAt ? rows.filter((r) => r.cancelled_at) : [];
  const active = hasCancelledAt ? rows.filter((r) => !r.cancelled_at) : rows;
  const reasonCancelled = active.filter((r) => reasonLooksCancelled(r.reason));

  console.log(`cancelled_at column: ${hasCancelledAt ? "yes" : "NO — run supabase-turo-cancellations.sql"}`);
  console.log(`Total Turo trips: ${rows.length}`);
  console.log(`Marked cancelled_at: ${markedCancelled.length}`);
  console.log(`Active: ${active.length}`);
  console.log(`Active with cancel in reason: ${reasonCancelled.length}`);

  // Duplicate active trips: same vehicle + start + end
  const dupKey = (r: Row) => `${r.vehicle_id}|${r.start_date}|${r.end_date}`;
  const groups = new Map<string, Row[]>();
  for (const r of active) {
    const k = dupKey(r);
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k)!.push(r);
  }
  const duplicateGroups = [...groups.entries()].filter(([, g]) => g.length > 1);

  if (duplicateGroups.length) {
    console.log(`\nDuplicate active trip groups: ${duplicateGroups.length}`);
    for (const [k, g] of duplicateGroups) {
      console.log(`  ${k} (${g.length} rows)`);
      for (const r of g) console.log(`    - ${r.id} created ${r.created_at}  ${r.reason ?? ""}`);
    }
  }

  if (markedCancelled.length) {
    console.log("\n--- cancelled_at set ---");
    for (const r of markedCancelled) {
      console.log(`  ${r.id}  ${r.start_date}→${r.end_date}  ${r.reason ?? ""}`);
    }
  }

  if (reasonCancelled.length) {
    console.log("\n--- cancel in reason (still active) ---");
    for (const r of reasonCancelled) {
      console.log(`  ${r.id}  ${r.start_date}→${r.end_date}  ${r.reason ?? ""}`);
    }
  }

  const pastActive = active.filter((r) => r.end_date < today && !reasonLooksCancelled(r.reason));
  console.log(`\nPast completed active trips: ${pastActive.length}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
