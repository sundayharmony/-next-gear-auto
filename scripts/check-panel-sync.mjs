import fs from "node:fs";
import path from "node:path";

const registryPath = path.resolve(process.cwd(), "src/lib/admin/panel-registry.ts");
const source = fs.readFileSync(registryPath, "utf8");

const failures = [];
const now = Date.now();

const disallowedManagerSharedKeys = new Set(["finances", "vehicles"]);
const managerUiSyncExemptKeys = new Set(["dashboard"]);

const featureRegex = /\{\s*key:\s*"([^"]+)",\s*label:\s*"([^"]+)",\s*adminPath:\s*"([^"]+)"(?:,\s*managerPath:\s*"([^"]+)")?,\s*sharedWithManager:\s*(true|false)/g;
const features = [];
for (const match of source.matchAll(featureRegex)) {
  features.push({
    key: match[1],
    label: match[2],
    adminPath: match[3],
    managerPath: match[4] || null,
    sharedWithManager: match[5] === "true",
  });
}

if (features.length === 0) {
  failures.push("Could not parse any panel features from panel-registry.ts");
}

for (const feature of features) {
  if (!feature.sharedWithManager) continue;

  if (!feature.managerPath) {
    failures.push(`Shared feature "${feature.key}" is missing managerPath.`);
    continue;
  }

  if (disallowedManagerSharedKeys.has(feature.key)) {
    failures.push(`Feature "${feature.key}" must not be shared with manager.`);
  }

  const managerPagePath = feature.managerPath === "/manager"
    ? path.resolve(process.cwd(), "src/app/manager/page.tsx")
    : path.resolve(process.cwd(), `src/app${feature.managerPath}/page.tsx`);

  if (!fs.existsSync(managerPagePath)) {
    failures.push(`Shared feature "${feature.key}" points to missing page: ${path.relative(process.cwd(), managerPagePath)}`);
    continue;
  }

  if (!managerUiSyncExemptKeys.has(feature.key)) {
    const managerPageSource = fs.readFileSync(managerPagePath, "utf8");
    const hasSharedUiReference = managerPageSource.includes("@/app/admin/");
    if (!hasSharedUiReference) {
      failures.push(
        `Shared feature "${feature.key}" must reuse admin/shared UI source (missing '@/app/admin/' import/reference): ${path.relative(process.cwd(), managerPagePath)}`
      );
    }
  }
}

const blockRegex = /\{[\s\S]*?sharedWithManager:\s*true[\s\S]*?\}/g;

for (const block of source.match(blockRegex) || []) {
  if (!block.includes("syncException")) continue;
  const keyMatch = block.match(/key:\s*"([^"]+)"/);
  const expiryMatch = block.match(/expiresAt:\s*"([^"]+)"/);
  if (!keyMatch || !expiryMatch) continue;
  const expiresAt = Date.parse(expiryMatch[1]);
  if (Number.isNaN(expiresAt) || expiresAt <= now) {
    failures.push(`Expired manager sync exception: ${keyMatch[1]} (${expiryMatch[1]})`);
  }
}

if (failures.length > 0) {
  console.error("Panel sync check failed:");
  for (const failure of failures) {
    console.error(` - ${failure}`);
  }
  process.exit(1);
}

console.log("Panel sync check passed.");
