import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const MAX_LINES = 600;
/** Pre-existing admin mega-pages tracked for phased splits — must not grow. */
const GRANDFATHERED_MAX = new Map([
  ["src/app/admin/blocked-dates/page.tsx", 1131],
  ["src/app/admin/customers/page.tsx", 1831],
  ["src/app/admin/finances/page.tsx", 2454],
  ["src/app/admin/maintenance/page.tsx", 1317],
  ["src/app/admin/tickets/page.tsx", 909],
  ["src/app/admin/vehicles/page.tsx", 1194],
]);
/** Heavy shared components — shrink-only caps (must not grow). */
const SHRINK_CAPS = new Map([
  ["src/app/admin/bookings/components/BookingDetailPanel.tsx", 2360],
]);
const failures = [];

const panelDirs = [
  "src/app/admin",
  "src/app/manager",
  "src/app/owner",
];

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (entry.name === "page.tsx") out.push(full);
  }
  return out;
}

function checkFile(rel, allowed) {
  const file = path.join(root, rel);
  if (!fs.existsSync(file)) return;
  const lines = fs.readFileSync(file, "utf8").split(/\r?\n/).length;
  if (lines > allowed) {
    failures.push(`${rel}: ${lines} lines (max ${allowed})`);
  }
}

for (const rel of panelDirs) {
  const abs = path.join(root, rel);
  if (!fs.existsSync(abs)) continue;
  for (const file of walk(abs)) {
    const relPath = path.relative(root, file).replace(/\\/g, "/");
    const lines = fs.readFileSync(file, "utf8").split(/\r?\n/).length;
    const allowed = GRANDFATHERED_MAX.get(relPath) ?? MAX_LINES;
    if (lines > allowed) {
      failures.push(`${relPath}: ${lines} lines (max ${allowed})`);
    }
  }
}

for (const [rel, allowed] of SHRINK_CAPS) {
  checkFile(rel, allowed);
}

if (failures.length > 0) {
  console.error("Staff file size check failed:");
  for (const f of failures) console.error(` - ${f}`);
  process.exit(1);
}

console.log("Staff file size check passed.");
