import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { BookingInvoiceData } from "./invoice-data";
import { fmtMoney } from "./invoice-data";
import { CONTACT_INFO, SITE_NAME } from "@/lib/constants";
import { fmtDate, fmtTime } from "@/lib/email/templates";

function formatInvoiceDate(isoDate: string): string {
  return fmtDate(isoDate);
}

export async function generateInvoicePdf(data: BookingInvoiceData): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([612, 792]);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const purple = rgb(0.49, 0.23, 0.93);

  let y = 740;

  const draw = (text: string, size: number, useBold = false, color = rgb(0.1, 0.1, 0.1)) => {
    page.drawText(text, { x: 50, y, size, font: useBold ? bold : font, color });
    y -= size + 6;
  };

  page.drawText(SITE_NAME, { x: 50, y, size: 20, font: bold, color: purple });
  y -= 28;
  draw("INVOICE", 14, true, purple);
  y -= 4;
  draw(`Invoice date: ${formatInvoiceDate(data.invoiceDate)}`, 10);
  draw(`Booking ID: ${data.bookingId}`, 10);
  y -= 8;

  draw(`Bill to: ${data.customerName}`, 11, true);
  draw(data.customerEmail, 10);
  y -= 6;

  draw(`Vehicle: ${data.vehicleName}`, 10);
  const pickupLine = `Pickup: ${fmtDate(data.pickupDate)}${data.pickupTime ? ` at ${fmtTime(data.pickupTime)}` : ""}`;
  const returnLine = `Return: ${fmtDate(data.returnDate)}${data.returnTime ? ` at ${fmtTime(data.returnTime)}` : ""}`;
  draw(pickupLine, 10);
  draw(returnLine, 10);
  y -= 12;

  page.drawText("Description", { x: 50, y, size: 10, font: bold });
  page.drawText("Amount", { x: 480, y, size: 10, font: bold });
  y -= 16;
  page.drawLine({ start: { x: 50, y }, end: { x: 562, y }, thickness: 1, color: rgb(0.85, 0.85, 0.85) });
  y -= 14;

  for (const item of data.lineItems) {
    const amountStr = item.isCredit ? `-${fmtMoney(item.amount)}` : fmtMoney(item.amount);
    page.drawText(item.label.slice(0, 55), { x: 50, y, size: 10, font });
    page.drawText(amountStr, { x: 480, y, size: 10, font });
    y -= 14;
    if (y < 120) break;
  }

  y -= 8;
  page.drawLine({ start: { x: 50, y }, end: { x: 562, y }, thickness: 1, color: rgb(0.85, 0.85, 0.85) });
  y -= 18;

  const summaryRows: [string, string, boolean?][] = [
    ["Charges total", fmtMoney(data.chargesTotal)],
    ["Payments received", `-${fmtMoney(data.amountPaid)}`],
    ["Balance due", fmtMoney(data.balanceDue), true],
  ];

  for (const [label, value, emphasize] of summaryRows) {
    page.drawText(label, { x: 50, y, size: emphasize ? 11 : 10, font: emphasize ? bold : font });
    page.drawText(value, {
      x: emphasize ? 460 : 480,
      y,
      size: emphasize ? 11 : 10,
      font: emphasize ? bold : font,
      color: emphasize && data.balanceDue > 0 ? rgb(0.75, 0.1, 0.1) : rgb(0.1, 0.1, 0.1),
    });
    y -= 16;
  }

  y -= 20;
  draw(
    `${CONTACT_INFO.address}, ${CONTACT_INFO.city}, ${CONTACT_INFO.state} ${CONTACT_INFO.zip}`,
    9,
  );
  draw(`${CONTACT_INFO.phone} • ${CONTACT_INFO.email}`, 9);

  return pdfDoc.save();
}
