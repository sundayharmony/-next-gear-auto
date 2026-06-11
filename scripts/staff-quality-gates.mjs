/**
 * Lightweight quality gates for staff UI (no Playwright).
 * Run: node scripts/staff-quality-gates.mjs
 */
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const failures = [];

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

// 1) Unified bottom tab bar must include dialog semantics on More sheet
const staffTabBar = read("src/components/staff/staff-bottom-tab-bar.tsx");
if (!staffTabBar.includes('role="dialog"')) {
  failures.push("staff-bottom-tab-bar.tsx: More sheet must include role=dialog");
}
if (!staffTabBar.includes('aria-current={active ? "page"')) {
  failures.push("staff-bottom-tab-bar.tsx: primary tabs must set aria-current on active link");
}

// 2) Legacy per-panel tab bars should delegate to shared component
for (const rel of [
  "src/components/admin/bottom-tab-bar.tsx",
  "src/components/manager/bottom-tab-bar.tsx",
  "src/components/owner/bottom-tab-bar.tsx",
]) {
  const s = read(rel);
  if (!s.includes("StaffBottomTabBar")) {
    failures.push(`${rel}: must use StaffBottomTabBar`);
  }
  if (s.includes('role="tablist"') || s.includes("role='tablist'")) {
    failures.push(`${rel}: remove role=tablist from route navigation`);
  }
}

// 3) adminFetch must use role-aware redirect helper
const adminFetch = read("src/lib/utils/admin-fetch.ts");
if (!adminFetch.includes("getStaffLoginRedirectPath")) {
  failures.push("admin-fetch.ts: missing getStaffLoginRedirectPath for 401 redirect");
}

// 4) Staff overlays using fixed inset-0 should declare dialog semantics or use Sheet/Modal
const overlayCandidates = [
  "src/app/admin/bookings/components/create-booking-shell.tsx",
  "src/components/ui/sheet.tsx",
  "src/components/ui/modal.tsx",
];
for (const rel of overlayCandidates) {
  const s = read(rel);
  if (s.includes("fixed inset-0") && !s.includes('role="dialog"') && !s.includes("DialogPrimitive")) {
    failures.push(`${rel}: fixed inset-0 overlay should include dialog semantics or use Dialog primitive`);
  }
}

if (failures.length > 0) {
  console.error("Staff quality gates failed:");
  for (const f of failures) console.error(` - ${f}`);
  process.exit(1);
}

console.log("Staff quality gates passed.");
