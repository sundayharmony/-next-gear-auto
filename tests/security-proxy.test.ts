import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

test("proxy denies panel routes when JWT_SECRET is missing", () => {
  const source = fs.readFileSync(path.join(root, "src/proxy.ts"), "utf8");
  assert.ok(
    source.includes("secret.length === 0"),
    "proxy must fail closed when JWT_SECRET is missing"
  );
  assert.ok(
    source.includes("Authentication service unavailable"),
    "proxy should return 503 when secret missing"
  );
  assert.ok(
    !source.includes("ALLOW_LEGACY_ADMIN_HEADER"),
    "legacy x-admin-id bypass must be removed from proxy"
  );
});

test("verifyAdmin is JWT-only", () => {
  const source = fs.readFileSync(path.join(root, "src/lib/auth/admin-check.ts"), "utf8");
  assert.ok(!source.includes("x-admin-id"), "admin-check must not reference x-admin-id");
  assert.ok(!source.includes("ALLOW_LEGACY_ADMIN_HEADER"));
});

test("setup-admin gated in production", () => {
  const source = fs.readFileSync(
    path.join(root, "src/app/api/auth/setup-admin/route.ts"),
    "utf8"
  );
  assert.ok(source.includes("ALLOW_SETUP_ADMIN"));
  assert.ok(source.includes('status: 404'));
});
