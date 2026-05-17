/**
 * Creates public/templates/bill-of-sale.pdf with AcroForm fields for development/CI.
 * Replace with your legal template later; keep field names in sync with bill-of-sale-fields.ts
 */
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import fs from "fs/promises";
import path from "path";
import { BILL_OF_SALE_FORM_FIELDS } from "../src/lib/vehicle-sale/bill-of-sale-fields";

const OUT = path.join(process.cwd(), "public", "templates", "bill-of-sale.pdf");

async function main() {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([612, 792]);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  page.drawText("MOTOR VEHICLE BILL OF SALE", {
    x: 72,
    y: 720,
    size: 16,
    font: bold,
    color: rgb(0, 0, 0),
  });

  const form = pdfDoc.getForm();
  let y = 680;
  const lineH = 28;

  for (const name of BILL_OF_SALE_FORM_FIELDS) {
    const label = name.replace(/_/g, " ");
    page.drawText(label + ":", { x: 72, y: y + 14, size: 9, font, color: rgb(0.3, 0.3, 0.3) });
    const field = form.createTextField(name);
    field.addToPage(page, { x: 200, y, width: 340, height: 18 });
    y -= lineH;
    if (y < 72) break;
  }

  await fs.mkdir(path.dirname(OUT), { recursive: true });
  const bytes = await pdfDoc.save();
  await fs.writeFile(OUT, bytes);
  console.log(`Wrote ${OUT} (${bytes.length} bytes)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
