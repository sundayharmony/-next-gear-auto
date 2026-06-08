/**
 * CLI wrapper for Turo cancellation sync.
 * Usage:
 *   npx tsx --env-file=.env.local scripts/sync-turo-cancellations.ts
 *   npx tsx --env-file=.env.local scripts/sync-turo-cancellations.ts --apply --delete
 *   npx tsx --env-file=.env.local scripts/sync-turo-cancellations.ts --apply --emails-file emails.txt
 */
import { readFileSync, existsSync } from "fs";
import {
  listTuroCancellationStatus,
  syncTuroCancellations,
} from "../src/lib/admin/turo-cancellation-sync";

const args = process.argv.slice(2);
const apply = args.includes("--apply");
const deleteRows = args.includes("--delete");
const emailsFileIdx = args.indexOf("--emails-file");
const emailsFile = emailsFileIdx >= 0 ? args[emailsFileIdx + 1] : null;
const tripIdsIdx = args.indexOf("--trip-ids");
const tripIds =
  tripIdsIdx >= 0
    ? args[tripIdsIdx + 1]
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    : undefined;

function splitEmails(raw: string): string[] {
  return raw
    .split(/\n---+\n|\n={3,}\n/)
    .map((s) => s.trim())
    .filter((s) => s.length > 30);
}

async function main() {
  const audit = await listTuroCancellationStatus();
  console.log("Audit:", {
    hasCancelledAt: audit.hasCancelledAt,
    total: audit.total,
    active: audit.active,
    cancelled: audit.cancelled,
  });

  if (!apply) {
    console.log("\nDry run only. Re-run with --apply to mark/delete matched trips.");
    if (audit.cancelled > 0) {
      console.log("Already-cancelled rows (use --apply --delete to purge):");
      for (const row of audit.cancelledRows) {
        console.log(`  ${row.id}  ${row.start_date}→${row.end_date}  ${row.reason ?? ""}`);
      }
    }
    return;
  }

  const emails =
    emailsFile && existsSync(emailsFile) ? splitEmails(readFileSync(emailsFile, "utf8")) : undefined;

  const result = await syncTuroCancellations({
    emails,
    tripIds,
    deleteRows,
    purgeAlreadyCancelled: true,
  });

  console.log("\nResult:", result);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
