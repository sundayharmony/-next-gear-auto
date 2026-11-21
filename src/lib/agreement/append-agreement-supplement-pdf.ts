import { PDFDocument, PDFFont, StandardFonts, rgb } from "pdf-lib";
import {
  RENTAL_AGREEMENT_SUPPLEMENT_SECTIONS,
  type AgreementTermsSection,
} from "@/lib/agreement/rental-agreement-terms";

const MARGIN = 50;
const FONT_SIZE = 8;
const LINE_HEIGHT = 11;
const TITLE_SIZE = 9;
const SECTION_GAP = 14;
/** Lowest y a line of body text may be drawn at; leaves room for the footer. */
const BOTTOM_LIMIT = MARGIN + 20;

function wrapText(text: string, font: PDFFont, fontSize: number, maxWidth: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(next, fontSize) <= maxWidth) {
      current = next;
    } else {
      if (current) lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

/**
 * Adds the supplemental legal sections so signed PDFs match the on-screen agreement.
 *
 * Call this right after loading the form template. The pages are inserted BEFORE the template's
 * last page (the one with the signatures and acknowledgment), so every term comes before the
 * renter signs and the signature page is the last page of the agreement. Anything appended later
 * (such as the rental summary) lands after the signature page.
 */
export async function appendAgreementSupplementPages(
  pdfDoc: PDFDocument,
  sections: AgreementTermsSection[] = RENTAL_AGREEMENT_SUPPLEMENT_SECTIONS
): Promise<void> {
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const pageSize: [number, number] = [612, 792];
  const contentWidth = pageSize[0] - MARGIN * 2;
  const ink = rgb(0.15, 0.15, 0.15);

  const supplementPages: ReturnType<PDFDocument["addPage"]>[] = [];
  // The template's final page holds the signature block; keep it last by inserting before it.
  let insertAt = Math.max(0, pdfDoc.getPageCount() - 1);
  let page = pdfDoc.insertPage(insertAt++, pageSize);
  supplementPages.push(page);
  let y = pageSize[1] - MARGIN;

  const newPage = () => {
    page = pdfDoc.insertPage(insertAt++, pageSize);
    supplementPages.push(page);
    y = pageSize[1] - MARGIN;
  };

  /** Starts a new page when `neededHeight` would not fit above the bottom limit. */
  const ensureSpace = (neededHeight: number) => {
    if (y - neededHeight < BOTTOM_LIMIT) newPage();
  };

  const drawLines = (lines: string[], x: number) => {
    for (const line of lines) {
      ensureSpace(LINE_HEIGHT);
      page.drawText(line, { x, y, size: FONT_SIZE, font, color: ink });
      y -= LINE_HEIGHT;
    }
  };

  page.drawText("SUPPLEMENTAL RENTAL TERMS", {
    x: MARGIN,
    y,
    size: 11,
    font: boldFont,
    color: rgb(0.1, 0.1, 0.1),
  });
  y -= LINE_HEIGHT + 6;
  drawLines(
    wrapText(
      "These terms continue Sections 4 through 7 and add further terms. They are part of the Vehicle Rental Agreement signed by Renter. Sections 10 through 14 and the signature page follow.",
      font,
      FONT_SIZE,
      contentWidth,
    ),
    MARGIN,
  );
  y -= LINE_HEIGHT + 10;

  for (const section of sections) {
    const firstParagraphLines = section.paragraphs[0]
      ? wrapText(section.paragraphs[0], font, FONT_SIZE, contentWidth)
      : [];
    // Keep the title together with at least the first two lines of its text.
    ensureSpace(LINE_HEIGHT + 2 + Math.min(firstParagraphLines.length, 2) * LINE_HEIGHT);

    page.drawText(section.title, {
      x: MARGIN,
      y,
      size: TITLE_SIZE,
      font: boldFont,
      color: rgb(0.1, 0.1, 0.1),
    });
    y -= LINE_HEIGHT + 2;

    for (const paragraph of section.paragraphs) {
      drawLines(wrapText(paragraph, font, FONT_SIZE, contentWidth), MARGIN);
      y -= 4;
    }

    if (section.bullets?.length) {
      for (const bullet of section.bullets) {
        drawLines(wrapText(`- ${bullet}`, font, FONT_SIZE, contentWidth - 8), MARGIN + 4);
      }
      y -= 4;
    }

    y -= SECTION_GAP;
  }

  const total = supplementPages.length;
  supplementPages.forEach((p, index) => {
    p.drawText(`Next Gear Auto LLC — Jersey City, NJ   |   Supplemental Terms, page ${index + 1} of ${total}`, {
      x: MARGIN,
      y: MARGIN - 10,
      size: 7,
      font,
      color: rgb(0.4, 0.4, 0.4),
    });
  });
}
