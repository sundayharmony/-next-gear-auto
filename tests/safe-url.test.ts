import assert from "node:assert/strict";
import { test } from "node:test";
import {
  isAllowedExternalHref,
  sanitizePostgrestSearch,
  validateInstagramPostUrl,
} from "../src/lib/utils/safe-url";

test("validateInstagramPostUrl accepts canonical post and reel URLs", () => {
  assert.equal(
    validateInstagramPostUrl("https://www.instagram.com/p/ABC123/"),
    "https://www.instagram.com/p/ABC123/"
  );
  assert.equal(
    validateInstagramPostUrl("https://instagram.com/reel/xyz/"),
    "https://instagram.com/reel/xyz/"
  );
});

test("validateInstagramPostUrl rejects SSRF bypass hosts", () => {
  assert.equal(validateInstagramPostUrl("https://evil.com/?instagram.com"), null);
  assert.equal(validateInstagramPostUrl("http://www.instagram.com/p/x/"), null);
  assert.equal(validateInstagramPostUrl("https://www.instagram.com/user/foo/"), null);
});

test("sanitizePostgrestSearch strips filter metacharacters without regex", () => {
  assert.equal(sanitizePostgrestSearch("john%_()"), "john");
  assert.equal(sanitizePostgrestSearch("a".repeat(200), 10).length, 10);
});

test("isAllowedExternalHref requires https and blocks javascript", () => {
  assert.equal(isAllowedExternalHref("https://example.com/doc.pdf"), "https://example.com/doc.pdf");
  assert.equal(isAllowedExternalHref("javascript:alert(1)"), undefined);
  assert.equal(isAllowedExternalHref("http://example.com/x"), undefined);
  assert.equal(isAllowedExternalHref("https://127.0.0.1/internal"), undefined);
});
