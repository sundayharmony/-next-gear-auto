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

// 1) Bottom nav should not misuse tabs pattern for route links
for (const rel of [
  "src/components/admin/bottom-tab-bar.tsx",
  "src/components/manager/bottom-tab-bar.tsx",
  "src/components/owner/bottom-tab-bar.tsx",
]) {
  const s = read(rel);
  if (s.includes('role="tablist"') || s.includes("role='tablist'")) {
    failures.push(`${rel}: remove role=tablist from route navigation`);
  }
  if (s.includes('role="tab"') && s.includes("Link")) {
    failures.push(`${rel}: Links should not use role=tab`);
  }
}

// 2) adminFetch must use role-aware redirect helper
const adminFetch = read("src/lib/utils/admin-fetch.ts");
if (!adminFetch.includes("getStaffLoginRedirectPath")) {
  failures.push("admin-fetch.ts: missing getStaffLoginRedirectPath for 401 redirect");
}

if (failures.length > 0) {
  console.error("Staff quality gates failed:");
  for (const f of failures) console.error(` - ${f}`);
  process.exit(1);
}

console.log("Staff quality gates passed.");
