/**
 * Bundle budget check — compares measured First Load JS to docs/perf-baselines.md.
 * Reads Next.js 16+ route stats from .next/diagnostics/route-bundle-stats.json
 * (produced by `npm run build`). Warns at baseline +10%; always exits 0.
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
  process.exit(0);
}

let measured = loadMeasuredSizes();

if (measured.size === 0 && process.env.BUILD_OUTPUT) {
  measured = parseBuildStdout(process.env.BUILD_OUTPUT);
}

if (measured.size === 0) {
  console.warn(
    "check-bundle-budget: no build stats found — run `npm run build` first, then re-run this check."
  );
  process.exit(0);
}

let warned = 0;

console.log("Bundle budget check (First Load JS kB, warn at baseline × 1.10):\n");

for (const [route, baselineKb] of baselines) {
  const actualKb = measured.get(route);
  const thresholdKb = Math.round(baselineKb * TOLERANCE);

  if (actualKb == null) {
    console.warn(` ⚠ ${route}: not found in build stats (baseline ${baselineKb} kB)`);
    warned++;
    continue;
  }

  const status = actualKb > thresholdKb ? "WARN" : "ok";
  const line = ` ${status === "ok" ? "✓" : "⚠"} ${route}: ${actualKb} kB (baseline ${baselineKb} kB, warn > ${thresholdKb} kB)`;
  if (status === "WARN") {
    console.warn(line);
    warned++;
  } else {
    console.log(line);
  }
}

if (warned > 0) {
  console.warn(
    `\ncheck-bundle-budget: ${warned} route(s) at or above warn threshold — review before release (exits 0).`
  );
} else {
  console.log("\ncheck-bundle-budget: all tracked routes within budget.");
}

process.exit(0);
