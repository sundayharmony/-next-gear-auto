/**
 * One-time repair for resurrected / duplicate Turo trips.
 *
 * Usage:
 *   npx tsx --env-file=.env.local scripts/repair-turo-cancelled-duplicates.ts
 *   npx tsx --env-file=.env.local scripts/repair-turo-cancelled-duplicates.ts --apply
 */
import { createClient } from "@supabase/supabase-js";
import {
  CANCELLED_REASON_PREFIX,
  TURO_BLOCKED_SOURCE,
  isBlockedDateCancelled,
} from "../src/lib/utils/blocked-dates";
import { getTuroDriverFromReason } from "../src/lib/utils/turo-blocked-date";
import { reasonMatchesTuroGuest } from "../src/lib/utils/turo-cancellation-match";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_KEY;
if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_KEY");
  process.exit(1);
}

const apply = process.argv.includes("--apply");
const supabase = createClient(url, key);

type Row = {
  id: string;
  vehicle_id: string;
  start_date: string;
  end_date: string;
  reason: string | null;
  cancelled_at: string | null;
  created_at: string;
};

function dupKey(row: Row): string {
  const guest = getTuroDriverFromReason(row.reason)?.toLowerCase() || "";
  return `${row.vehicle_id}|${row.start_date}|${row.end_date}|${guest}`;
}

function guestsCompatible(a: Row, b: Row): boolean {
  const guestA = getTuroDriverFromReason(a.reason);
  const guestB = getTuroDriverFromReason(b.reason);
  if (guestA && guestB) return reasonMatchesTuroGuest(a.reason, guestB) || reasonMatchesTuroGuest(b.reason, guestA);
  return true;
}

async function fetchRows(): Promise<{ rows: Row[]; hasCancelledAt: boolean }> {
  const full = await supabase
    .from("blocked_dates")
    .select("id, vehicle_id, start_date, end_date, reason, cancelled_at, created_at, source")
    .eq("source", TURO_BLOCKED_SOURCE)
    .order("created_at", { ascending: true });

  if (!full.error) {
    return { rows: (full.data || []) as Row[], hasCancelledAt: true };
  }

  const minimal = await supabase
    .from("blocked_dates")
    .select("id, vehicle_id, start_date, end_date, reason, created_at, source")
    .eq("source", TURO_BLOCKED_SOURCE)
    .order("created_at", { ascending: true });

  if (minimal.error) throw new Error(minimal.error.message);
  return {
    rows: ((minimal.data || []) as Omit<Row, "cancelled_at">[]).map((r) => ({
      ...r,
      cancelled_at: null,
    })),
    hasCancelledAt: false,
  };
}

async function markCancelled(row: Row, hasCancelledAt: boolean, when: string): Promise<void> {
  if (hasCancelledAt) {
    const { error } = await supabase.from("blocked_dates").update({ cancelled_at: when }).eq("id", row.id);
    if (error) throw new Error(error.message);
    return;
  }

  const reason = row.reason?.trimStart().startsWith(CANCELLED_REASON_PREFIX)
    ? row.reason
    : `${CANCELLED_REASON_PREFIX} ${when} — ${row.reason || "Turo trip"}`;
  const { error } = await supabase.from("blocked_dates").update({ reason }).eq("id", row.id);
  if (error) throw new Error(error.message);
}

async function main() {
  const { rows, hasCancelledAt } = await fetchRows();
  const when = new Date().toISOString();
  const active = rows.filter((r) => !isBlockedDateCancelled(r));
  const cancelled = rows.filter((r) => isBlockedDateCancelled(r));

  const toCancel = new Map<string, { row: Row; reason: string }>();

  // 1. Resurrection pairs — active row with a cancelled twin for same trip
  for (const act of active) {
    const twin = cancelled.find(
      (c) =>
        c.vehicle_id === act.vehicle_id &&
        c.start_date === act.start_date &&
        c.end_date === act.end_date &&
        guestsCompatible(act, c)
    );
    if (twin) {
      toCancel.set(act.id, {
        row: act,
        reason: `Resurrection duplicate of cancelled row ${twin.id}`,
      });
    }
  }

  // 2. Orphan active duplicates — keep newest per vehicle+dates+guest
  const activeGroups = new Map<string, Row[]>();
  for (const act of active) {
    if (toCancel.has(act.id)) continue;
    const k = dupKey(act);
    if (!activeGroups.has(k)) activeGroups.set(k, []);
    activeGroups.get(k)!.push(act);
  }
  for (const [, group] of activeGroups) {
    if (group.length < 2) continue;
    const sorted = [...group].sort((a, b) => b.created_at.localeCompare(a.created_at));
    for (const dup of sorted.slice(1)) {
      toCancel.set(dup.id, {
        row: dup,
        reason: `Duplicate active trip (keeping ${sorted[0].id})`,
      });
    }
  }

  // 3. Legacy reason-prefix rows missing cancelled_at
  const legacyPrefix: Row[] = [];
  if (hasCancelledAt) {
    for (const row of rows) {
      if (row.cancelled_at) continue;
      if (row.reason?.trimStart().startsWith(CANCELLED_REASON_PREFIX)) {
        legacyPrefix.push(row);
      }
    }
  }

  console.log(`Mode: ${apply ? "APPLY" : "dry run"}`);
  console.log(`Total Turo rows: ${rows.length}`);
  console.log(`Active before repair: ${active.length}`);
  console.log(`Cancelled before repair: ${cancelled.length}`);
  console.log(`Resurrection/duplicate active to cancel: ${toCancel.size}`);
  console.log(`Legacy [CANCELLED] prefix to backfill cancelled_at: ${legacyPrefix.length}\n`);

  for (const { row, reason } of toCancel.values()) {
    console.log(`  cancel ${row.id}  ${row.start_date}→${row.end_date}  ${reason}`);
  }
  for (const row of legacyPrefix) {
    console.log(`  backfill cancelled_at ${row.id}  ${row.start_date}→${row.end_date}`);
  }

  if (!apply) {
    console.log("\nRe-run with --apply to write changes.");
    return;
  }

  let cancelledCount = 0;
  let backfilled = 0;
  const errors: string[] = [];

  for (const { row } of toCancel.values()) {
    try {
      await markCancelled(row, hasCancelledAt, when);
      cancelledCount++;
    } catch (e) {
      errors.push(`${row.id}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  for (const row of legacyPrefix) {
    try {
      const { error } = await supabase.from("blocked_dates").update({ cancelled_at: when }).eq("id", row.id);
      if (error) throw new Error(error.message);
      backfilled++;
    } catch (e) {
      errors.push(`${row.id}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  console.log(`\nApplied: ${cancelledCount} active rows cancelled, ${backfilled} legacy rows backfilled`);
  if (errors.length) {
    console.log(`Errors (${errors.length}):`);
    for (const err of errors) console.log(`  ${err}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
