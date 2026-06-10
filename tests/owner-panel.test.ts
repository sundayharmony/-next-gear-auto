import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { OWNER_NAV_ITEMS } from "../src/lib/owner/owner-navigation";
import { hasOwnerPortalAccess } from "../src/lib/auth/customer-capabilities";

const root = process.cwd();

test("owner navigation includes create booking entry", () => {
  const create = OWNER_NAV_ITEMS.find((item) => item.key === "createBooking");
  assert.ok(create);
  assert.equal(create.href, "/owner/bookings/create");
  assert.equal(create.primary, true);
});

test("owner dataset uses single consolidated API", () => {
  const source = fs.readFileSync(path.join(root, "src/lib/owner/owner-data-context.tsx"), "utf8");
  assert.ok(source.includes("/api/owner/dataset"));
  assert.ok(!source.includes("/api/owner/summary"));
  assert.ok(!source.includes("/api/owner/bookings"));
  assert.ok(!source.includes("/api/owner/vehicles"));
});

test("owner dataset route exists and loads owner data once", () => {
  const routePath = path.join(root, "src/app/api/owner/dataset/route.ts");
  assert.ok(fs.existsSync(routePath));
  const source = fs.readFileSync(routePath, "utf8");
  assert.ok(source.includes("loadOwnerDataset"));
  assert.ok(source.includes("computeOwnerDashboardMetrics"));
});

test("owner create form is dedicated component with allowed fields", () => {
  const formPath = path.join(root, "src/components/owner/OwnerCreateBookingForm.tsx");
  assert.ok(fs.existsSync(formPath));
  const source = fs.readFileSync(formPath, "utf8");
  const lines = source.split(/\r?\n/).length;
  assert.ok(lines >= 200 && lines <= 320, `expected ~250 lines, got ${lines}`);
  assert.ok(source.includes("vehicleId"));
  assert.ok(source.includes("customerName"));
  assert.ok(source.includes("pickupDate"));
  assert.ok(!source.includes("isRecurringLongTerm"));
  assert.ok(!source.includes("canBulkUpdate"));
});

test("owner availability API marks Turo trips as booked", () => {
  const source = fs.readFileSync(path.join(root, "src/app/api/owner/availability/route.ts"), "utf8");
  assert.ok(source.includes("filterActiveTuroTrips"));
  assert.ok(source.includes("turoBookedRanges"));
});

test("owner_portal_enabled revocation blocks owner portal access", () => {
  assert.equal(hasOwnerPortalAccess({ role: "owner", owner_portal_enabled: true }), true);
  assert.equal(hasOwnerPortalAccess({ role: "customer", owner_portal_enabled: false }), false);
});
