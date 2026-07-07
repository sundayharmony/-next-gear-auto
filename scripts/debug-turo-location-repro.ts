/**
 * Debug repro: parse a Turo email and POST to the local webhook.
 * Usage: npx tsx --env-file=.env.local scripts/debug-turo-location-repro.ts
 */
import { readFileSync } from "fs";
import { parseTuroEmail, sanitizeLocation } from "../src/lib/utils/turo-email-parser";

const webhookUrl =
  process.env.TURO_WEBHOOK_URL || "http://localhost:3000/api/webhooks/turo-email";
const secret = process.env.TURO_WEBHOOK_SECRET;

async function main() {
  const sample = JSON.parse(
    readFileSync("scripts/turo-booking-emails.sample.json", "utf8")
  )[0] as { subject: string; emailText: string };

  const parsed = parseTuroEmail(sample.emailText, sample.subject);
  const tripLocation = sanitizeLocation(parsed.location);
  console.log("Parsed location:", parsed.location);
  console.log("Sanitized tripLocation:", tripLocation);
  console.log("Raw matches:", parsed.rawMatches.filter((m) => /location/i.test(m)));

  if (!secret) {
    console.error("TURO_WEBHOOK_SECRET missing — parser-only run complete.");
    return;
  }

  const res = await fetch(webhookUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secret}`,
      "Content-Type": "application/json",
      "x-idempotency-key": `debug-loc-${Date.now()}`,
      "x-webhook-timestamp": String(Date.now()),
    },
    body: JSON.stringify({
      emailText: sample.emailText,
      subject: sample.subject,
      eventType: "reconcile_refresh",
      sourceMode: "location_backfill",
    }),
  });
  console.log("Webhook status:", res.status);
  console.log(await res.text());
}

main().catch(console.error);
