import { rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { CONTACT_INFO } from "@/lib/constants";

/** Same letterhead as the vehicle rental agreement (brand, legal name, address, phone, email). */
export function drawCompanyLetterhead(
  page: PDFPage,
  font: PDFFont,
  bold: PDFFont,
  title: string,
  startY = 748,
): number {
  const pageWidth = page.getWidth();
  const purple = rgb(0.486, 0.227, 0.929);
  const ink = rgb(0.15, 0.15, 0.15);
  const muted = rgb(0.35, 0.35, 0.35);

  const center = (text: string, y: number, size: number, useBold: boolean, color = ink) => {
    const face = useBold ? bold : font;
    const width = face.widthOfTextAtSize(text, size);
    page.drawText(text, { x: Math.max(36, (pageWidth - width) / 2), y, size, font: face, color });
  };

  let y = startY;
  center("NEXTGEARAUTO", y, 11, true, purple);
  y -= 18;
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
