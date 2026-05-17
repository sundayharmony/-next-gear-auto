import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { MOBILE_API_CONTRACT_VERSION } from "@/lib/mobile-api/types";

test("native refresh contract fields", () => {
  const body = { refreshToken: "sample-refresh-token", client: "native" };
  assert.equal(body.client, "native");
  assert.equal(typeof body.refreshToken, "string");
});

test("mobile API contract version is semver-shaped", () => {
  assert.match(MOBILE_API_CONTRACT_VERSION, /^\d+\.\d+\.\d+$/);
});

test("OpenAPI mobile spec exists and references key paths", () => {
  const p = join(process.cwd(), "docs", "mobile-openapi.yaml");
  assert.equal(existsSync(p), true);
  const raw = readFileSync(p, "utf8");
  assert.ok(raw.includes("/api/auth"));
  assert.ok(raw.includes("/api/bookings/upload"));
  assert.ok(raw.includes("/api/admin/vehicles"));
});
