import { PDFDocument, StandardFonts, rgb, type PDFFont } from "pdf-lib";
import { CONTACT_INFO } from "@/lib/constants";
import { drawCompanyLetterhead } from "@/lib/documents/company-letterhead-pdf";
import type { DocumentLineItem } from "@/lib/documents/document-line-items";
import { lineItemAmount } from "@/lib/documents/document-line-items";

const PAGE_WIDTH = 612;
const MARGIN = 50;
const TEXT_WIDTH = PAGE_WIDTH - MARGIN * 2;

function wrapText(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(test, size) > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines.length ? lines : [""];
}

type PdfWriter = {
  y: number;
  draw: (text: string, size?: number, bold?: boolean) => void;
  drawLines: (text: string, size?: number) => void;
};

function createWriter(page: ReturnType<PDFDocument["addPage"]>, font: PDFFont, bold: PDFFont): PdfWriter {
  const state: PdfWriter = {
    y: 740,
    draw(text: string, size = 10, useBold = false) {
      page.drawText(text, {
        x: MARGIN,
        y: state.y,
        size,
        font: useBold ? bold : font,
        color: rgb(0.12, 0.12, 0.12),
      });
      state.y -= size + 6;
    },
    drawLines(text: string, size = 10) {
      for (const line of wrapText(text, font, size, TEXT_WIDTH)) {
        if (state.y < 72) break;
        page.drawText(line, { x: MARGIN, y: state.y, size, font, color: rgb(0.2, 0.2, 0.2) });
        state.y -= size + 4;
      }
    },
  };
  return state;
}

function drawLineItemsTable(
  w: PdfWriter,
  page: ReturnType<PDFDocument["addPage"]>,
  font: PDFFont,
  bold: PDFFont,
  items: DocumentLineItem[],
) {
  if (!items.length) return;
  w.draw("Line items", 11, true);
  w.y -= 4;
  page.drawText("Title", { x: MARGIN, y: w.y, size: 9, font: bold });
  page.drawText("Qty", { x: 320, y: w.y, size: 9, font: bold });
  page.drawText("Rate", { x: 360, y: w.y, size: 9, font: bold });
  page.drawText("Amount", { x: 460, y: w.y, size: 9, font: bold });
  w.y -= 14;
  page.drawLine({
    start: { x: MARGIN, y: w.y },
    end: { x: PAGE_WIDTH - MARGIN, y: w.y },
    thickness: 0.5,
    color: rgb(0.8, 0.8, 0.8),
  });
  w.y -= 12;

  let total = 0;
  for (const item of items) {
    if (w.y < 80) break;
    const amt = lineItemAmount(item);
    total += amt;
    const title = item.title.slice(0, 42);
    page.drawText(title, { x: MARGIN, y: w.y, size: 9, font });
    page.drawText(String(item.quantity), { x: 320, y: w.y, size: 9, font });
    page.drawText(`$${item.unitPrice.toFixed(2)}`, { x: 360, y: w.y, size: 9, font });
    page.drawText(`$${amt.toFixed(2)}`, { x: 460, y: w.y, size: 9, font });
    w.y -= 12;
    if (item.description?.trim()) {
      for (const line of wrapText(item.description, font, 8, TEXT_WIDTH - 20).slice(0, 2)) {
        if (w.y < 72) break;
        page.drawText(line, { x: MARGIN + 8, y: w.y, size: 8, font, color: rgb(0.45, 0.45, 0.45) });
        w.y -= 10;
      }
    }
  }
  w.y -= 4;
  w.draw(`Line items total: $${total.toFixed(2)}`, 10, true);
}

export type TicketPdfInput = {
  id: string;
  ticketLabel: string;
  ticketType: string;
  violationDate: string;
  status: string;
  amountDue: number;
  state: string;
  municipality: string;
  licensePlate: string;
  vehicleName: string;
  customerName: string;
  bookingId: string | null;
  lineItems: DocumentLineItem[];
  notes: string;
};

export async function generateTicketPdf(data: TicketPdfInput): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([612, 792]);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const w = createWriter(page, font, bold);
  w.y = await drawCompanyLetterhead(pdfDoc, page, font, bold, "VIOLATION TICKET RECORD");
  w.y -= 4;
  w.draw(`Reference: ${data.ticketLabel}`, 10);
  w.draw(`Record ID: ${data.id}`, 9);
  w.y -= 6;

  w.draw(`Type: ${data.ticketType}`, 10);
  w.draw(`Violation date: ${data.violationDate}`, 10);
  w.draw(`Status: ${data.status}`, 10);
  w.draw(`Amount due: $${data.amountDue.toFixed(2)}`, 11, true);
  w.draw(`Plate: ${data.licensePlate || "—"}`, 10);
  w.draw(`Location: ${data.municipality || "—"}, ${data.state || "—"}`, 10);
  w.draw(`Vehicle: ${data.vehicleName || "—"}`, 10);
  w.draw(`Customer: ${data.customerName || "—"}`, 10);
  if (data.bookingId) w.draw(`Booking: ${data.bookingId}`, 10);
  w.y -= 8;

  drawLineItemsTable(w, page, font, bold, data.lineItems);

  if (data.notes?.trim()) {
    w.y -= 6;
    w.draw("Notes", 11, true);
    w.drawLines(data.notes, 10);
  }

  w.y -= 12;
  w.draw(`${CONTACT_INFO.phone} • ${CONTACT_INFO.email}`, 9);

  return pdfDoc.save();
}

export type IncidentPdfInput = {
  id: string;
  documentNumber: string;
  title: string;
  status: string;
  occurredAt: string;
  description: string;
  vehicleName: string;
  customerName: string;
  bookingId: string | null;
  lineItems: DocumentLineItem[];
  notes: string;
};

export async function generateIncidentPdf(data: IncidentPdfInput): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([612, 792]);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const w = createWriter(page, font, bold);
  w.y = await drawCompanyLetterhead(pdfDoc, page, font, bold, "INCIDENT REPORT");
  w.y -= 4;
  w.draw(data.title, 12, true);
  w.draw(`Incident #: ${data.documentNumber}`, 12, true);
  w.draw(`Occurred: ${data.occurredAt}`, 10);
  w.draw(`Status: ${data.status}`, 10);
  w.draw(`Vehicle: ${data.vehicleName || "—"}`, 10);
  w.draw(`Customer: ${data.customerName || "—"}`, 10);
  if (data.bookingId) w.draw(`Booking: ${data.bookingId}`, 10);
  w.y -= 6;

  if (data.description?.trim()) {
    w.draw("Description", 11, true);
    w.drawLines(data.description, 10);
    w.y -= 4;
  }

  drawLineItemsTable(w, page, font, bold, data.lineItems);

  if (data.notes?.trim()) {
    w.y -= 6;
    w.draw("Internal notes", 11, true);
    w.drawLines(data.notes, 10);
  }

  w.y -= 12;
  w.draw(`${CONTACT_INFO.phone} • ${CONTACT_INFO.email}`, 9);

  return pdfDoc.save();
}
