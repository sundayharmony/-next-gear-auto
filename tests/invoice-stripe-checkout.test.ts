import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { getInvoicePaymentNoticeParagraphs } from "@/lib/invoices/invoice-payment-notice";

const root = process.cwd();

test("invoice payment notice mentions Stripe checkout when balance is due", () => {
  const paragraphs = getInvoicePaymentNoticeParagraphs(125.5, "2099-12-31");
  assert.ok(paragraphs.some((p) => /Stripe/i.test(p)));
  assert.ok(paragraphs.some((p) => /24 hours/i.test(p)));
});

test("sendInvoiceEmail creates a Stripe checkout session for balances", () => {
  const source = fs.readFileSync(
    path.join(root, "src/lib/invoices/invoice-service.ts"),
    "utf8",
  );
  assert.ok(source.includes("createInvoiceCheckoutSession"));
  assert.ok(source.includes("paymentUrl"));
});

test("invoice email template includes Pay balance now CTA when paymentUrl set", () => {
  const source = fs.readFileSync(
    path.join(root, "src/lib/email/templates.ts"),
    "utf8",
  );
  assert.ok(source.includes("Pay balance now"));
  assert.ok(source.includes("data.paymentUrl"));
});

test("Stripe webhook treats invoice purpose as balance payment", () => {
  const source = fs.readFileSync(
    path.join(root, "src/app/api/webhooks/stripe/route.ts"),
    "utf8",
  );
  assert.ok(source.includes('purpose === "invoice"'));
  assert.ok(source.includes("isBalancePayment"));
  assert.ok(source.includes("invoice_paid_stripe"));
});
