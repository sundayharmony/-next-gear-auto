import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const MAX_LINES = 600;

/**
 * Pre-existing admin mega-pages (Phases 4–6). Shrink-only — must not grow.
 * Remove each entry once the file is split to ≤ MAX_LINES, then enforce hard cap.
 * Exit criteria (Phase 10): delete this map; all staff page.tsx ≤ MAX_LINES.
 */
const GRANDFATHERED_MAX = new Map([]);

/**
 * Heavy shared modules — shrink-only caps (must not grow).
 * Split into focused files until each module ≤ MAX_LINES.
 */
const SHRINK_CAPS = new Map([
  ["src/app/admin/bookings/components/BookingDetailPanel.tsx", 220],
  ["src/app/admin/bookings/components/CreateBookingForm.tsx", 950],
  ["src/app/admin/bookings/components/detail/DetailPaymentsSection.tsx", 623],
  ["src/app/admin/calendar/timeline-view.tsx", 641],
  ["src/app/admin/messages/shared-messages-page.tsx", 683],
  ["src/app/admin/blocked-dates/blocked-dates-drawer.tsx", 711],
  ["src/app/admin/vehicles/vehicle-form.tsx", 601],
]);

/** Milestone targets toward hard MAX_LINES — informational warnings only. */
const SHRINK_TARGETS = new Map([
  ["src/app/admin/bookings/components/CreateBookingForm.tsx", 700],
  ["src/app/admin/calendar/timeline-view.tsx", 500],
  ["src/app/admin/messages/shared-messages-page.tsx", 500],
  ["src/app/admin/blocked-dates/blocked-dates-drawer.tsx", 500],
  ["src/app/admin/vehicles/vehicle-form.tsx", 500],
]);

const panelDirs = ["src/app/admin", "src/app/manager", "src/app/owner"];
const failures = [];
const shrinkWarnings = [];

function countLines(rel) {
  const file = path.join(root, rel);
  if (!fs.existsSync(file)) return null;
  return fs.readFileSync(file, "utf8").split(/\r?\n/).length;
}

function walkPages(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walkPages(full, out);
    else if (
      entry.name === "page.tsx" ||
      (entry.name.startsWith("shared-") && entry.name.endsWith(".tsx"))
    ) {
      out.push(full);
    }
  }
  return out;
}

function checkFile(rel, allowed) {
  const lines = countLines(rel);
  if (lines === null) return;
  if (lines > allowed) {
    failures.push(`${rel}: ${lines} lines (max ${allowed})`);
  }
}

for (const rel of panelDirs) {
  const abs = path.join(root, rel);
  if (!fs.existsSync(abs)) continue;
  for (const file of walkPages(abs)) {
    const relPath = path.relative(root, file).replace(/\\/g, "/");
    if (SHRINK_CAPS.has(relPath)) continue;
    const allowed = GRANDFATHERED_MAX.get(relPath) ?? MAX_LINES;
    checkFile(relPath, allowed);
  }
}

for (const [rel, allowed] of SHRINK_CAPS) {
  checkFile(rel, allowed);
}

for (const [rel, target] of SHRINK_TARGETS) {
  const lines = countLines(rel);
  if (lines !== null && lines > target) {
    shrinkWarnings.push(
      `${rel}: ${lines} lines (milestone ${target}; hard cap ${MAX_LINES} after split)`
    );
  }
}

if (shrinkWarnings.length > 0) {
  console.warn("Staff file shrink milestones (informational):");
  for (const w of shrinkWarnings) console.warn(` - ${w}`);
}

if (failures.length > 0) {
  console.error("Staff file size check failed:");
  for (const f of failures) console.error(` - ${f}`);
  process.exit(1);
}

console.log("Staff file size check passed.");
