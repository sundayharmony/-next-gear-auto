/**
 * Report Turo trips missing pickup locations and optionally replay booking emails.
 *
 * Usage:
 *   npx tsx --env-file=.env.local scripts/backfill-missing-turo-locations.ts
 *   npx tsx --env-file=.env.local scripts/backfill-missing-turo-locations.ts --emails scripts/turo-booking-emails.json
 *
 * emails JSON: [{ "subject": "Henry's trip...", "emailText": "...", "emailHtml": "..." }, ...]
 *
 * Prefer Gmail Apps Script: resetLocationBackfillOffset() then runLocationBackfill180()
 */
import { readFileSync, existsSync } from "fs";
import { createClient } from "@supabase/supabase-js";
import { storedTuroLocation } from "../src/lib/utils/turo-email-parser";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_KEY;
const secret = process.env.TURO_WEBHOOK_SECRET;
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.rentnextgearauto.com";

if (!url || !key) {
  console.error("Missing Supabase env");
  process.exit(1);
}

const emailsIdx = process.argv.indexOf("--emails");
const emailsFile = emailsIdx >= 0 ? process.argv[emailsIdx + 1] : null;

const supabase = createClient(url, key);

async function main() {
  const today = new Date().toISOString().slice(0, 10);
  const { data: rows, error } = await supabase
    .from("blocked_dates")
    .select("id, start_date, end_date, reason, location")
    .eq("source", "turo-email")
    .is("cancelled_at", null)
    .gte("end_date", today)
    .order("start_date");

  if (error) throw new Error(error.message);

  const missing = (rows || []).filter((r) => !storedTuroLocation(r.location));
  console.log(`Upcoming active Turo trips: ${rows?.length ?? 0}`);
  console.log(`Missing pickup location: ${missing.length}\n`);

  for (const row of missing) {
    console.log(`  ${row.start_date} → ${row.end_date}  ${row.reason ?? ""}`);
  }

  if (!emailsFile) {
    console.log(
      "\nTo backfill: run resetLocationBackfillOffset() + runLocationBackfill180() in Apps Script,"
    );
    console.log(
      "or export booking emails to JSON and run with --emails scripts/turo-booking-emails.json"
    );
    return;
  }

  if (!secret) {
    console.error("TURO_WEBHOOK_SECRET required for --emails replay");
    process.exit(1);
  }
  if (!existsSync(emailsFile)) {
    console.error(`File not found: ${emailsFile}`);
    process.exit(1);
  }

  const emails = JSON.parse(readFileSync(emailsFile, "utf8")) as Array<{
    subject?: string;
    emailText: string;
    emailHtml?: string;
    email_html?: string;
  }>;

  const webhookUrl = `${siteUrl.replace(/\/$/, "")}/api/webhooks/turo-email`;
  console.log(`\nReplaying ${emails.length} email(s) to ${webhookUrl}...`);

  let updated = 0;
  for (let i = 0; i < emails.length; i++) {
    const { emailText, subject, emailHtml, email_html } = emails[i];
    const ts = Date.now();
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secret}`,
        "Content-Type": "application/json",
        "x-idempotency-key": `cli-replay-loc-${ts}-${i}`,
        "x-webhook-timestamp": String(ts),
      },
      body: JSON.stringify({
        emailText,
        emailHtml: emailHtml ?? email_html,
        subject,
        eventType: "reconcile_refresh",
        sourceMode: "location_backfill",
      }),
    });
    const body = await res.json().catch(() => ({}));
    const action = (body as { action?: string }).action;
    const location = (body as { data?: { location?: string } }).data?.location;
    console.log(`  ${res.status} ${action ?? "error"} ${location ?? ""}`);
    if (res.ok && action === "reconcile_metadata") updated++;
  }

  console.log(`\nLocations updated: ${updated}`);

  const { data: after } = await supabase
    .from("blocked_dates")
    .select("id, location")
    .eq("source", "turo-email")
    .is("cancelled_at", null)
    .gte("end_date", today);
  const stillMissing = (after || []).filter((r) => !storedTuroLocation(r.location)).length;
  console.log(`Still missing location: ${stillMissing}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
