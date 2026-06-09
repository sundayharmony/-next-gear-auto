import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  adminPanelConfig,
  managerPanelConfig,
} from "../src/lib/admin/staff-panel-config";
import { getManagerFeatures } from "../src/lib/admin/panel-registry";
import {
  canManageBooking,
  canViewBookingFinancials,
  redactBookingFinancials,
} from "../src/lib/bookings/financial-access";
import { isManagerPanelAccessEnabled } from "../src/lib/auth/manager-access";
import { managerBookingsConfig } from "../src/app/admin/bookings/config";

const root = process.cwd();

test("staff panel configs expose distinct panel bases", () => {
  assert.equal(adminPanelConfig.panelBase, "/admin");
  assert.equal(managerPanelConfig.panelBase, "/manager");
  assert.equal(adminPanelConfig.capabilities.canViewBlockedDatesLink, true);
  assert.equal(managerPanelConfig.capabilities.canViewBlockedDatesLink, false);
});

test("manager shared pages reference admin UI sources", () => {
  const shared = getManagerFeatures().filter((f) => f.key !== "dashboard" && f.key !== "analytics");
  for (const feature of shared) {
    const pagePath =
      feature.managerPath === "/manager"
        ? path.join(root, "src/app/manager/page.tsx")
        : path.join(root, `src/app${feature.managerPath}/page.tsx`);
    const source = fs.readFileSync(pagePath, "utf8");
    assert.ok(
      source.includes("@/app/admin/"),
      `${feature.key} manager page should reuse admin UI`
    );
  }
});

test("StaffPanelShell enables link prefetch", () => {
  const shell = fs.readFileSync(
    path.join(root, "src/components/staff/StaffPanelShell.tsx"),
    "utf8"
  );
  assert.ok(!shell.includes("prefetch={false}"), "staff nav links should use default prefetch");
});

test("redactBookingFinancials hides money fields for unauthorized managers", () => {
  const row = {
    id: "b1",
    total_price: 500,
    deposit: 100,
    is_payment_overdue: true,
  };
  const redacted = redactBookingFinancials(row, false);
  assert.equal(redacted.total_price, null);
  assert.equal(redacted.deposit, null);
  assert.equal(redacted.is_payment_overdue, null);
  assert.equal(redacted.canViewPricing, false);

  const visible = redactBookingFinancials(row, true);
  assert.equal(visible.total_price, 500);
  assert.equal(visible.canViewPricing, true);
});

test("manager financial access requires explicit grant per booking", () => {
  const booking = { manager_financial_access: false, created_by_user_id: "mgr-1" };
  assert.equal(canViewBookingFinancials("manager", booking), false);
  assert.equal(canViewBookingFinancials("manager", { ...booking, manager_financial_access: true }), true);
  assert.equal(canViewBookingFinancials("admin", booking), true);
});

test("manager_access_enabled revocation blocks panel access", () => {
  assert.equal(isManagerPanelAccessEnabled({ role: "manager", manager_access_enabled: true }), true);
  assert.equal(isManagerPanelAccessEnabled({ role: "manager", manager_access_enabled: false }), false);
  assert.equal(isManagerPanelAccessEnabled({ role: "manager" }), true);
  assert.equal(isManagerPanelAccessEnabled({ role: "admin" }), true);
});

test("canManageBooking is independent of financial visibility", () => {
  const booking = { created_by_user_id: "mgr-1", manager_financial_access: false };
  assert.equal(canManageBooking("manager", booking, "mgr-1"), true);
  assert.equal(canManageBooking("manager", booking, "other"), false);
  assert.equal(canViewBookingFinancials("manager", booking), false);
});

test("manager bookings config restricts bulk and export capabilities", () => {
  assert.equal(managerBookingsConfig.mode, "manager");
  assert.equal(managerBookingsConfig.capabilities.canBulkUpdate, false);
  assert.equal(managerBookingsConfig.capabilities.canExportCsv, false);
  assert.equal(managerBookingsConfig.capabilities.canCreateBookings, true);
});
