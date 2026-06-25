import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const failures = [];
const inventory = [];

const HTTP_METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE"];

const VERIFIER_PATTERNS = {
  verifyAdmin: /verifyAdmin\s*\(/,
  verifyAdminOrManager: /verifyAdminOrManager\s*\(/,
  verifyManagerWithPanelAccess: /verifyManagerWithPortalAccess\s*\(|verifyManagerWithPanelAccess\s*\(/,
  verifyOwnerWithPortalAccess: /verifyOwnerWithPortalAccess\s*\(/,
  getAuthFromRequest: /getAuthFromRequest\s*\(/,
  tokenHasStaffAccess: /tokenHasStaffAccess\s*\(/,
  tokenHasOwnerAccess: /tokenHasOwnerAccess\s*\(/,
  CRON_SECRET: /CRON_SECRET/,
  TURO_WEBHOOK_SECRET: /TURO_WEBHOOK_SECRET/,
  stripeWebhook: /stripe-signature|constructEvent/,
  agreementToken: /validateAgreementAccessToken\s*\(/,
  setupGate: /ALLOW_SETUP_ADMIN/,
};

/** Admin-only panel GET routes (manager must not read via verifyAdminOrManager). */
const ADMIN_ONLY_GET_ROUTES = [
  { feature: "blockedDates", file: "src/app/api/admin/blocked-dates/route.ts" },
  { feature: "finances", file: "src/app/api/admin/expenses/route.ts" },
  { feature: "finances", file: "src/app/api/admin/owner-payouts/route.ts" },
  { feature: "finances", file: "src/app/api/admin/booking-payments/route.ts" },
  { feature: "managers", file: "src/app/api/admin/managers/route.ts" },
  { feature: "owners", file: "src/app/api/admin/owners/route.ts" },
  { feature: "bookingActivity", file: "src/app/api/admin/booking-activity/route.ts" },
];

const PUBLIC_ROUTES = new Set([
  "src/app/api/checkout/route.ts",
  "src/app/api/contact/route.ts",
  "src/app/api/vehicles/route.ts",
  "src/app/api/vehicles/booked-dates/route.ts",
  "src/app/api/vehicles/availability/route.ts",
  "src/app/api/locations/route.ts",
  "src/app/api/promo-codes/validate/route.ts",
  "src/app/api/upload-temp/route.ts",
  "src/app/api/rental-agreement/sign/route.ts",
  "src/app/api/auth/route.ts",
  "src/app/api/auth/logout/route.ts",
  "src/app/api/auth/refresh/route.ts",
  "src/app/api/auth/set-password/route.ts",
  "src/app/api/auth/reset-password/route.ts",
]);

const PUBLIC_GATED_ROUTES = new Set([
  "src/app/api/auth/setup-admin/route.ts",
]);

const MIXED_AUTH_ROUTES = new Set([
  "src/app/api/bookings/route.ts",
  "src/app/api/bookings/check-overlap/route.ts",
  "src/app/api/reviews/route.ts",
  "src/app/api/rental-agreement/generate/route.ts",
  "src/app/api/instagram/route.ts",
]);

const STAFF_AUTH_ROUTES = new Set([
  "src/app/api/bookings/upload/route.ts",
  "src/app/api/bookings/extend/route.ts",
]);

/** Staff routes outside /api/admin and /api/manager */
const STAFF_ROUTES = new Set([
  "src/app/api/bookings/override-signature/route.ts",
]);

/** Per-route method overrides: category → expected verifier keys */
const METHOD_OVERRIDES = {
  "src/app/api/admin/vehicles/route.ts": {
    GET: "staff",
    POST: "admin-only",
    PUT: "admin-only",
    PATCH: "admin-only",
    DELETE: "admin-only",
  },
  "src/app/api/admin/customers/route.ts": {
    GET: "staff",
    POST: "staff",
    PATCH: "admin-only",
    DELETE: "admin-only",
  },
  "src/app/api/admin/blocked-dates/route.ts": {
    "*": "admin-only",
  },
};

function normalizePath(rel) {
  return rel.split(path.sep).join("/");
}

function findAllRouteFiles(dir = path.join(root, "src/app/api"), acc = []) {
  if (!fs.existsSync(dir)) return acc;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      findAllRouteFiles(abs, acc);
    } else if (entry.name === "route.ts") {
      acc.push(normalizePath(path.relative(root, abs)));
    }
  }
  return acc.sort();
}

function extractHandler(source, method) {
  const needle = `export async function ${method}`;
  const idx = source.indexOf(needle);
  if (idx === -1) return null;
  const rest = source.slice(idx);
  const nextExport = rest.indexOf("\nexport async function ", 1);
  return nextExport === -1 ? rest : rest.slice(0, nextExport);
}

function classifyRoute(rel) {
  if (rel.startsWith("src/app/api/webhooks/")) return "webhook";
  if (rel.startsWith("src/app/api/cron/")) return "cron";
  if (rel.startsWith("src/app/api/owner/")) return "owner";
  if (rel.startsWith("src/app/api/manager/")) return "staff";
  if (PUBLIC_ROUTES.has(rel)) return "public";
  if (PUBLIC_GATED_ROUTES.has(rel)) return "public-gated";
  if (MIXED_AUTH_ROUTES.has(rel)) return "mixed";
  if (STAFF_AUTH_ROUTES.has(rel)) return "staff-auth";
  if (STAFF_ROUTES.has(rel)) return "staff";
  if (rel.startsWith("src/app/api/admin/")) {
    if (rel === "src/app/api/admin/messages/route.ts") return "staff-redirect";
    return "staff";
  }
  return "unknown";
}

function expectedVerifiers(category, method, rel) {
  const override = METHOD_OVERRIDES[rel];
  const overrideCategory = override?.[method] ?? override?.["*"];
  const effective = overrideCategory ?? category;

  switch (effective) {
    case "public":
    case "public-gated":
      return effective === "public-gated" ? ["setupGate"] : [];
    case "owner":
      return ["verifyOwnerWithPortalAccess"];
    case "webhook":
      return rel.includes("stripe") ? ["stripeWebhook"] : ["TURO_WEBHOOK_SECRET"];
    case "cron":
      return ["CRON_SECRET"];
    case "admin-only":
      return ["verifyAdmin"];
    case "staff":
      return [
        "verifyAdmin",
        "verifyAdminOrManager",
        "verifyManagerWithPanelAccess",
        "getAuthFromRequest",
        "tokenHasStaffAccess",
      ];
    case "staff-auth":
      return ["getAuthFromRequest"];
    case "staff-redirect":
      return [];
    case "mixed":
      if (rel === "src/app/api/rental-agreement/generate/route.ts") {
        return ["verifyAdmin", "agreementToken", "getAuthFromRequest"];
      }
      if (rel === "src/app/api/bookings/check-overlap/route.ts") {
        return ["verifyAdminOrManager", "getAuthFromRequest", "tokenHasOwnerAccess"];
      }
      if (rel === "src/app/api/reviews/route.ts" && method === "GET") {
        return [];
      }
      if (rel === "src/app/api/reviews/route.ts" && method === "POST") {
        return [];
      }
      if (rel === "src/app/api/instagram/route.ts" && method === "GET") {
        return [];
      }
      if (rel === "src/app/api/instagram/route.ts") {
        return ["verifyAdminOrManager"];
      }
      return ["getAuthFromRequest", "verifyAdmin", "verifyAdminOrManager", "verifyManagerWithPanelAccess"];
    default:
      return [];
  }
}

function handlerMatches(handler, verifierKeys) {
  if (verifierKeys.length === 0) return true;
  return verifierKeys.some((key) => VERIFIER_PATTERNS[key]?.test(handler));
}

function apiPathFromFile(rel) {
  const withoutPrefix = rel.replace(/^src\/app\/api\//, "").replace(/\/route\.ts$/, "");
  return `/api/${withoutPrefix}`;
}

// ── Legacy admin-only GET checks ──
for (const entry of ADMIN_ONLY_GET_ROUTES) {
  const abs = path.join(root, entry.file);
  if (!fs.existsSync(abs)) {
    failures.push(`Missing admin-only API route for ${entry.feature}: ${entry.file}`);
    continue;
  }
  const source = fs.readFileSync(abs, "utf8");
  const getHandler = extractHandler(source, "GET");
  if (!getHandler) continue;
  if (getHandler.includes("verifyAdminOrManager")) {
    failures.push(`${entry.file}: GET must use verifyAdmin (admin-only "${entry.feature}")`);
  }
  if (!getHandler.includes("verifyAdmin(")) {
    failures.push(`${entry.file}: GET missing verifyAdmin() for admin-only "${entry.feature}"`);
  }
}

// ── Full route scan ──
const routeFiles = findAllRouteFiles();

for (const rel of routeFiles) {
  const abs = path.join(root, rel);
  const source = fs.readFileSync(abs, "utf8");
  const category = classifyRoute(rel);
  const apiPath = apiPathFromFile(rel);

  if (category === "unknown") {
    failures.push(`${rel}: unclassified route — add to check-api-auth-matrix.mjs`);
    continue;
  }

  const methodsPresent = [];
  for (const method of HTTP_METHODS) {
    const handler = extractHandler(source, method);
    if (!handler) continue;
    methodsPresent.push(method);

    const expected = expectedVerifiers(category, method, rel);
    if (!handlerMatches(handler, expected)) {
      failures.push(
        `${rel} ${method}: expected one of [${expected.join(", ") || "none"}] for category ${category}`
      );
    }

    if (category === "owner" && handler.includes("verifyOwner(") && !handler.includes("verifyOwnerWithPortalAccess(")) {
      failures.push(`${rel} ${method}: must use verifyOwnerWithPortalAccess (not bare verifyOwner)`);
    }

    if (expected.includes("verifyAdmin") && category === "admin-only") {
      if (handler.includes("verifyAdminOrManager") && !handler.includes("verifyAdmin(")) {
        failures.push(`${rel} ${method}: admin-only route must call verifyAdmin()`);
      }
    }
  }

  if (methodsPresent.length === 0 && category !== "staff-redirect") {
    failures.push(`${rel}: no HTTP handlers exported`);
  }

  inventory.push({
    path: apiPath,
    file: rel,
    category,
    methods: methodsPresent.join(", ") || "—",
  });
}

if (process.env.API_AUTH_MATRIX_INVENTORY === "1") {
  console.log(JSON.stringify(inventory, null, 2));
}

if (failures.length > 0) {
  console.error("API auth matrix check failed:");
  for (const failure of failures) {
    console.error(` - ${failure}`);
  }
  process.exit(1);
}

console.log(`API auth matrix check passed (${routeFiles.length} route files, ${inventory.length} entries).`);
