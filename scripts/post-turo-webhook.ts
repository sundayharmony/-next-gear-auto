/**
 * POST cancellation emails to the Turo webhook (local or production).
 * Usage: npx tsx --env-file=.env.local scripts/post-turo-webhook.ts --url https://www.rentnextgearauto.com/api/webhooks/turo-email --file emails.txt
 */
import { readFileSync, existsSync } from "fs";

const args = process.argv.slice(2);
const urlIdx = args.indexOf("--url");
const fileIdx = args.indexOf("--file");
const webhookUrl =
  (urlIdx >= 0 ? args[urlIdx + 1] : null) ||
  process.env.TURO_WEBHOOK_URL ||
  "http://localhost:3000/api/webhooks/turo-email";
const file = fileIdx >= 0 ? args[fileIdx + 1] : null;
const secret = process.env.TURO_WEBHOOK_SECRET;

if (!secret) {
  console.error("TURO_WEBHOOK_SECRET required");
  process.exit(1);
}
if (!file || !existsSync(file)) {
  console.error("--file required");
  process.exit(1);
}

const emails = readFileSync(file, "utf8")
  .split(/\n---+\n/)
  .map((s) => s.trim())
  .filter((s) => s.length > 30);

async function main() {
  console.log(`Posting ${emails.length} email(s) to ${webhookUrl}`);
  for (const emailText of emails) {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secret}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ emailText }),
    });
    const body = await res.text();
    console.log(`\n${res.status} ${body.slice(0, 500)}`);
  }
}

main().catch(console.error);
