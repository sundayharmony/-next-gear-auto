import test from "node:test";
import assert from "node:assert/strict";
import {
  lineItemAmount,
  sumDocumentLineItems,
  validateDocumentLineItems,
} from "../src/lib/documents/document-line-items";

test("lineItemAmount multiplies price and quantity", () => {
  assert.equal(lineItemAmount({ title: "Toll", unitPrice: 12.5, quantity: 2 }), 25);
});

test("validateDocumentLineItems rejects missing title", () => {
  const result = validateDocumentLineItems([{ title: "", unitPrice: 1, quantity: 1 }]);
  assert.equal(result.ok, false);
});

test("sumDocumentLineItems totals lines", () => {
  const total = sumDocumentLineItems([
    { title: "A", unitPrice: 10, quantity: 1 },
    { title: "B", unitPrice: 5, quantity: 2 },
  ]);
  assert.equal(total, 20);
});
