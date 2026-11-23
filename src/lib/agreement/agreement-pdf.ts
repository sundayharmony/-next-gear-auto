import fs from "fs/promises";
import path from "path";
import {
  PDFDocument,
  PDFFont,
  PDFImage,
  PDFPage,
  StandardFonts,
  rgb,
  type RGB,
} from "pdf-lib";
import { CONTACT_INFO } from "@/lib/constants";
import {
  AGREEMENT_ESIGN_DISCLOSURE,
  RENTAL_AGREEMENT_ADDITIONAL_SECTIONS,
  RENTAL_AGREEMENT_INLINE_SECTIONS,
  RENTAL_AGREEMENT_SECTION_4A_AUTHORIZED,
  RENTAL_AGREEMENT_SUPPLEMENT_SECTIONS,
  getAgreementSupplementSections,
  type AgreementTermsSection,
} from "@/lib/agreement/rental-agreement-terms";
import { AGREEMENT_VERSION } from "@/lib/agreement/agreement-version";
import {
  AGREEMENT_CONTACT_EMAIL,
  AGREEMENT_CONTACT_PHONE,
  UNINSURED_DRIVER_FEE_USD,
} from "@/lib/agreement/agreement-policy";
import {
  paymentMethodLabel,
  type AgreementBookingContext,
} from "@/lib/agreement/agreement-booking-context";
import {
  resolveAgreementBalanceDue,
  resolveAgreementDeposit,
} from "@/lib/agreement/agreement-deposit";
import { getDisplayReturnDate, parseRecurringBookingMeta } from "@/lib/utils/recurring-booking";
import { fmtTime } from "@/lib/email/templates";
import { getVehicleDisplayName } from "@/lib/types";
import { logger } from "@/lib/utils/logger";

/**
 * The Vehicle Rental Agreement PDF, drawn entirely in code (no form template) so every page shares
 * one header, one footer, one set of fonts, one table style and one spacing scale.
 *
 * Page flow: agreement terms (flowing across as many pages as needed) -> signature page (always the
 * last page of the agreement) -> rental summary. Every term the renter agrees to comes before the
 * signatures.
 */

export const AGREEMENT_SIGNATURE_IDS = ["t35", "t42", "t43", "t47", "t51", "t55", "t57"] as const;
export type AgreementSignatureId = (typeof AGREEMENT_SIGNATURE_IDS)[number];
export type AgreementSignatureData = Partial<Record<AgreementSignatureId, string>>;

/** Identity details from the customer record (customers.dob and customers.driver_license JSON). */
export interface AgreementRenterIdentity {
  dob?: string | null;
  licenseNumber?: string | null;
  licenseState?: string | null;
  licenseExpires?: string | null;
  addressLine?: string | null;
  cityStateZip?: string | null;
}

export interface AgreementPdfVehicle {
  make?: string;
  model?: string;
  year?: number;
  license_plate?: string;
  vin?: string;
  color?: string;
  mileage?: number;
}

export interface AgreementPdfBooking {
  id?: string | null;
  customer_name?: string | null;
  customer_email?: string | null;
  customer_phone?: string | null;
  pickup_date?: string | null;
  return_date?: string | null;
  pickup_time?: string | null;
  return_time?: string | null;
  total_price?: number | null;
  deposit?: number | null;
  admin_notes?: string | null;
}

export interface AgreementPdfInput {
  booking: AgreementPdfBooking;
  vehicle: AgreementPdfVehicle | null;
  renter?: AgreementRenterIdentity | null;
  context: AgreementBookingContext;
  signatures?: AgreementSignatureData;
  /** ISO timestamp of signing; null/undefined renders an unsigned copy (preview). */
  signedAtIso?: string | null;
  /** Set when an older signed agreement is re-issued in the current format. */
  reissuedAtIso?: string | null;
}

// ── Layout constants ─────────────────────────────────────────────────────────
const PAGE_W = 612;
const PAGE_H = 792;
const MARGIN = 54;
const CONTENT_W = PAGE_W - MARGIN * 2;
const BODY_TOP = PAGE_H - 96;
const BODY_BOTTOM = 76;

const BODY_SIZE = 8.6;
const LINE_H = 11.8;
const PARA_GAP = 5;
const SECTION_GAP = 13;

const NAVY = rgb(0, 31 / 255, 150 / 255);
const INK = rgb(0.13, 0.13, 0.15);
const MUTED = rgb(0.4, 0.4, 0.45);
const RULE = rgb(0.8, 0.8, 0.85);
const CELL_BORDER = rgb(0.72, 0.72, 0.78);
const CELL_FILL = rgb(0.972, 0.972, 0.985);
const TINT = rgb(0.93, 0.93, 0.98);

type PageRole = "first" | "terms" | "signature" | "summary";

