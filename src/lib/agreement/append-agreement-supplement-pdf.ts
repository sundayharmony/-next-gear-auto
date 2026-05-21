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

function drawSection(
  page: ReturnType<PDFDocument["addPage"]>,
  font: PDFFont,
  boldFont: PDFFont,
  section: AgreementTermsSection,
  startY: number,
  contentWidth: number,
): number {
  let y = startY;
  page.drawText(section.title, {
    x: MARGIN,
    y,
    size: TITLE_SIZE,
    font: boldFont,
    color: rgb(0.1, 0.1, 0.1),
  });
  y -= LINE_HEIGHT + 2;

  for (const paragraph of section.paragraphs) {
    const lines = wrapText(paragraph, font, FONT_SIZE, contentWidth);
    for (const line of lines) {
      page.drawText(line, { x: MARGIN, y, size: FONT_SIZE, font, color: rgb(0.15, 0.15, 0.15) });
      y -= LINE_HEIGHT;
    }
    y -= 4;
  }

  if (section.bullets?.length) {
    for (const bullet of section.bullets) {
      const lines = wrapText(`• ${bullet}`, font, FONT_SIZE, contentWidth - 8);
      for (const line of lines) {
        page.drawText(line, { x: MARGIN + 4, y, size: FONT_SIZE, font, color: rgb(0.15, 0.15, 0.15) });
        y -= LINE_HEIGHT;
      }
    }
    y -= 4;
  }

  return y - SECTION_GAP;
}

/** Appends supplemental legal sections so signed PDFs match inline agreement updates. */
export async function appendAgreementSupplementPages(pdfDoc: PDFDocument): Promise<void> {
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const pageSize: [number, number] = [612, 792];
  const contentWidth = pageSize[0] - MARGIN * 2;

  let page = pdfDoc.addPage(pageSize);
  let y = pageSize[1] - MARGIN;

  page.drawText("SUPPLEMENTAL RENTAL TERMS", {
    x: MARGIN,
    y,
    size: 11,
    font: boldFont,
    color: rgb(0.1, 0.1, 0.1),
  });
  y -= LINE_HEIGHT + 6;
  page.drawText(
    "The following terms supplement and are incorporated into the Vehicle Rental Agreement signed by Renter.",
    {
      x: MARGIN,
      y,
      size: FONT_SIZE,
      font,
      color: rgb(0.2, 0.2, 0.2),
    },
  );
  y -= LINE_HEIGHT + 10;

  for (const section of RENTAL_AGREEMENT_SUPPLEMENT_SECTIONS) {
    const estimatedHeight =
      LINE_HEIGHT * 3 +
      section.paragraphs.reduce(
        (sum, p) => sum + Math.ceil(p.length / 90) * LINE_HEIGHT + 4,
        0,
      );
    if (y - estimatedHeight < MARGIN + 40) {
      page = pdfDoc.addPage(pageSize);
      y = pageSize[1] - MARGIN;
    }
    y = drawSection(page, font, boldFont, section, y, contentWidth);
  }

  page.drawText("Next Gear Auto LLC — Jersey City, NJ", {
    x: MARGIN,
    y: MARGIN - 10,
    size: 7,
    font,
    color: rgb(0.4, 0.4, 0.4),
  });
}
