/**
 * AcroForm field names for public/templates/bill-of-sale.pdf
 * See docs/bill-of-sale-template-fields.md
 */
export const BILL_OF_SALE_FORM_FIELDS = [
  "seller_name",
  "seller_address",
  "seller_phone",
  "seller_email",
  "buyer_name",
  "buyer_address",
  "buyer_phone",
  "buyer_email",
  "vehicle_description",
  "vehicle_vin",
  "vehicle_plate",
  "vehicle_color",
  "vehicle_mileage",
  "odometer",
  "sale_price",
  "sale_date",
  "payment_method",
  "notes",
] as const;

export type BillOfSaleFormField = (typeof BILL_OF_SALE_FORM_FIELDS)[number];
