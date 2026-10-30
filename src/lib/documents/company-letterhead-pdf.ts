import fs from "fs/promises";
import path from "path";
import { PDFDocument, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { CONTACT_INFO } from "@/lib/constants";

let logoBytesPromise: Promise<Uint8Array> | null = null;

function loadLogoBytes(): Promise<Uint8Array> {
  if (!logoBytesPromise) {
    logoBytesPromise = fs
      .readFile(path.join(process.cwd(), "public/images/logo.png"))
      .then((buf) => new Uint8Array(buf));
  }
  return logoBytesPromise;
}

/** Company letterhead: wordmark logo, document title, legal name, address, and phone. */
export async function drawCompanyLetterhead(
  pdfDoc: PDFDocument,
  page: PDFPage,
  font: PDFFont,
  bold: PDFFont,
  title: string,
  startY = 760,
): Promise<number> {
  const pageWidth = page.getWidth();
  const ink = rgb(0.15, 0.15, 0.15);
  const muted = rgb(0.35, 0.35, 0.35);
  const logoWidth = 220;

  const logo = await pdfDoc.embedPng(await loadLogoBytes());
  const logoHeight = (logo.height / logo.width) * logoWidth;
  page.drawImage(logo, {
    x: (pageWidth - logoWidth) / 2,
    y: startY - logoHeight,
    width: logoWidth,
    height: logoHeight,
  });

  const center = (text: string, y: number, size: number, useBold: boolean, color = ink) => {
    const face = useBold ? bold : font;
    const width = face.widthOfTextAtSize(text, size);
    page.drawText(text, { x: Math.max(36, (pageWidth - width) / 2), y, size, font: face, color });
  };

  let y = startY - logoHeight - 8;
  center(title, y, 13, true, ink);
  y -= 16;
  center("Next Gear Auto LLC", y, 10, false, muted);
  y -= 13;
  center(
    `${CONTACT_INFO.address}, ${CONTACT_INFO.city}, ${CONTACT_INFO.state} ${CONTACT_INFO.zip}`,
    y,
    9,
    false,
    muted,
  );
  y -= 12;
  center(`Phone: ${CONTACT_INFO.phone} | Email: ${CONTACT_INFO.email}`, y, 9, false, muted);
  y -= 14;
  page.drawLine({
    start: { x: 50, y },
    end: { x: pageWidth - 50, y },
    thickness: 1,
    color: rgb(0.8, 0.8, 0.85),
  });
  return y - 18;
}
