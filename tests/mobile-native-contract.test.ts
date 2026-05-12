import test from "node:test";
import assert from "node:assert/strict";

/**
 * Documents the native refresh POST body shape expected by Android and documented in docs/mobile-api.md.
 */
test("native refresh contract fields", () => {
  const body = { refreshToken: "sample-refresh-token", client: "native" };
  assert.equal(body.client, "native");
  assert.equal(typeof body.refreshToken, "string");
});
