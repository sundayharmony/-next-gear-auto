import { PDFDocument } from "pdf-lib";
import path from "path";
import fs from "fs/promises";
import { CONTACT_INFO, SITE_NAME } from "@/lib/constants";
import { getVehicleDisplayName } from "@/lib/types";
import { BILL_OF_SALE_FORM_FIELDS } from "./bill-of-sale-fields";
import { logger } from "@/lib/utils/logger";

export interface BillOfSaleInput {
  buyerName: string;
  buyerAddress: string;
  buyerPhone?: string | null;
  buyerEmail?: string | null;
  saleDate: string;
  salePrice: number;
  paymentMethod?: string | null;
  notes?: string | null;
  odometer?: number | null;
  vehicle: {
    year: number;
    make: string;
    model: string;
    category?: string | null;
    vin?: string | null;
    license_plate?: string | null;
    color?: string | null;
    mileage?: number | null;
  };
}

const TEMPLATE_PATH = path.join(process.cwd(), "public", "templates", "bill-of-sale.pdf");

function formatUsDate(isoDate: string): string {
  const parts = isoDate.split("-");
  if (parts.length !== 3) return isoDate;
  const [y, m, d] = parts.map(Number);
  if (!y || !m || !d) return isoDate;
  const date = new Date(y, m - 1, d);
  if (Number.isNaN(date.getTime())) return isoDate;
  return date.toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" });
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
}

function sellerAddressLine(): string {
  const { address, city, state, zip } = CONTACT_INFO;
  return `${address}, ${city}, ${state} ${zip}`;
}

export async function generateBillOfSalePdf(input: BillOfSaleInput): Promise<Uint8Array> {
  let templateBytes: Buffer;
  try {
    templateBytes = await fs.readFile(TEMPLATE_PATH);
  } catch {
    throw new Error(
      "Bill of sale template not found at public/templates/bill-of-sale.pdf. Run: npx tsx scripts/generate-bill-of-sale-template.ts",
    );
  }

  const pdfDoc = await PDFDocument.load(templateBytes);
  const form = pdfDoc.getForm();

  const vehicleDesc = [
    getVehicleDisplayName(input.vehicle),
    input.vehicle.category ? `(${input.vehicle.category})` : "",
  ]
    .filter(Boolean)
    .join(" ");

  const odometerVal =
    input.odometer ?? input.vehicle.mileage ?? null;
  const mileageStr =
    odometerVal != null && Number.isFinite(Number(odometerVal))
      ? `${Number(odometerVal).toLocaleString()} mi`
      : "";

  const values: Record<string, string> = {
    seller_name: SITE_NAME,
    seller_address: sellerAddressLine(),
    seller_phone: CONTACT_INFO.phone,
    seller_email: CONTACT_INFO.email,
    buyer_name: input.buyerName,
    buyer_address: input.buyerAddress,
    buyer_phone: input.buyerPhone?.trim() || "",
    buyer_email: input.buyerEmail?.trim() || "",
    vehicle_description: vehicleDesc,
    vehicle_vin: input.vehicle.vin?.trim() || "",
    vehicle_plate: input.vehicle.license_plate?.trim() || "",
    vehicle_color: input.vehicle.color?.trim() || "",
    vehicle_mileage: mileageStr,
    odometer: mileageStr,
    sale_price: formatCurrency(input.salePrice),
    sale_date: formatUsDate(input.saleDate),
    payment_method: input.paymentMethod?.trim() || "",
    notes: input.notes?.trim() || "",
  };

  for (const fieldName of BILL_OF_SALE_FORM_FIELDS) {
    const value = values[fieldName] ?? "";
    try {
      const field = form.getTextField(fieldName);
      field.setText(value);
    } catch {
      logger.warn(`Bill of sale field not found in template: ${fieldName}`);
    }
  }

  try {
    form.flatten();
  } catch {
    // Non-fatal if flatten fails on some viewers
  }

  return pdfDoc.save();
}
