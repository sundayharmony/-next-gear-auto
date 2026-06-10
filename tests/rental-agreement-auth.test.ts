import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  generateAgreementAccessToken,
  validateAgreementAccessToken,
} from "@/lib/agreement/agreement-access-token";

const root = process.cwd();

test("agreement access token round-trips booking id", () => {
  process.env.JWT_SECRET = "test-secret-with-at-least-32-characters!!";
  const token = generateAgreementAccessToken("booking-123", "guest@example.com");
  const claims = validateAgreementAccessToken(token);
  assert.ok(claims);
  assert.equal(claims.bookingId, "booking-123");
  assert.equal(claims.email, "guest@example.com");
});

test("agreement access token rejects tampered payload", () => {
  process.env.JWT_SECRET = "test-secret-with-at-least-32-characters!!";
  const token = generateAgreementAccessToken("booking-123");
  const tampered = token.slice(0, -4) + "xxxx";
  assert.equal(validateAgreementAccessToken(tampered), null);
});

test("generate route requires token or staff when customer_email absent", () => {
  const source = fs.readFileSync(
    path.join(root, "src/app/api/rental-agreement/generate/route.ts"),
    "utf8"
  );
  assert.ok(source.includes("validateAgreementAccessToken"));
  assert.ok(source.includes("Signed access token or staff authorization"));
  assert.ok(source.includes("verifyAdminOrManager"));
});

test("sign route applies rate limiting", () => {
  const source = fs.readFileSync(
    path.join(root, "src/app/api/rental-agreement/sign/route.ts"),
    "utf8"
  );
  assert.ok(source.includes("agreementSignLimiter"));
  assert.ok(source.includes("rateLimitResponse"));
});