// ── Text helpers ─────────────────────────────────────────────────────────────
const WINANSI_EXTRAS = new Set([0x2013, 0x2014, 0x2018, 0x2019, 0x201c, 0x201d, 0x2022, 0x2026, 0x20ac, 0x2122]);

/** Standard PDF fonts only encode Latin-1 plus a few punctuation marks; anything else would throw. */
export function pdfSafe(text: string): string {
  let out = "";
  for (const ch of text) {
    const code = ch.codePointAt(0) ?? 63;
    if (code === 0x2212 || code === 0x2011) out += "-";
    else if (code === 0xa0 || code === 0x202f || code === 0x2009) out += " ";
    else if (code === 0x2264) out += "<=";
    else if (code === 0x2265) out += ">=";
    else if (code === 0x2192) out += "->";
    else if (code === 0x2713 || code === 0x2714) out += "x";
    else if (code === 0x0a || code === 0x0d || code === 0x09) out += " ";
    else if (code < 0x20) continue;
    else if (code <= 0xff || WINANSI_EXTRAS.has(code)) out += ch;
    else out += "?";
  }
  return out;
}

function pdfDate(value: string | null | undefined): string {
  if (!value) return "";
  const parts = value.split("-");
  if (parts.length !== 3) return "";
  const [y, m, d] = parts.map(Number);
  if (!y || !m || !d || Number.isNaN(y) || Number.isNaN(m) || Number.isNaN(d)) return "";
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
  });
}

function formatDob(dob: string | null | undefined): string {
  if (!dob) return "";
  const trimmed = dob.trim();
  const iso = /^(\d{4}-\d{2}-\d{2})/.exec(trimmed);
  if (iso) return pdfDate(iso[1]);
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(trimmed)) return trimmed;
  return "";
}

function formatLicense(renter: AgreementRenterIdentity | null | undefined): string {
  const number = renter?.licenseNumber?.trim();
  if (!number) return "";
  return renter?.licenseState ? `${renter.licenseState} ${number}` : number;
}

const stripNumber = (title: string) => title.replace(/^\d+[A-Z]?\.\s*/, "").trim();

interface Token {
  text: string;
  bold: boolean;
}

