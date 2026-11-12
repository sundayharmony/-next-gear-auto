import test from "node:test";
import assert from "node:assert/strict";
import { buildBookingInvoiceData } from "@/lib/invoices/invoice-data";

const baseBooking = {
  id: "bkabcdef1",
  customer_name: "Test Renter",
  customer_email: "renter@example.com",
  vehicleName: "2024 BMW X5",
  pickup_date: "2026-11-01",
  return_date: "2026-11-05",
  pickup_time: "10:00",
  return_time: "10:00",
  total_price: 500,
  deposit: 375,
  extras: [],
  admin_notes: undefined,
  promo_code: undefined,
  discount_amount: 0,
  location_surcharge: 0,
  effective_total_price: undefined,
  pickup_location_name: "Jersey City",
  return_location_name: "Jersey City",
};

test("invoices hub omits trip balance unless listed as a line", () => {
  const data = buildBookingInvoiceData(baseBooking, {
    includeTripCharges: false,
    additionalLineItems: [
      { label: "Remaining Balance", amount: 63, title: "Remaining Balance", unitPrice: 63, quantity: 1 },
    ],
    dueDate: "2026-11-12",
  });

  assert.equal(data.lineItems.length, 1);
  assert.equal(data.lineItems[0]?.label, "Remaining Balance");
  assert.equal(data.chargesTotal, 63);
  assert.equal(data.amountPaid, 0);
  assert.equal(data.balanceDue, 63);
});

test("invoices hub with no lines bills $0 (does not pull trip balance)", () => {
  const data = buildBookingInvoiceData(baseBooking, {
    includeTripCharges: false,
    additionalLineItems: [],
    dueDate: "2026-11-12",
  });

  assert.equal(data.lineItems.length, 0);
  assert.equal(data.chargesTotal, 0);
  assert.equal(data.balanceDue, 0);
});

test("booking modal still includes trip charges by default", () => {
  const data = buildBookingInvoiceData(baseBooking, {
    dueDate: "2026-11-12",
  });

  // $500 total − $375 deposit
  assert.equal(data.balanceDue, 125);
  assert.ok(data.chargesTotal >= 500 || data.lineItems.length > 0);
});

test("booking modal adds extras on top of trip charges", () => {
  const data = buildBookingInvoiceData(baseBooking, {
    includeTripCharges: true,
    additionalLineItems: [
      { label: "Cleaning fee", amount: 50, title: "Cleaning fee", unitPrice: 50, quantity: 1 },
    ],
    dueDate: "2026-11-12",
  });

  assert.ok(data.lineItems.some((l) => l.label === "Cleaning fee"));
  assert.ok(data.balanceDue > 50);
});
