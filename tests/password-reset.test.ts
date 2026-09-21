import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function read(rel: string) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

test("login forgot password calls the forgot-password API", () => {
  const login = read("src/app/(auth)/login/page.tsx");
  assert.match(login, /\/api\/auth\/forgot-password/);
  assert.doesNotMatch(login, /setForgotPasswordMsg\("Check your email for password reset instructions\."\)/);
});

test("forgot-password route is public and rate limited", () => {
  const route = read("src/app/api/auth/forgot-password/route.ts");
  assert.match(route, /sendCustomerPasswordEmail/);
  assert.match(route, /passwordEmailLimiter/);
  assert.match(route, /GENERIC_SUCCESS_MESSAGE/);
  assert.doesNotMatch(route, /verifyAdmin/);
});

test("admin manager and owner password email routes are admin-only", () => {
  for (const rel of [
    "src/app/api/admin/managers/[managerId]/send-password-email/route.ts",
    "src/app/api/admin/owners/[ownerId]/send-password-email/route.ts",
  ]) {
    const source = read(rel);
    assert.match(source, /verifyAdmin\(req\)/);
    assert.match(source, /sendCustomerPasswordEmail/);
  }
});

test("managers page exposes send password email action", () => {
  const page = read("src/app/admin/managers/page.tsx");
  assert.match(page, /SendPasswordEmailButton/);
  assert.match(page, /\/api\/admin\/managers\//);
});
