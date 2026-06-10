import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const STAFF_LAYOUTS = [
  "src/app/admin/layout.tsx",
  "src/app/manager/layout.tsx",
  "src/app/owner/layout.tsx",
];

const NOTIFICATION_HOOKS = [
  "src/lib/hooks/use-staff-notifications.ts",
];

test("staff panel layouts import StaffPanelShell", () => {
  for (const rel of STAFF_LAYOUTS) {
    const source = fs.readFileSync(path.join(root, rel), "utf8");
    assert.ok(
      source.includes("StaffPanelShell"),
      `${rel} should wrap content in StaffPanelShell`
    );
  }
});

test("notification hooks import React hooks from react", () => {
  for (const rel of NOTIFICATION_HOOKS) {
    const source = fs.readFileSync(path.join(root, rel), "utf8");
    assert.match(source, /from\s+["']react["']/);
    if (/\buseMemo\s*\(/.test(source)) {
      assert.match(source, /useMemo/);
      assert.ok(
        /import\s+\{[^}]*useMemo[^}]*\}\s+from\s+["']react["']/.test(source),
        `${rel} must import useMemo from react`
      );
    }
  }
});

test("admin heavy routes have error boundaries", () => {
  const routes = [
    "tickets",
    "maintenance",
    "vehicles",
    "blocked-dates",
    "messages",
    "invoices",
    "bookings",
    "calendar",
    "finances",
    "customers",
  ];
  for (const route of routes) {
    const errorPath = path.join(root, `src/app/admin/${route}/error.tsx`);
    assert.ok(fs.existsSync(errorPath), `missing error boundary: admin/${route}/error.tsx`);
    const source = fs.readFileSync(errorPath, "utf8");
    assert.ok(source.includes("StaffPanelError"), `${route} error.tsx should use StaffPanelError`);
  }
});
