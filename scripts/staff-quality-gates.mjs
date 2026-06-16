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

function walkTsx(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const name of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, name.name);
    if (name.isDirectory() && name.name !== "node_modules") walkTsx(full, out);
    else if (name.isFile() && /\.(tsx|ts)$/.test(name.name)) out.push(full);
  }
  return out;
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

// 4) Staff overlay z-index tier must exist
const staffOverlayZ = read("src/components/staff/staff-overlay-z.ts");
if (!staffOverlayZ.includes("z-[100]")) {
  failures.push("staff-overlay-z.ts: must export STAFF_OVERLAY_Z at z-[100]");
}

// 5) Staff overlay primitives must declare dialog semantics
for (const rel of [
  "src/components/staff/staff-overlay.tsx",
  "src/components/ui/sheet.tsx",
  "src/components/ui/modal.tsx",
]) {
  const s = read(rel);
  if (!s.includes('role="dialog"') && !s.includes("DialogPrimitive")) {
    failures.push(`${rel}: staff overlay primitive must include dialog semantics`);
  }
}

// 6) Admin staff routes: avoid fixed inset-0 z-50 (below tab bar z-91)
const adminDir = path.join(root, "src/app/admin");
for (const file of walkTsx(adminDir)) {
  const rel = path.relative(root, file).replace(/\\/g, "/");
  const s = fs.readFileSync(file, "utf8");
  if (
    s.includes("fixed inset-0 z-50") &&
    !rel.includes("loading.tsx") &&
    !rel.includes(".test.")
  ) {
    failures.push(
      `${rel}: fixed inset-0 z-50 sits below bottom tab bar — use STAFF_OVERLAY_Z, Sheet tier="staff", or StaffSidePanel`
    );
  }
}

// 7) Public booking overlays should use BookingPickerOverlay
for (const rel of [
  "src/app/booking/components/calendar-overlays.tsx",
  "src/app/booking/components/time-picker-overlay.tsx",
]) {
  const s = read(rel);
  if (!s.includes("BookingPickerOverlay")) {
    failures.push(`${rel}: must use BookingPickerOverlay for dialog a11y`);
  }
}

if (failures.length > 0) {
  console.error("Staff quality gates failed:");
  for (const f of failures) console.error(` - ${f}`);
  process.exit(1);
}

console.log("Staff quality gates passed.");
