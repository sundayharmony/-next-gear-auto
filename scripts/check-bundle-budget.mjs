/**
 * Bundle budget stub — reads targets from docs/perf-baselines.md.
 * Full enforcement requires ANALYZE=true build output; exits 0 until wired.
 *
 * Run: node scripts/check-bundle-budget.mjs
 */
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const docPath = path.join(root, "docs/perf-baselines.md");

/** @type {Map<string, number>} */
const baselines = new Map();

function loadBaselines() {
  if (!fs.existsSync(docPath)) {
    console.warn("check-bundle-budget: docs/perf-baselines.md not found — skipping.");
    return;
  }
  const text = fs.readFileSync(docPath, "utf8");
  const rowRe = /^\|\s*`([^`]+)`\s*\|\s*(\d+)\s*\|/gm;
  let m;
  while ((m = rowRe.exec(text)) !== null) {
    baselines.set(m[1], Number(m[2]));
  }
}

loadBaselines();

if (baselines.size === 0) {
  console.warn("check-bundle-budget: no route baselines parsed — add rows to perf-baselines.md.");
  process.exit(0);
}

console.log("Bundle budget baselines (kB First Load JS):");
for (const [route, kb] of baselines) {
  console.log(` - ${route}: ${kb} kB (fail threshold ${Math.round(kb * 1.1)} kB when enforced)`);
}

console.log(
  "\ncheck-bundle-budget: stub only — run ANALYZE=true npm run analyze and compare route sizes manually until CI parsing is added."
);
