import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  mergeSavedCustomerProfile,
} from "@/lib/bookings/resolve-guest-checkout-customer";

const root = process.cwd();

test("mergeSavedCustomerProfile prefers saved customer fields over checkout form", () => {
  const merged = mergeSavedCustomerProfile(
    { name: "Jane Saved", phone: "555-0100", dob: "1990-01-01" },
    { name: "Typo Name", email: "jane@example.com", phone: "555-9999", dob: "1991-02-02" }
  );
  assert.equal(merged.name, "Jane Saved");
  assert.equal(merged.phone, "555-0100");
  assert.equal(merged.dob, "1990-01-01");
});

test("mergeSavedCustomerProfile falls back to entered values when saved fields are empty", () => {
  const merged = mergeSavedCustomerProfile(
    { name: "", phone: null, dob: null },
    { name: "New Guest", email: "guest@example.com", phone: "555-1212", dob: "2000-03-03" }
  );
  assert.equal(merged.name, "New Guest");
  assert.equal(merged.phone, "555-1212");
  assert.equal(merged.dob, "2000-03-03");
});

test("checkout route resolves guest customers and defers password email to confirmation", () => {
  const checkout = fs.readFileSync(
    path.join(root, "src/app/api/checkout/route.ts"),
    "utf8"
  );
  assert.ok(checkout.includes("resolveCheckoutCustomer"));
  assert.ok(checkout.includes("checkout_matched_existing_customer"));
  assert.ok(!checkout.includes("needsPasswordForPending"));

  const mailer = fs.readFileSync(path.join(root, "src/lib/email/mailer.ts"), "utf8");
  assert.ok(mailer.includes("sendPasswordResetLink"));
  assert.match(mailer, /sendBookingConfirmationWithAgreement[\s\S]*sendPasswordResetLink/);
});
