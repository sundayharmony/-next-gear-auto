import Stripe from "stripe";

async function main() {
  const sk = process.env.STRIPE_SECRET_KEY?.trim();
  const wh = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  const site = process.env.NEXT_PUBLIC_SITE_URL?.trim();

  console.log("STRIPE_SECRET_KEY:", sk ? `set (${sk.slice(0, 7)}...)` : "MISSING");
  console.log(
    "STRIPE_WEBHOOK_SECRET:",
    wh && !wh.includes("REPLACE") ? "set" : "MISSING or placeholder"
  );
  console.log("NEXT_PUBLIC_SITE_URL:", site || "MISSING");

  if (!sk) {
    console.log("Stripe API: skipped (no secret key)");
    process.exit(1);
  }

  const stripe = new Stripe(sk);
  try {
    const balance = await stripe.balance.retrieve();
    console.log("Stripe API: OK");
    console.log("Stripe mode:", sk.startsWith("sk_live") ? "live" : "test");
    console.log("Available balance (USD cents):", balance.available.find((b) => b.currency === "usd")?.amount ?? "n/a");
  } catch (err) {
    console.error("Stripe API error:", err instanceof Error ? err.message : err);
    process.exit(1);
  }
}

main();
