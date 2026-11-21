import {
  PDFArray,
  PDFDocument,
  PDFName,
  PDFRawStream,
  StandardFonts,
  decodePDFRawStream,
  type PDFPage,
} from "pdf-lib";
import {
  AGREEMENT_CONTACT_EMAIL,
  AGREEMENT_CONTACT_PHONE,
  UNINSURED_DRIVER_FEE_USD,
} from "@/lib/agreement/agreement-policy";
import { logger } from "@/lib/utils/logger";

/**
 * The blank agreement form (public/templates/rental-agreement.pdf) was generated with an old phone
 * number, an old email, and an optional-insurance offer that Next Gear Auto no longer sells.
 *
 * Rather than hiding the old text under a white box (the old numbers would stay in the file and
 * could be copied or searched), this edits the form's own text before it is filled and flattened,
 * so the old wording does not exist anywhere in the generated PDF.
 *
 * Each edit targets one text line by its exact position. If the template file is ever replaced and
 * a line is not found, that edit is skipped with a warning; signing is never blocked by this.
 */

const PAGE_WIDTH = 612;
const OLD_PHONE = "609-400-4459";

function pdfEscape(text: string): string {
  return text.replace(/[\\()]/g, "\\$&");
}

function textOpPattern(x: string, y: string): RegExp {
  return new RegExp(
    `BT 1 0 0 1 ${x.replace(/\./g, "\\.")} ${y} Tm \\((?:[^\\\\()]|\\\\.)*\\) Tj T\\* ET`,
  );
}

function readPageContent(page: PDFPage): string {
  const contents = page.node.Contents();
  const streams: PDFRawStream[] = [];
  if (contents instanceof PDFArray) {
    for (let i = 0; i < contents.size(); i++) {
      const s = contents.lookup(i);
      if (s instanceof PDFRawStream) streams.push(s);
    }
  } else if (contents instanceof PDFRawStream) {
    streams.push(contents);
  }
  return streams
    .map((s) => Buffer.from(decodePDFRawStream(s).decode()).toString("latin1"))
    .join("\n");
}

function writePageContent(pdfDoc: PDFDocument, page: PDFPage, content: string): void {
  const stream = pdfDoc.context.flateStream(Buffer.from(content, "latin1"));
  page.node.set(PDFName.of("Contents"), pdfDoc.context.register(stream));
}

export async function patchRentalAgreementTemplate(pdfDoc: PDFDocument): Promise<boolean> {
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const pages = pdfDoc.getPages();
  let allApplied = true;

  const replaceOp = (content: string, x: string, y: string, newOp: string, label: string) => {
    const pattern = textOpPattern(x, y);
    if (!pattern.test(content)) {
      logger.warn(`Agreement template patch: line not found (${label}); skipped.`);
      allApplied = false;
      return content;
    }
    return content.replace(pattern, () => newOp);
  };

  // ── Page 1: company contact line (centered under the address) ──
  const page1 = pages[0];
  if (page1) {
    const header = `Phone: ${AGREEMENT_CONTACT_PHONE}  |  Email: ${AGREEMENT_CONTACT_EMAIL}`;
    const headerX = ((PAGE_WIDTH - helvetica.widthOfTextAtSize(header, 8.5)) / 2).toFixed(4);
    const content = readPageContent(page1);
    writePageContent(
      pdfDoc,
      page1,
      replaceOp(
        content,
        "183.8847",
        "612",
        `BT 1 0 0 1 ${headerX} 612 Tm (${pdfEscape(header)}) Tj T* ET`,
        "page 1 contact line",
      ),
    );
  }

  // ── Page 2: Section 5, insurance (bring your own; no optional coverage sold) ──
  const page2 = pages[1];
  if (page2) {
    let content = readPageContent(page2);
    content = replaceOp(
      content,
      "54",
      "717",
      `BT /F1 8.5 Tf 1 0 0 1 54 717 Tm (${pdfEscape(
        "Renter MUST carry their own active auto insurance that covers this vehicle and meets New Jersey minimum requirements.",
      )}) Tj T* ET`,
      "page 2 insurance requirement",
    );
    content = replaceOp(
      content,
      "54",
      "680",
      `BT /F2 8.5 Tf 1 0 0 1 54 680 Tm (${pdfEscape(
        `No proof of insurance: $${UNINSURED_DRIVER_FEE_USD} Uninsured Driver Fee per rental, plus Renter pays out of pocket for any and all damage.`,
      )}) Tj T* ET`,
      "page 2 uninsured fee",
    );
    content = replaceOp(
      content,
      "54",
      "665",
      `BT /F1 8.5 Tf 1 0 0 1 54 665 Tm (${pdfEscape(
        "Next Gear Auto does not sell or provide insurance, damage waivers, or liability protection.",
      )}) Tj T* ET`,
      "page 2 no coverage sold",
    );
    // The "Accept" label next to the old optional-coverage checkbox.
    content = replaceOp(content, "389.069", "665", "", "page 2 accept label");
    // The checkbox outline itself is drawn into the page, separate from the form field.
    const boxPattern = /q\s+(?:[^qQ]*?)n 375\.319 663\.25 10\.5 10\.5 re B\*\s+Q/;
    if (boxPattern.test(content)) {
      content = content.replace(boxPattern, "");
    } else {
      logger.warn("Agreement template patch: old coverage checkbox outline not found; skipped.");
      allApplied = false;
    }
    writePageContent(pdfDoc, page2, content);
  }

  // ── Page 3: accident procedure phone number, and the acknowledgment above the signatures ──
  const page3 = pages[2];
  if (page3) {
    let content = readPageContent(page3);
    if (content.includes(OLD_PHONE)) {
      content = content.split(OLD_PHONE).join(AGREEMENT_CONTACT_PHONE);
    } else {
      logger.warn("Agreement template patch: old phone number not found on page 3; skipped.");
      allApplied = false;
    }
    // The signature page now follows all of the terms, including the supplemental pages.
    content = replaceOp(
      content,
      "54",
      "415",
      `BT 1 0 0 1 54 415 Tm (${pdfEscape(
        "By signing below, Renter acknowledges and agrees to all terms of this Agreement, including the Supplemental Terms.",
      )}) Tj T* ET`,
      "page 3 signature acknowledgment",
    );
    writePageContent(pdfDoc, page3, content);
  }

  // The checkbox for the optional coverage that no longer exists.
  try {
    const form = pdfDoc.getForm();
    form.removeField(form.getCheckBox("c40"));
  } catch {
    // Field already absent from this template.
  }

  return allApplied;
}
