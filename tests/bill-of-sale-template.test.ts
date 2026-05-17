import test from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { BILL_OF_SALE_FORM_FIELDS } from "@/lib/vehicle-sale/bill-of-sale-fields";
import { generateBillOfSalePdf } from "@/lib/vehicle-sale/bill-of-sale-pdf";

test("bill of sale form field list is stable", () => {
  assert.ok(BILL_OF_SALE_FORM_FIELDS.includes("seller_name"));
  assert.ok(BILL_OF_SALE_FORM_FIELDS.includes("sale_price"));
  assert.equal(BILL_OF_SALE_FORM_FIELDS.length, 18);
});

test("generateBillOfSalePdf produces bytes when template exists", async () => {
  const templatePath = join(process.cwd(), "public", "templates", "bill-of-sale.pdf");
  if (!existsSync(templatePath)) {
    return;
  }
  const bytes = await generateBillOfSalePdf({
    buyerName: "Jane Buyer",
    buyerAddress: "123 Main St, Jersey City, NJ",
    saleDate: "2026-05-16",
    salePrice: 15000,
    vehicle: {
      year: 2022,
      make: "Toyota",
      model: "Camry",
      vin: "TESTVIN123",
      license_plate: "ABC123",
      color: "White",
      mileage: 45000,
    },
  });
  assert.ok(bytes.length > 1000);
  assert.equal(bytes[0], 0x25);
  assert.equal(String.fromCharCode(bytes[1], bytes[2], bytes[3]), "PDF");
});
