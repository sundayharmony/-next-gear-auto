import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  inferBookingDocMime,
  validateBookingDocFile,
} from "@/lib/bookings/upload-booking-document";

const root = process.cwd();

test("inferBookingDocMime falls back to file extension when browser omits MIME type", () => {
  const file = { name: "license.JPG", type: "", size: 1024 } as File;
  assert.equal(inferBookingDocMime(file), "image/jpeg");
});

test("validateBookingDocFile rejects HEIC with actionable message", () => {
  const file = { name: "IMG_1234.HEIC", type: "image/heic", size: 1024 } as File;
  const err = validateBookingDocFile(file);
  assert.ok(err?.includes("HEIC"));
});

test("validateBookingDocFile accepts large JPEG originals for client-side compression", () => {
  const file = { name: "license.jpg", type: "image/jpeg", size: 12 * 1024 * 1024 } as File;
  assert.equal(validateBookingDocFile(file), null);
});

test("upload-temp route is public (no login) for checkout wizard uploads", () => {
  const source = fs.readFileSync(
    path.join(root, "src/app/api/upload-temp/route.ts"),
    "utf8"
  );
  assert.ok(!source.includes("getAuthFromRequest"));
  assert.ok(source.includes("rateCheck"));
});

test("checkout route handles missing Stripe config and null session URL", () => {
  const source = fs.readFileSync(path.join(root, "src/app/api/checkout/route.ts"), "utf8");
  assert.ok(source.includes("STRIPE_SECRET_KEY?.trim()"));
  assert.ok(source.includes("!session.url"));
  assert.ok(source.includes("Stripe.errors.StripeError"));
});
