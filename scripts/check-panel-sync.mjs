import fs from "node:fs";
import path from "node:path";

const registryPath = path.resolve(process.cwd(), "src/lib/admin/panel-registry.ts");
const source = fs.readFileSync(registryPath, "utf8");

const expired = [];
const now = Date.now();
const blockRegex = /\{[\s\S]*?sharedWithManager:\s*true[\s\S]*?\}/g;

for (const block of source.match(blockRegex) || []) {
  if (!block.includes("syncException")) continue;
  const keyMatch = block.match(/key:\s*"([^"]+)"/);
  const expiryMatch = block.match(/expiresAt:\s*"([^"]+)"/);
  if (!keyMatch || !expiryMatch) continue;
  const expiresAt = Date.parse(expiryMatch[1]);
  if (Number.isNaN(expiresAt) || expiresAt <= now) {
    expired.push({ key: keyMatch[1], expiresAt: expiryMatch[1] });
  }
}

if (expired.length > 0) {
  console.error("Found expired manager sync exceptions:");
  for (const item of expired) {
    console.error(` - ${item.key}: ${item.expiresAt}`);
  }
  process.exit(1);
}

console.log("Panel sync check passed.");
