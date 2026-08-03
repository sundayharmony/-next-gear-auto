/**
 * Backfill a single Turo trip location via production webhook.
 * Usage: npx tsx --env-file=.env.local scripts/backfill-trip-location.ts
 */
import { createClient } from "@supabase/supabase-js";

const secret = process.env.TURO_WEBHOOK_SECRET;
const site = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.rentnextgearauto.com").replace(
  /\/$/,
  ""
);

const trips = [
  {
    guest: "Seongyeop",
    subject: "Seongyeop's trip is booked.",
    emailText:
      "Toyota Highlander 2019 booked by Seongyeop Trip start: 7/6/26 7:30 AM Trip end: 7/9/26 10:00 PM You earn: $179.55 Mileage included: 800 miles",
    emailHtml: `<div>Cha-ching! Seongyeop's trip with your Toyota Highlander at <b>Newark Liberty International Airport</b> is booked from Monday, July 6, 2026, 7:30 AM to Thursday, July 9, 2026, 10:00 PM.</div>
<div>DELIVERY</div><div>Newark, NJ</div><div>Newark Liberty International Airport</div>
<div>Guests see: You'll check yourself in with a lockbox.</div>`,
    dbGuest: "Seongyeop",
  },
  {
    guest: "Scott",
    subject: "Scott's trip with your 2023 Toyota Camry Hybrid is booked!",
    emailText:
      "Toyota Camry Hybrid 2023 booked by Scott Trip start: 7/11/26 7:00 PM Trip end: 7/13/26 5:00 PM You earn: $151.42",
    emailHtml: `<div>Scott's trip with your Toyota Camry Hybrid at <b>Newark Liberty International Airport</b> is booked from Saturday, July 11, 2026, 7:00 PM to Monday, July 13, 2026, 5:00 PM.</div>
<div>DELIVERY</div><div>Newark, NJ</div><div>Newark Liberty International Airport</div>`,
    dbGuest: "Scott",
  },
  {
    guest: "Bledi",
    subject: "Bledi's trip with your 2024 JEEP Grand Cherokee is booked!",
    emailText:
      "Jeep Grand Cherokee 2024 booked by Bledi Trip start: 7/18/26 7:00 PM Trip end: 7/24/26 5:00 PM You earn: $312.70",
    emailHtml: `<div>Bledi's trip with your Jeep Grand Cherokee at <b>Newark Liberty International Airport</b> is booked from Saturday, July 18, 2026, 7:00 PM to Friday, July 24, 2026, 5:00 PM.</div>
<div>DELIVERY</div><div>Newark, NJ</div><div>Newark Liberty International Airport</div>`,
    dbGuest: "Bledi",
  },
];

async function main() {
  if (!secret) {
    console.error("TURO_WEBHOOK_SECRET required");
    process.exit(1);
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );

  for (const trip of trips) {
    const res = await fetch(`${site}/api/webhooks/turo-email`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secret}`,
        "Content-Type": "application/json",
        "x-idempotency-key": `cli-loc-${trip.guest}-${Date.now()}`,
        "x-webhook-timestamp": String(Date.now()),
      },
      body: JSON.stringify({
        emailText: trip.emailText,
        emailHtml: trip.emailHtml,
        subject: trip.subject,
        eventType: "reconcile_refresh",
        sourceMode: "location_backfill",
      }),
    });
    const body = await res.text();
    console.log(`\n${trip.guest}: HTTP ${res.status} ${body.slice(0, 400)}`);

    const { data } = await supabase
      .from("blocked_dates")
      .select("id, location, reason")
      .eq("source", "turo-email")
      .ilike("reason", `%${trip.dbGuest}%`)
      .is("cancelled_at", null)
      .order("start_date", { ascending: false })
      .limit(1);
    console.log("DB:", data?.[0]);
  }
}

main().catch(console.error);
