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
  { feature: "bookingActivity", file: "src/app/api/admin/booking-activity/route.ts" },
];

/** All owner API routes must enforce portal-access revocation. */
const OWNER_ROUTE_FILES = [
  "src/app/api/owner/dataset/route.ts",
  "src/app/api/owner/bookings/route.ts",
  "src/app/api/owner/availability/route.ts",
  "src/app/api/owner/finance/route.ts",
  "src/app/api/owner/notifications/route.ts",
  "src/app/api/owner/notifications/unread-count/route.ts",
  "src/app/api/owner/summary/route.ts",
  "src/app/api/owner/vehicles/route.ts",
];

function extractGetHandler(source) {
  const idx = source.indexOf("export async function GET");
  if (idx === -1) return null;
  const rest = source.slice(idx);
  const nextExport = rest.indexOf("\nexport async function ", 1);
  return nextExport === -1 ? rest : rest.slice(0, nextExport);
}

function extractHandler(source, method) {
  const needle = `export async function ${method}`;
  const idx = source.indexOf(needle);
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

for (const rel of OWNER_ROUTE_FILES) {
  const abs = path.join(root, rel);
  if (!fs.existsSync(abs)) {
    failures.push(`Missing owner API route: ${rel}`);
    continue;
  }

  const source = fs.readFileSync(abs, "utf8");
  for (const method of ["GET", "POST", "PUT", "PATCH", "DELETE"]) {
    const handler = extractHandler(source, method);
    if (!handler) continue;
    if (handler.includes("verifyOwner(") && !handler.includes("verifyOwnerWithPortalAccess(")) {
      failures.push(`${rel}: ${method} must use verifyOwnerWithPortalAccess (not verifyOwner)`);
    }
    if (!handler.includes("verifyOwnerWithPortalAccess(")) {
      failures.push(`${rel}: ${method} missing verifyOwnerWithPortalAccess()`);
    }
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
