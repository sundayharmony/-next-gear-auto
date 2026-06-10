/**
 * CI stub for secret scanning. Replace with gitleaks or GitHub Advanced Security
 * when available:  gitleaks detect --source . --verbose
 *
 * This script fails only when obvious high-entropy placeholder patterns appear
 * in tracked source (not .env files).
 */
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const failures = [];

const SUSPICIOUS = [
  /sk_live_[a-zA-Z0-9]{20,}/,
  /AKIA[0-9A-Z]{16}/,
  /-----BEGIN (RSA |EC )?PRIVATE KEY-----/,
];

const SKIP_DIRS = new Set(["node_modules", ".next", ".git", "dist"]);

function walk(dir, acc = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(abs, acc);
    } else if (/\.(ts|tsx|js|mjs|json|md)$/.test(entry.name) && !entry.name.startsWith(".env")) {
      acc.push(abs);
    }
  }
  return acc;
}

for (const file of walk(root)) {
  const rel = path.relative(root, file);
  if (rel.startsWith("node_modules")) continue;
  const text = fs.readFileSync(file, "utf8");
  for (const pattern of SUSPICIOUS) {
    if (pattern.test(text)) {
      failures.push(`${rel}: possible secret pattern ${pattern}`);
    }
  }
}

if (failures.length > 0) {
  console.error("Secret scan stub failed:");
  for (const f of failures) console.error(` - ${f}`);
  process.exit(1);
}

console.log("Secret scan stub passed (use gitleaks in CI for full coverage).");
