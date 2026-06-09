import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const MAX_LINES = 600;
/** Pre-existing admin mega-pages tracked for Phase 3 splits — must not grow. */
const GRANDFATHERED_MAX = new Map([
  ["src/app/admin/blocked-dates/page.tsx", 1138],
  ["src/app/admin/calendar/page.tsx", 1220],
  ["src/app/admin/customers/page.tsx", 1945],
  ["src/app/admin/finances/page.tsx", 2656],
  ["src/app/admin/maintenance/page.tsx", 1320],
  ["src/app/admin/tickets/page.tsx", 946],
  ["src/app/admin/vehicles/page.tsx", 1503],
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

for (const rel of panelDirs) {
  const abs = path.join(root, rel);
  if (!fs.existsSync(abs)) continue;
  for (const file of walk(abs)) {
    const rel = path.relative(root, file).replace(/\\/g, "/");
    const lines = fs.readFileSync(file, "utf8").split(/\r?\n/).length;
    const allowed = GRANDFATHERED_MAX.get(rel) ?? MAX_LINES;
    if (lines > allowed) {
      failures.push(`${rel}: ${lines} lines (max ${allowed})`);
    }
  }
}

if (failures.length > 0) {
  console.error("Staff file size check failed:");
  for (const f of failures) console.error(` - ${f}`);
  process.exit(1);
}

console.log("Staff file size check passed.");