/** "Qualifying coverage. Renter's policy..." -> bold lead-in followed by regular text. */
function toTokens(text: string, allowLeadIn: boolean): Token[] {
  const clean = pdfSafe(text);
  const tokens: Token[] = [];
  let rest = clean;
  if (allowLeadIn) {
    const m = /^([A-Z][a-z]+(?: [A-Za-z/&,'-]+){0,5}\.)\s/.exec(clean);
    if (m) {
      for (const w of m[1].split(" ")) tokens.push({ text: w, bold: true });
      rest = clean.slice(m[0].length);
    }
  }
  for (const w of rest.split(" ")) if (w) tokens.push({ text: w, bold: false });
  return tokens;
}

// ── Builder ──────────────────────────────────────────────────────────────────
class AgreementPdfBuilder {
  doc!: PDFDocument;
  font!: PDFFont;
  bold!: PDFFont;
  italic!: PDFFont;
  logo!: PDFImage;
  page!: PDFPage;
  y = BODY_TOP;
  pages: { page: PDFPage; role: PageRole }[] = [];
  private sigCache = new Map<string, PDFImage>();

  constructor(private input: AgreementPdfInput) {}

  async init() {
    this.doc = await PDFDocument.create();
    this.doc.setTitle("Vehicle Rental Agreement - Next Gear Auto LLC");
    this.doc.setAuthor("Next Gear Auto LLC");
    this.doc.setSubject(`Agreement version ${AGREEMENT_VERSION}`);
    this.font = await this.doc.embedFont(StandardFonts.Helvetica);
    this.bold = await this.doc.embedFont(StandardFonts.HelveticaBold);
    this.italic = await this.doc.embedFont(StandardFonts.HelveticaOblique);
    const logoBytes = await fs.readFile(path.join(process.cwd(), "public", "images", "logo.png"));
    this.logo = await this.doc.embedPng(logoBytes);
  }

  // ---- pages -----------------------------------------------------------------
  newPage(role: PageRole) {
    this.page = this.doc.addPage([PAGE_W, PAGE_H]);
    this.pages.push({ page: this.page, role });
    this.y = BODY_TOP;
    this.drawHeader();
  }

  private drawHeader() {
    const p = this.page;
    const logoH = 46;
    const logoW = (this.logo.width / this.logo.height) * logoH;
    p.drawImage(this.logo, { x: MARGIN, y: PAGE_H - 34 - logoH, width: logoW, height: logoH });

    const right = (text: string, y: number, size: number, font: PDFFont, color: RGB) => {
      const t = pdfSafe(text);
      p.drawText(t, { x: PAGE_W - MARGIN - font.widthOfTextAtSize(t, size), y, size, font, color });
    };
    right("VEHICLE RENTAL AGREEMENT", PAGE_H - 52, 13, this.bold, NAVY);
    right("Next Gear Auto LLC", PAGE_H - 64, 8, this.bold, INK);
    right(
      `${CONTACT_INFO.address}, ${CONTACT_INFO.city}, ${CONTACT_INFO.state} ${CONTACT_INFO.zip}`,
      PAGE_H - 74,
      7.5,
      this.font,
      MUTED,
    );
    right(
      `Phone: ${AGREEMENT_CONTACT_PHONE}   |   Email: ${AGREEMENT_CONTACT_EMAIL}`,
      PAGE_H - 83.5,
      7.5,
      this.font,
      MUTED,
    );
    p.drawRectangle({ x: MARGIN, y: PAGE_H - 90, width: CONTENT_W, height: 1.6, color: NAVY });
  }

  ensureSpace(height: number) {
    if (this.y - height < BODY_BOTTOM) this.newPage("terms");
  }

  gap(h: number) {
    this.y -= h;
  }

  // ---- text ------------------------------------------------------------------
  private wrapTokens(tokens: Token[], size: number, maxWidth: number): Token[][] {
    const lines: Token[][] = [];
    let line: Token[] = [];
    let width = 0;
    const space = this.font.widthOfTextAtSize(" ", size);
    for (const tok of tokens) {
      const f = tok.bold ? this.bold : this.font;
      const w = f.widthOfTextAtSize(tok.text, size);
      const add = line.length ? space + w : w;
      if (line.length && width + add > maxWidth) {
        lines.push(line);
        line = [tok];
        width = w;
      } else {
        line.push(tok);
        width += add;
      }
    }
    if (line.length) lines.push(line);
    return lines;
  }

  private drawTokenLine(line: Token[], x: number, y: number, size: number, color: RGB) {
    let cx = x;
    const space = this.font.widthOfTextAtSize(" ", size);
    line.forEach((tok, i) => {
      const f = tok.bold ? this.bold : this.font;
      this.page.drawText(tok.text, { x: cx, y, size, font: f, color });
      cx += f.widthOfTextAtSize(tok.text, size) + (i < line.length - 1 ? space : 0);
    });
  }

  paragraph(
    text: string,
    opts: { x?: number; width?: number; size?: number; color?: RGB; leadIn?: boolean; gap?: number } = {},
  ) {
    const x = opts.x ?? MARGIN;
    const width = opts.width ?? CONTENT_W;
    const size = opts.size ?? BODY_SIZE;
    const lines = this.wrapTokens(toTokens(text, opts.leadIn ?? false), size, width);
    lines.forEach((line, i) => {
      // Never leave a single orphan line at the foot of a page.
      this.ensureSpace(i === 0 && lines.length > 1 ? LINE_H * 2 : LINE_H);
      this.drawTokenLine(line, x, this.y - size, size, opts.color ?? INK);
      this.y -= LINE_H;
    });
    this.y -= opts.gap ?? PARA_GAP;
  }

  bullets(items: string[]) {
    for (const item of items) {
      const lines = this.wrapTokens(toTokens(item, false), BODY_SIZE, CONTENT_W - 14);
      lines.forEach((line, i) => {
        this.ensureSpace(LINE_H);
        if (i === 0) {
          this.page.drawCircle({ x: MARGIN + 5, y: this.y - BODY_SIZE + 2.6, size: 1.5, color: NAVY });
        }
        this.drawTokenLine(line, MARGIN + 14, this.y - BODY_SIZE, BODY_SIZE, INK);
        this.y -= LINE_H;
      });
    }
    this.y -= PARA_GAP;
  }

  callout(text: string) {
    const lines = this.wrapTokens(
      pdfSafe(text)
        .split(" ")
        .map((t) => ({ text: t, bold: true })),
      BODY_SIZE,
      CONTENT_W - 22,
    );
    const h = lines.length * LINE_H + 10;
    this.ensureSpace(h + 4);
    this.page.drawRectangle({ x: MARGIN, y: this.y - h, width: CONTENT_W, height: h, color: TINT });
    this.page.drawRectangle({ x: MARGIN, y: this.y - h, width: 3, height: h, color: NAVY });
    lines.forEach((line, i) => {
      this.drawTokenLine(line, MARGIN + 12, this.y - 5 - BODY_SIZE - i * LINE_H, BODY_SIZE, NAVY);
    });
    this.y -= h + PARA_GAP + 2;
  }

  sectionHeading(title: string) {
    this.ensureSpace(14 + 8 + LINE_H * 3);
    this.page.drawText(pdfSafe(title.toUpperCase()), {
      x: MARGIN,
      y: this.y - 10,
      size: 10,
      font: this.bold,
      color: NAVY,
    });
    this.y -= 15;
    this.page.drawLine({
      start: { x: MARGIN, y: this.y },
      end: { x: MARGIN + CONTENT_W, y: this.y },
      thickness: 0.6,
      color: RULE,
    });
    this.y -= 7;
  }

  termsSection(number: number, section: AgreementTermsSection & { emphasis?: string }) {
    this.sectionHeading(`${number}. ${stripNumber(section.title).replace(/\s*\(SUPPLEMENTAL\)/i, "")}`);
    for (const p of section.paragraphs) this.paragraph(p, { leadIn: true });
    if (section.bullets?.length) this.bullets(section.bullets);
    if (section.emphasis) this.callout(section.emphasis);
    this.y -= SECTION_GAP - PARA_GAP;
  }

  // ---- table cells ------------------------------------------------------------
  cell(
    x: number,
    top: number,
    w: number,
    h: number,
    label: string,
    value: string,
    valueSize = 9.5,
  ) {
    const p = this.page;
    p.drawRectangle({
      x,
      y: top - h,
      width: w,
      height: h,
      color: CELL_FILL,
      borderColor: CELL_BORDER,
      borderWidth: 0.6,
    });
    p.drawText(pdfSafe(label.toUpperCase()), {
      x: x + 6,
      y: top - 9.5,
      size: 6.3,
      font: this.bold,
      color: MUTED,
    });
    const v = pdfSafe(value);
    if (!v) return;
    let size = valueSize;
    while (size > 6.5 && this.font.widthOfTextAtSize(v, size) > w - 12) size -= 0.25;
    p.drawText(v, { x: x + 6, y: top - 9.5 - 3 - size, size, font: this.font, color: INK });
  }

  /** A row of equal-height cells whose widths are fractions of the content width. */
  row(cells: { label: string; value?: string; frac: number }[], height = 30) {
    this.ensureSpace(height + 5);
    const gapX = 6;
    const usable = CONTENT_W - gapX * (cells.length - 1);
    let x = MARGIN;
    for (const c of cells) {
      const w = usable * c.frac;
      this.cell(x, this.y, w, height, c.label, c.value ?? "");
      x += w + gapX;
    }
    this.y -= height + 5;
  }

  private checkbox(x: number, baseY: number, checked: boolean) {
    const s = 8;
    this.page.drawRectangle({
      x,
      y: baseY - 1.5,
      width: s,
      height: s,
      color: rgb(1, 1, 1),
      borderColor: INK,
      borderWidth: 0.8,
    });
    if (checked) {
      this.page.drawLine({ start: { x: x + 1.6, y: baseY + 3 }, end: { x: x + 3.4, y: baseY + 0.8 }, thickness: 1.2, color: NAVY });
      this.page.drawLine({ start: { x: x + 3.4, y: baseY + 0.8 }, end: { x: x + 6.6, y: baseY + 5.6 }, thickness: 1.2, color: NAVY });
    }
  }

  /** One full-width cell with a label and a line of checkbox options. */
  optionsRow(label: string, options: { text: string; checked: boolean }[], extra?: string) {
    const h = 30;
    this.ensureSpace(h + 5);
    this.cell(MARGIN, this.y, CONTENT_W, h, label, "");
    let x = MARGIN + 6;
    const baseY = this.y - 24;
    for (const opt of options) {
      this.checkbox(x, baseY, opt.checked);
      const t = pdfSafe(opt.text);
      this.page.drawText(t, { x: x + 12, y: baseY, size: 9, font: this.font, color: INK });
      x += 12 + this.font.widthOfTextAtSize(t, 9) + 18;
    }
    if (extra) {
      this.page.drawText(pdfSafe(extra), { x, y: baseY, size: 9, font: this.bold, color: INK });
    }
    this.y -= h + 5;
  }

  // ---- signatures -------------------------------------------------------------
  private async sigImage(id: AgreementSignatureId): Promise<PDFImage | null> {
    const raw = this.input.signatures?.[id];
    if (!raw) return null;
    const cached = this.sigCache.get(raw);
    if (cached) return cached;
    try {
      const base64 = raw.replace(/^data:image\/png;base64,/, "");
      const img = await this.doc.embedPng(Buffer.from(base64, "base64"));
      this.sigCache.set(raw, img);
      return img;
    } catch (err) {
      logger.error(`Failed to embed signature ${id}:`, err);
      return null;
    }
  }

  async drawSignature(id: AgreementSignatureId, page: PDFPage, x: number, y: number, w: number, h: number) {
    const img = await this.sigImage(id);
    if (!img) return;
    const dims = img.scale(1);
    const scale = Math.min(w / dims.width, h / dims.height);
    const dw = dims.width * scale;
    const dh = dims.height * scale;
    page.drawImage(img, { x: x + (w - dw) / 2, y: y + (h - dh) / 2, width: dw, height: dh });
  }

  hasSignature(id: AgreementSignatureId): boolean {
    return Boolean(this.input.signatures?.[id]);
  }
}

// ── Content ──────────────────────────────────────────────────────────────────
function section(prefixes: string[], list: AgreementTermsSection[]): AgreementTermsSection | undefined {
  return list.find((s) => prefixes.some((p) => stripNumber(s.title).toUpperCase().startsWith(p)));
}

function signingParts(signedAtIso: string | null | undefined) {
  if (!signedAtIso) return { date: "", time: "" };
  const d = new Date(signedAtIso);
  return {
    date: d.toLocaleDateString("en-US", {
      timeZone: "America/New_York",
      month: "2-digit",
      day: "2-digit",
      year: "numeric",
    }),
    time: d.toLocaleTimeString("en-US", {
      timeZone: "America/New_York",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    }),
  };
}

export async function buildAgreementPdf(input: AgreementPdfInput): Promise<Uint8Array> {
  const { booking, vehicle, renter, context } = input;
  const b = new AgreementPdfBuilder(input);
  await b.init();
  b.newPage("first");

  const recurringMeta = parseRecurringBookingMeta(booking.admin_notes);
  const isWeekly = recurringMeta.isRecurringLongTerm && !!recurringMeta.weeklyDueDay;
  const returnDate =
    isWeekly && booking.return_date
      ? getDisplayReturnDate(booking.return_date, booking.admin_notes)
      : booking.return_date;
  const supplement = getAgreementSupplementSections(booking.admin_notes);
  const { date: signDate, time: signTime } = signingParts(input.signedAtIso);
  const renterName = booking.customer_name || "";

  // Reference strip
  const ref = booking.id ? String(booking.id).slice(0, 8).toUpperCase() : "";
  b.paragraph(
    `This Vehicle Rental Agreement is between Next Gear Auto LLC ("Lessor") and the Renter named below.` +
      (ref ? `  Agreement reference: ${ref}.` : "") +
      `  Version ${AGREEMENT_VERSION}.`,
    { size: 8, color: MUTED, gap: 8 },
  );

  // ── Vehicle information ──
  b.sectionHeading("Vehicle Information");
  b.row([
    { label: "Make & model", value: `${vehicle?.make || ""} ${vehicle?.model || ""}`.trim(), frac: 0.5 },
    { label: "Year", value: vehicle?.year ? String(vehicle.year) : "", frac: 0.2 },
    { label: "Color", value: vehicle?.color || "", frac: 0.3 },
  ]);
  b.row([
    { label: "License plate", value: vehicle?.license_plate || "", frac: 0.3 },
    { label: "VIN", value: vehicle?.vin || "", frac: 0.45 },
    { label: "Mileage at pickup", value: vehicle?.mileage ? `${Number(vehicle.mileage).toLocaleString()} mi` : "", frac: 0.25 },
  ]);
  b.optionsRow("Condition at pickup", [
    { text: "Excellent", checked: false },
    { text: "Good", checked: true },
    { text: "Fair", checked: false },
    { text: "Poor", checked: false },
  ]);
  b.row(
    [
      {
        label: "Pre-existing damage notes",
        value: "Recorded in the pickup inspection (see Vehicle Condition & Inspection Records).",
        frac: 1,
      },
    ],
    30,
  );
  b.gap(SECTION_GAP - 5);

  // ── 1. Parties & identification ──
  b.ensureSpace(255);
  b.sectionHeading("1. Parties & Identification");
  b.paragraph(
    'This Vehicle Rental Agreement ("Agreement") is entered into between Next Gear Auto LLC ("Lessor") and the individual listed as Renter below. Renter affirms that all provided information is accurate and complete. Any misrepresentation voids all liability protections.',
  );
  b.row([
    { label: "Full name", value: renterName, frac: 0.55 },
    { label: "Date of birth", value: formatDob(renter?.dob), frac: 0.45 },
  ]);
  b.row([
    { label: "Address", value: renter?.addressLine || "", frac: 0.55 },
    { label: "City / State / Zip", value: renter?.cityStateZip || "", frac: 0.45 },
  ]);
  b.row([
    { label: "Phone", value: booking.customer_phone || "", frac: 0.34 },
    { label: "Email", value: booking.customer_email || "", frac: 0.66 },
  ]);
  b.row([
    { label: "Driver's license number", value: formatLicense(renter), frac: 0.55 },
    { label: "License expires", value: formatDob(renter?.licenseExpires), frac: 0.45 },
  ]);
  b.gap(SECTION_GAP - 5);

  // ── 2. Rental period & late fees ──
  b.ensureSpace(165);
  b.sectionHeading(isWeekly ? "2. Weekly Rental Term, Renewal & Late Fees" : "2. Rental Period & Late Fees");
  b.row([
    { label: "Pickup date", value: pdfDate(booking.pickup_date), frac: 0.3 },
    { label: "Pickup time", value: fmtTime(booking.pickup_time || null), frac: 0.2 },
    { label: "Pickup location", value: context.pickupLocationName || "", frac: 0.5 },
  ]);
  b.row([
    { label: "Expected return date", value: pdfDate(returnDate), frac: 0.3 },
    { label: "Return time", value: fmtTime(booking.return_time || null), frac: 0.2 },
    { label: "Return location", value: context.returnLocationName || "", frac: 0.5 },
  ]);
  if (isWeekly) {
    b.paragraph(
      "This agreement is structured for recurring 7-day terms. Each weekly rebooking uses the same rate unless updated in writing before renewal. Weekly payment is due at the start of each new 7-day term" +
        (recurringMeta.weeklyDueDay ? `, every ${recurringMeta.weeklyDueDay}.` : "."),
    );
  }
  b.paragraph(
    "Late fee policy: $75 per hour. Any time after 59 minutes late will be charged as a full additional rental day.",
    { leadIn: false },
  );
  b.gap(SECTION_GAP - PARA_GAP);

  // ── 3. Authorized drivers ──
  b.ensureSpace(128);
  b.sectionHeading("3. Authorized Drivers");
  b.row([
    { label: "Primary renter (age 18+)", value: renterName, frac: 0.5 },
    { label: "Driver's license", value: formatLicense(renter), frac: 0.5 },
  ]);
  b.row([
    { label: "Additional driver (age 18+)", value: "", frac: 0.5 },
    { label: "Driver's license", value: "", frac: 0.5 },
  ]);
  b.paragraph(
    "Only these two drivers are authorized to operate this vehicle. Any operation by an unauthorized driver voids insurance protections, triggers $750 in liquidated damages, makes Renter fully liable for all damage and third-party claims, and authorizes immediate termination and lawful vehicle recovery.",
  );
  b.gap(SECTION_GAP - PARA_GAP);

  // ── 4. Rates & payment ──
  const total = booking.total_price ?? 0;
  const deposit = resolveAgreementDeposit(booking.deposit, total);
  const balance = resolveAgreementBalanceDue(total, booking.deposit);
  const pickup = booking.pickup_date ? new Date(`${booking.pickup_date}T00:00:00`) : new Date();
  const ret = booking.return_date ? new Date(`${booking.return_date}T00:00:00`) : new Date();
  const totalDays = isWeekly
    ? 7
    : Math.max(1, Math.ceil((ret.getTime() - pickup.getTime()) / 86_400_000 || 1));
  const pm = (context.paymentMethod || "stripe").toLowerCase();
  const pmOther = ["venmo", "check", "other"].includes(pm);
  b.ensureSpace(190);
  b.sectionHeading(isWeekly ? "4. Weekly Recurring Rate, Payment Terms & Authorized Charges" : "4. Rental Rates, Payment Terms & Authorized Charges");
  b.row([
    { label: isWeekly ? "Weekly recurring price" : "Total rental price", value: `$${total.toFixed(2)}${isWeekly ? " / week" : ""}`, frac: 0.28 },
    { label: isWeekly ? "Weekly term (days)" : "Total days", value: String(totalDays), frac: 0.22 },
    { label: "Security deposit", value: `$${deposit.toFixed(2)}`, frac: 0.25 },
    { label: "Balance due at pickup", value: `$${balance.toFixed(2)}`, frac: 0.25 },
  ]);
  b.optionsRow(
    "Payment method",
    [
      { text: "Cash", checked: pm === "cash" },
      { text: "Zelle", checked: pm === "zelle" },
      { text: "Credit / Debit", checked: !["cash", "zelle"].includes(pm) && !pmOther },
      { text: "Other", checked: pmOther },
    ],
    pmOther ? paymentMethodLabel(context.paymentMethod) : undefined,
  );
  b.paragraph("Included: 200 miles per day. Extra miles: $0.39 per mile over 200 per day.");
  if (context.extrasSummary) b.paragraph(`Extras: ${context.extrasSummary}`);
  if (context.promoCode) {
    b.paragraph(
      `Promo: ${context.promoCode}${context.discountAmount ? ` (-$${context.discountAmount.toFixed(2)})` : ""}`,
    );
  }
  for (const p of RENTAL_AGREEMENT_SECTION_4A_AUTHORIZED.paragraphs) b.paragraph(p);
  b.gap(SECTION_GAP - PARA_GAP);

  // ── 5 onward: terms ──
  const inline = RENTAL_AGREEMENT_INLINE_SECTIONS;
  let n = 5;
  const put = (s: (AgreementTermsSection & { emphasis?: string }) | undefined) => {
    if (s) b.termsSection(n++, s);
  };
  put(section(["INSURANCE REQUIREMENTS"], inline));
  put(section(["LIABILITY & DAMAGE"], inline));
  put(section(["INDEMNIFICATION"], inline));
  put(section(["PROHIBITED USES"], inline));

  // GPS disclosure with the consent line and its own signature
  const gps = section(["GPS / VEHICLE TRACKING"], inline) as (AgreementTermsSection & { emphasis?: string }) | undefined;
  if (gps) {
    b.sectionHeading(`${n++}. ${stripNumber(gps.title)}`);
    for (const p of gps.paragraphs) b.paragraph(p);
    const h = 52;
    b.ensureSpace(h + 8);
    const top = b.y;
    const page = b.page;
    page.drawRectangle({ x: MARGIN, y: top - h, width: CONTENT_W, height: h, color: TINT });
    page.drawRectangle({ x: MARGIN, y: top - h, width: 3, height: h, color: NAVY });
    const consentOn = b.hasSignature("t42");
    page.drawRectangle({
      x: MARGIN + 12,
      y: top - 25,
      width: 8,
      height: 8,
      color: rgb(1, 1, 1),
      borderColor: INK,
      borderWidth: 0.8,
    });
    if (consentOn) {
      page.drawLine({ start: { x: MARGIN + 13.6, y: top - 20.5 }, end: { x: MARGIN + 15.4, y: top - 23 }, thickness: 1.2, color: NAVY });
      page.drawLine({ start: { x: MARGIN + 15.4, y: top - 23 }, end: { x: MARGIN + 18.6, y: top - 17.8 }, thickness: 1.2, color: NAVY });
    }
    page.drawText(pdfSafe(gps.emphasis || "I acknowledge and consent to GPS/vehicle tracking during the rental period."), {
      x: MARGIN + 26,
      y: top - 23,
      size: 8.6,
      font: b.bold,
      color: NAVY,
    });
    page.drawText("RENTER INITIALS / SIGNATURE", { x: MARGIN + 26, y: top - 46, size: 5.8, font: b.bold, color: MUTED });
    page.drawLine({
      start: { x: MARGIN + 130, y: top - 46 },
      end: { x: MARGIN + 310, y: top - 46 },
      thickness: 0.5,
      color: CELL_BORDER,
    });
    await b.drawSignature("t42", page, MARGIN + 134, top - 45, 100, 18);
    b.y -= h + PARA_GAP + 2;
    b.gap(SECTION_GAP - PARA_GAP);
  }

  put(section(["UNPAID BALANCES"], supplement));
  put(section(["SECURITY & USE"], RENTAL_AGREEMENT_SUPPLEMENT_SECTIONS));
  put(section(["PETS"], inline));
  put(section(["VEHICLE RETURN"], inline));
  put(section(["ACCIDENT & THEFT"], inline));
  put(section(["FRAUD"], inline));
  for (const s of RENTAL_AGREEMENT_ADDITIONAL_SECTIONS) put(s);
  for (const s of supplement.filter((x) => /^(WEEK-TO-WEEK|WEEKLY DUE DAY)/.test(x.title))) put(s);
  put(section(["GOVERNING LAW"], inline));

  // ── Signature page (always last page of the agreement) ──
  b.newPage("signature");
  b.sectionHeading("Signatures & Acknowledgment");
  b.paragraph(
    "By signing below, Renter acknowledges reading, understanding, and agreeing to all terms of this Agreement, including the insurance requirements (Renter must carry their own policy, or pay the $" +
      `${UNINSURED_DRIVER_FEE_USD} Uninsured Driver Fee and all damage out of pocket), damage and liability responsibility, GPS tracking, and indemnification.`,
  );
  b.paragraph(AGREEMENT_ESIGN_DISCLOSURE, { size: 8, color: MUTED, gap: 10 });

  const sigBlocks: {
    title: string;
    sigId: AgreementSignatureId;
    name: string;
    stamp: boolean;
  }[] = [
    { title: "Renter", sigId: "t47", name: renterName, stamp: b.hasSignature("t47") },
    { title: "Additional driver (if any)", sigId: "t51", name: "", stamp: b.hasSignature("t51") },
    { title: "Next Gear Auto representative", sigId: "t55", name: "Next Gear Auto LLC", stamp: b.hasSignature("t55") },
  ];
  for (const blk of sigBlocks) {
    const h = 58;
    b.ensureSpace(h + 8);
    const top = b.y;
    const gapX = 6;
    const usable = CONTENT_W - gapX * 3;
    const widths = [usable * 0.44, usable * 0.28, usable * 0.14, usable * 0.14];
    let x = MARGIN;
    const labels = [`${blk.title} signature`, "Printed name", "Date", "Time"];
    const values = ["", blk.name, blk.stamp ? signDate : "", blk.stamp ? signTime : ""];
    widths.forEach((w, i) => {
      b.cell(x, top, w, h, labels[i], values[i]);
      x += w + gapX;
    });
    // Signature baseline inside the first cell.
    b.page.drawLine({
      start: { x: MARGIN + 8, y: top - h + 10 },
      end: { x: MARGIN + widths[0] - 8, y: top - h + 10 },
      thickness: 0.6,
      color: MUTED,
    });
    await b.drawSignature(blk.sigId, b.page, MARGIN + 8, top - h + 11, widths[0] - 16, h - 24);
    b.y -= h + 8;
  }

  // ── Rental summary ──
  b.newPage("summary");
  b.sectionHeading("Rental Summary (Booking Details)");
  const vehicleName = vehicle ? getVehicleDisplayName(vehicle) : "";
  b.row([
    { label: "Vehicle", value: vehicleName, frac: 0.6 },
    { label: "Renter", value: renterName, frac: 0.4 },
  ]);
  b.row([
    {
      label: "Pickup",
      value: [pdfDate(booking.pickup_date), fmtTime(booking.pickup_time || null), context.pickupLocationName ? `@ ${context.pickupLocationName}` : ""]
        .filter(Boolean)
        .join(" "),
      frac: 0.5,
    },
    {
      label: "Return",
      value: [pdfDate(returnDate), fmtTime(booking.return_time || null), context.returnLocationName ? `@ ${context.returnLocationName}` : ""]
        .filter(Boolean)
        .join(" "),
      frac: 0.5,
    },
  ]);
  b.row([
    { label: "Total rental price", value: `$${total.toFixed(2)}`, frac: 0.25 },
    { label: "Security deposit", value: `$${deposit.toFixed(2)}`, frac: 0.25 },
    { label: "Balance due at pickup", value: `$${balance.toFixed(2)}`, frac: 0.25 },
    { label: "Payment method", value: paymentMethodLabel(context.paymentMethod), frac: 0.25 },
  ]);
  if (context.extrasSummary || context.promoCode) {
    b.row([
      { label: "Extras", value: context.extrasSummary || "None", frac: 0.6 },
      {
        label: "Promo code",
        value: context.promoCode
          ? `${context.promoCode}${context.discountAmount ? ` (-$${context.discountAmount.toFixed(2)})` : ""}`
          : "None",
        frac: 0.4,
      },
    ]);
  }
  b.gap(4);
  b.sectionHeading("Insurance Status");
  if (context.insuranceProofOnFile) {
    b.paragraph("Renter's own policy: proof of insurance is on file for this booking.");
  } else {
    b.paragraph(
      `No proof of insurance is on file. Unless proof is provided before or at pickup, the $${UNINSURED_DRIVER_FEE_USD} Uninsured Driver Fee applies and Renter pays out of pocket for any and all damage.`,
    );
  }
  b.gap(4);
  b.sectionHeading("Electronic Signing Record");
  b.paragraph(
    input.signedAtIso
      ? `Signed electronically on ${signDate} at ${signTime} (Eastern Time). ${AGREEMENT_ESIGN_DISCLOSURE}`
      : "This copy has not been signed.",
  );
  if (input.reissuedAtIso) {
    const re = signingParts(input.reissuedAtIso);
    b.paragraph(
      `Re-issued copy: this document was re-issued on ${re.date} in the current agreement format using the signature originally provided on ${signDate}. The original signed copy is retained by Lessor and is available on request.`,
    );
  }
  b.paragraph(`Agreement version: ${AGREEMENT_VERSION}`, { size: 8, color: MUTED });

  // ── Footers: page numbers and renter initials ──
  const total_ = b.pages.length;
  for (let i = 0; i < b.pages.length; i++) {
    const { page, role } = b.pages[i];
    page.drawLine({
      start: { x: MARGIN, y: 62 },
      end: { x: PAGE_W - MARGIN, y: 62 },
      thickness: 0.6,
      color: RULE,
    });
    page.drawText(
      pdfSafe(`Next Gear Auto LLC  |  ${AGREEMENT_CONTACT_PHONE}  |  ${AGREEMENT_CONTACT_EMAIL}`),
      { x: MARGIN, y: 44, size: 7, font: b.font, color: MUTED },
    );
    const pageLabel = `Page ${i + 1} of ${total_}`;
    page.drawText(pageLabel, { x: MARGIN, y: 33, size: 7, font: b.bold, color: MUTED });

    if (role !== "summary") {
      const boxW = 92;
      const boxH = 30;
      const bx = PAGE_W - MARGIN - boxW;
      page.drawText("RENTER INITIALS", { x: bx - 66, y: 34, size: 6.3, font: b.bold, color: MUTED });
      page.drawRectangle({
        x: bx,
        y: 24,
        width: boxW,
        height: boxH,
        color: CELL_FILL,
        borderColor: CELL_BORDER,
        borderWidth: 0.6,
      });
      const sigId: AgreementSignatureId = role === "first" ? "t35" : role === "signature" ? "t57" : "t43";
      await b.drawSignature(sigId, page, bx + 4, 26, boxW - 8, boxH - 4);
    }
  }

  return b.doc.save();
}
