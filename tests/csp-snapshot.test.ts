import test from "node:test";
import assert from "node:assert/strict";
import { buildContentSecurityPolicy } from "@/lib/security/build-csp";

const SNAPSHOT_NONCE = "test-nonce-abc123";

test("CSP directives match approved snapshot (prod)", () => {
  const csp = buildContentSecurityPolicy(SNAPSHOT_NONCE, false);
  const directives = csp.split("; ").sort();

  assert.ok(directives.includes("default-src 'self'"));
  assert.ok(directives.some((d) => d.startsWith("script-src ") && d.includes("'strict-dynamic'")));
  assert.ok(directives.some((d) => d.startsWith("script-src ") && d.includes(`'nonce-${SNAPSHOT_NONCE}'`)));
  assert.ok(directives.includes("object-src 'none'"));
  assert.ok(directives.includes("frame-ancestors 'none'"));
  assert.ok(directives.includes("upgrade-insecure-requests"));
  assert.ok(!directives.some((d) => d.includes("'unsafe-eval'")));
});

test("CSP allows unsafe-eval only in development", () => {
  const devCsp = buildContentSecurityPolicy(SNAPSHOT_NONCE, true);
  assert.ok(devCsp.includes("'unsafe-eval'"));
  const prodCsp = buildContentSecurityPolicy(SNAPSHOT_NONCE, false);
  assert.ok(!prodCsp.includes("'unsafe-eval'"));
});
