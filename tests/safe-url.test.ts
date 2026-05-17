import assert from "node:assert/strict";
import { test } from "node:test";
import {
  isAllowedExternalHref,
  sanitizePostgrestSearch,
  validateInstagramPostUrl,
} from "../src/lib/utils/safe-url";
import {
  decodeHtmlEntities,
  escapeHtml,
  isValidEmailFormat,
  parseDisplayPrice,
  safeDataImageSrc,
  stripHtmlAngleBrackets,
} from "../src/lib/utils/validation";

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

test("escapeHtml and decodeHtmlEntities round-trip named entities", () => {
  assert.equal(escapeHtml("<a & b>"), "&lt;a &amp; b&gt;");
  assert.equal(decodeHtmlEntities("&lt;test&gt;"), "<test>");
});

test("isValidEmailFormat accepts common addresses", () => {
  assert.equal(isValidEmailFormat("user@example.com"), true);
  assert.equal(isValidEmailFormat("not-an-email"), false);
});

test("stripHtmlAngleBrackets removes tags", () => {
  assert.equal(stripHtmlAngleBrackets("<b>hi</b>"), "hi");
});

test("parseDisplayPrice parses currency display", () => {
  assert.equal(parseDisplayPrice("$1,234.50"), 1234.5);
});

test("safeDataImageSrc allows only image data URLs", () => {
  assert.equal(safeDataImageSrc("data:image/png;base64,abc"), "data:image/png;base64,abc");
  assert.equal(safeDataImageSrc("javascript:alert(1)"), undefined);
  assert.equal(safeDataImageSrc("data:text/html;base64,abc"), undefined);
});
