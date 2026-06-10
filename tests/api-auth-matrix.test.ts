import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const OWNER_ROUTES = [
  "src/app/api/owner/dataset/route.ts",
  "src/app/api/owner/bookings/route.ts",
  "src/app/api/owner/availability/route.ts",
  "src/app/api/owner/finance/route.ts",
  "src/app/api/owner/notifications/route.ts",
  "src/app/api/owner/notifications/unread-count/route.ts",
  "src/app/api/owner/summary/route.ts",
  "src/app/api/owner/vehicles/route.ts",
];

const ADMIN_ONLY_GET_ROUTES = [
  "src/app/api/admin/blocked-dates/route.ts",
  "src/app/api/admin/expenses/route.ts",
  "src/app/api/admin/owner-payouts/route.ts",
  "src/app/api/admin/booking-payments/route.ts",
  "src/app/api/admin/managers/route.ts",
  "src/app/api/admin/owners/route.ts",
  "src/app/api/admin/booking-activity/route.ts",
];

test("owner API routes use verifyOwnerWithPortalAccess", () => {
  for (const rel of OWNER_ROUTES) {
    const source = fs.readFileSync(path.join(root, rel), "utf8");
    assert.ok(
      source.includes("verifyOwnerWithPortalAccess"),
      `${rel} must import and call verifyOwnerWithPortalAccess`
    );
    assert.ok(
      !source.includes("verifyOwner(req)"),
      `${rel} must not call bare verifyOwner(req)`
    );
  }
});

test("admin-only GET routes use verifyAdmin", () => {
  for (const rel of ADMIN_ONLY_GET_ROUTES) {
    const source = fs.readFileSync(path.join(root, rel), "utf8");
    const getIdx = source.indexOf("export async function GET");
    assert.ok(getIdx !== -1, `${rel} should have GET handler`);
    const rest = source.slice(getIdx);
    const nextExport = rest.indexOf("\nexport async function ", 1);
    const getHandler = nextExport === -1 ? rest : rest.slice(0, nextExport);
    assert.ok(getHandler.includes("verifyAdmin("), `${rel} GET must call verifyAdmin()`);
    assert.ok(
      !getHandler.includes("verifyAdminOrManager"),
      `${rel} GET must not use verifyAdminOrManager`
    );
  }
});

test(".env.example documents JWT and legacy header flag", () => {
  const envExample = fs.readFileSync(path.join(root, ".env.example"), "utf8");
  assert.ok(envExample.includes("JWT_SECRET"));
  assert.ok(envExample.includes("ALLOW_LEGACY_ADMIN_HEADER"));
});
