import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const failures = [];

/** Admin-only panel features → primary GET API route files (manager must not read via verifyAdminOrManager). */
const ADMIN_ONLY_GET_ROUTES = [
  { feature: "blockedDates", file: "src/app/api/admin/blocked-dates/route.ts" },
  { feature: "finances", file: "src/app/api/admin/expenses/route.ts" },
  { feature: "finances", file: "src/app/api/admin/owner-payouts/route.ts" },
  { feature: "finances", file: "src/app/api/admin/booking-payments/route.ts" },
  { feature: "managers", file: "src/app/api/admin/managers/route.ts" },
  { feature: "owners", file: "src/app/api/admin/owners/route.ts" },
];

function extractGetHandler(source) {
  const idx = source.indexOf("export async function GET");
  if (idx === -1) return null;
  const rest = source.slice(idx);
  const nextExport = rest.indexOf("\nexport async function ", 1);
  return nextExport === -1 ? rest : rest.slice(0, nextExport);
}

for (const entry of ADMIN_ONLY_GET_ROUTES) {
  const abs = path.join(root, entry.file);
  if (!fs.existsSync(abs)) {
    failures.push(`Missing admin-only API route for ${entry.feature}: ${entry.file}`);
    continue;
  }

  const source = fs.readFileSync(abs, "utf8");
  const getHandler = extractGetHandler(source);
  if (!getHandler) continue;

  if (getHandler.includes("verifyAdminOrManager")) {
    failures.push(
      `${entry.file}: GET must use verifyAdmin (admin-only feature "${entry.feature}")`
    );
  }
  if (!getHandler.includes("verifyAdmin(")) {
    failures.push(`${entry.file}: GET missing verifyAdmin() for admin-only feature "${entry.feature}"`);
  }
}

if (failures.length > 0) {
  console.error("API auth matrix check failed:");
  for (const failure of failures) {
    console.error(` - ${failure}`);
  }
  process.exit(1);
}

console.log("API auth matrix check passed.");
