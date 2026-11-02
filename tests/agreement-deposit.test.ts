import test from "node:test";
import assert from "node:assert/strict";
import {
  resolveAgreementBalanceDue,
  resolveAgreementDeposit,
} from "@/lib/agreement/agreement-deposit";
import { expandAgreementSignatures } from "@/lib/agreement/agreement-signature-expand";
import { PRIMARY_AGREEMENT_SIGNATURE_ID } from "@/data/agreement-fields";

test("resolveAgreementDeposit uses explicit zero deposit", () => {
  assert.equal(resolveAgreementDeposit(0, 500), 0);
});

test("resolveAgreementDeposit falls back to site default when deposit unset", () => {
  assert.equal(resolveAgreementDeposit(undefined, 500), 50);
});

test("resolveAgreementBalanceDue subtracts deposit from total", () => {
  assert.equal(resolveAgreementBalanceDue(200, 50), 150);
  assert.equal(resolveAgreementBalanceDue(200, 0), 200);
});

test("expandAgreementSignatures copies primary signature to all fields", () => {
  const png = "data:image/png;base64,abc";
  const expanded = expandAgreementSignatures({ [PRIMARY_AGREEMENT_SIGNATURE_ID]: png });
  assert.equal(expanded.t35, png);
  assert.equal(expanded.t47, png);
  assert.equal(expanded.t57, png);
});
