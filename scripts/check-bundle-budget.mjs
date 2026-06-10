/**
 * Bundle budget check — compares measured First Load JS to docs/perf-baselines.md.
 * Reads Next.js 16+ route stats from .next/diagnostics/route-bundle-stats.json
 * (produced by `npm run build`). Fails CI at baseline +10%.
 *
 * Escape hatch for local dev without a build: BUNDLE_BUDGET_WARN_ONLY=true
 *
 * Run: node scripts/check-bundle-budget.mjs
 * Prerequisite: npm run build
 */
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const docPath = path.join(root, "docs/perf-baselines.md");
const statsPath = path.join(root, ".next/diagnostics/route-bundle-stats.json");
const TOLERANCE = 1.1;
const warnOnly = process.env.BUNDLE_BUDGET_WARN_ONLY === "true";

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

/** @returns {Map<string, number>} route → First Load JS kB */
function loadMeasuredSizes() {
  /** @type {Map<string, number>} */
  const measured = new Map();

  if (fs.existsSync(statsPath)) {
    const stats = JSON.parse(fs.readFileSync(statsPath, "utf8"));
    if (Array.isArray(stats)) {
      for (const entry of stats) {
        if (entry?.route && typeof entry.firstLoadUncompressedJsBytes === "number") {
          measured.set(
            entry.route,
            Math.round(entry.firstLoadUncompressedJsBytes / 1024)
          );
        }
      }
    }
    return measured;
  }

  return measured;
}

/** Parse legacy `next build` stdout table when present. */
function parseBuildStdout(text) {
  /** @type {Map<string, number>} */
  const measured = new Map();
  const lineRe = /^\s*[├└ƒ○]\s+(\S+)\s+[\d.]+\s*k?B\s+([\d.]+)\s*kB/m;
  for (const line of text.split("\n")) {
    const m = line.match(lineRe);
    if (m) {
      measured.set(m[1], Math.round(parseFloat(m[2])));
    }
  }
  return measured;
}

loadBaselines();

if (baselines.size === 0) {
  console.warn("check-bundle-budget: no route baselines parsed — add rows to perf-baselines.md.");
  process.exit(warnOnly ? 0 : 1);
}

let measured = loadMeasuredSizes();

if (measured.size === 0 && process.env.BUILD_OUTPUT) {
  measured = parseBuildStdout(process.env.BUILD_OUTPUT);
}

if (measured.size === 0) {
  const msg =
    "check-bundle-budget: no build stats found — run `npm run build` first, then re-run this check.";
  if (warnOnly) {
    console.warn(msg);
    process.exit(0);
  }
  console.error(msg);
  process.exit(1);
}

let failures = 0;

const modeLabel = warnOnly ? "warn" : "FAIL";
console.log(
  `Bundle budget check (First Load JS kB, ${warnOnly ? "warn" : "fail"} at baseline × 1.10):\n`
);

for (const [route, baselineKb] of baselines) {
  const actualKb = measured.get(route);
  const thresholdKb = Math.round(baselineKb * TOLERANCE);

  if (actualKb == null) {
    const line = ` ✗ ${route}: not found in build stats (baseline ${baselineKb} kB)`;
    console.error(line);
    failures++;
    continue;
  }

  const over = actualKb > thresholdKb;
  const line = ` ${over ? "✗" : "✓"} ${route}: ${actualKb} kB (baseline ${baselineKb} kB, max ${thresholdKb} kB)`;
  if (over) {
    console.error(line);
    failures++;
  } else {
    console.log(line);
  }
}

if (failures > 0) {
  const summary = `check-bundle-budget: ${failures} route(s) exceed baseline × ${TOLERANCE}.`;
  if (warnOnly) {
    console.warn(`\n${summary} (BUNDLE_BUDGET_WARN_ONLY=true — exiting 0)`);
    process.exit(0);
  }
  console.error(`\n${summary}`);
  process.exit(1);
}

console.log("\ncheck-bundle-budget: all tracked routes within budget.");
process.exit(0);
