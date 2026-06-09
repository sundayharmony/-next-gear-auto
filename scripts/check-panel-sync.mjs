import fs from "node:fs";
import path from "node:path";

const registryPath = path.resolve(process.cwd(), "src/lib/admin/panel-registry.ts");
const source = fs.readFileSync(registryPath, "utf8");

const failures = [];
const now = Date.now();

const disallowedManagerSharedKeys = new Set(["finances", "vehicles"]);
/** Manager analytics is API-driven and does not re-export an admin page; exempt from shared UI import rule. */
const managerUiSyncExemptKeys = new Set(["dashboard", "analytics"]);

// Supports optional adminPath and optional managerPath (order: adminPath then managerPath when both present).
const featureRegex =
  /\{\s*key:\s*"([^"]+)",\s*label:\s*"([^"]+)",(?:\s*adminPath:\s*"([^"]+)",)?(?:\s*managerPath:\s*"([^"]+)",)?\s*sharedWithManager:\s*(true|false)/g;
const features = [];
for (const match of source.matchAll(featureRegex)) {
  features.push({
    key: match[1],
    label: match[2],
    adminPath: match[3] || null,
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

// Flag hardcoded admin navigation in manager-shared admin pages (not API paths).
const sharedAdminPages = [];
for (const feature of features) {
  if (!feature.sharedWithManager || !feature.adminPath || managerUiSyncExemptKeys.has(feature.key)) continue;
  const adminPagePath =
    feature.adminPath === "/admin"
      ? path.resolve(process.cwd(), "src/app/admin/page.tsx")
      : path.resolve(process.cwd(), `src/app${feature.adminPath}/page.tsx`);
  if (fs.existsSync(adminPagePath)) sharedAdminPages.push(adminPagePath);
}
// Shared detail/components used by manager routes
for (const extra of [
  "src/app/admin/vehicles/details/shared-vehicle-details-page.tsx",
  "src/app/admin/bookings/components/BookingDetailPanel.tsx",
  "src/app/admin/bookings/components/TuroTripDetailPanel.tsx",
  "src/app/admin/bookings/shared-bookings-page.tsx",
]) {
  const full = path.resolve(process.cwd(), extra);
  if (fs.existsSync(full)) sharedAdminPages.push(full);
}

const navPathPatterns = [
  /href\s*=\s*["'`]\/admin\/bookings/g,
  /href\s*=\s*["'`]\/admin\/customers/g,
  /router\.push\(\s*["'`]\/admin\/bookings/g,
  /router\.push\(\s*["'`]\/admin\/customers/g,
];

for (const file of sharedAdminPages) {
  const rel = path.relative(process.cwd(), file);
  if (rel.includes("/api/")) continue;
  const content = fs.readFileSync(file, "utf8");
  for (const pattern of navPathPatterns) {
    if (pattern.test(content)) {
      failures.push(
        `${rel}: hardcoded admin navigation path — use panelConfig/staff-panel-base helpers instead`
      );
      break;
    }
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
