import fs from "fs/promises";
import path from "path";
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFImage, type PDFPage } from "pdf-lib";
import { CONTACT_INFO } from "@/lib/constants";
import { pdfSafe } from "@/lib/agreement/agreement-pdf";
import { notarizationLabel } from "./municipal-guidance";
import type { ChecklistItem, PacketData, PacketFile } from "./packet-data";

const W = 612, H = 792, M = 54, TOP = H - 92, BOTTOM = 60;
const NAVY = rgb(0, 31 / 255, 150 / 255);
const INK = rgb(0.13, 0.13, 0.13);
const MUTED = rgb(0.4, 0.4, 0.4);
const RULE = rgb(0.8, 0.8, 0.84);
const GREEN = rgb(0.1, 0.5, 0.25);
const RED = rgb(0.75, 0.15, 0.15);
const AMBER = rgb(0.7, 0.45, 0.05);

class Packet {
  doc!: PDFDocument;
  font!: PDFFont;
  bold!: PDFFont;
  logo!: PDFImage;
  page!: PDFPage;
  y = 0;
  generated = new Set<PDFPage>();
  sections: { label: string; page: number }[] = [];

  constructor(private d: PacketData) {}

  async init() {
    this.doc = await PDFDocument.create();
    this.font = await this.doc.embedFont(StandardFonts.Helvetica);
    this.bold = await this.doc.embedFont(StandardFonts.HelveticaBold);
    const logoBytes = await fs.readFile(path.join(process.cwd(), "public/images/logo.png"));
    this.logo = await this.doc.embedPng(new Uint8Array(logoBytes));
  }

  newPage(): PDFPage {
    this.page = this.doc.addPage([W, H]);
    this.generated.add(this.page);
    const lw = 110;
    const lh = (this.logo.height / this.logo.width) * lw;
    this.page.drawImage(this.logo, { x: M, y: H - 30 - lh, width: lw, height: lh });
    const r = `Dispute Evidence Packet | ${pdfSafe(this.d.ticketLabel)}`;
    this.page.drawText(r, { x: W - M - this.font.widthOfTextAtSize(r, 9), y: H - 44, size: 9, font: this.font, color: MUTED });
    this.page.drawLine({ start: { x: M, y: H - 38 - lh }, end: { x: W - M, y: H - 38 - lh }, thickness: 1.2, color: NAVY });
    this.y = TOP;
    return this.page;
  }

  section(label: string) {
    this.newPage();
    this.sections.push({ label, page: this.doc.getPageCount() });
    this.heading(label);
  }

  need(h: number) { if (this.y - h < BOTTOM) { this.newPage(); } }

  heading(text: string) {
    this.need(30);
    this.page.drawText(pdfSafe(text), { x: M, y: this.y - 14, size: 16, font: this.bold, color: NAVY });
    this.y -= 30;
  }
  sub(text: string) {
    this.need(24);
    this.page.drawText(pdfSafe(text), { x: M, y: this.y - 10, size: 11, font: this.bold, color: INK });
    this.y -= 20;
  }

  wrap(text: string, size: number, width: number, font = this.font): string[] {
    const out: string[] = [];
    for (const para of pdfSafe(text).split("\n")) {
      let line = "";
      for (const word of para.split(/\s+/)) {
        const t = line ? `${line} ${word}` : word;
        if (font.widthOfTextAtSize(t, size) > width && line) { out.push(line); line = word; } else line = t;
      }
      out.push(line);
    }
    return out;
  }

  para(text: string, size = 10, color = INK, indent = 0) {
    for (const ln of this.wrap(text, size, W - 2 * M - indent)) {
      this.need(size + 4);
      this.page.drawText(ln, { x: M + indent, y: this.y - size, size, font: this.font, color });
      this.y -= size + 4;
    }
    this.y -= 4;
  }

  kv(label: string, value: string | null | undefined, missingNote = "NOT ON FILE") {
    const v = (value ?? "").toString().trim();
    const lines = this.wrap(v || missingNote, 10, W - 2 * M - 160);
    this.need(lines.length * 14 + 4);
    this.page.drawText(pdfSafe(label), { x: M, y: this.y - 10, size: 9, font: this.bold, color: MUTED });
    lines.forEach((ln, i) => {
      this.page.drawText(ln, { x: M + 160, y: this.y - 10 - i * 14, size: 10, font: v ? this.font : this.bold, color: v ? INK : RED });
    });
    this.y -= lines.length * 14 + 4;
    this.page.drawLine({ start: { x: M, y: this.y + 1 }, end: { x: W - M, y: this.y + 1 }, thickness: 0.4, color: RULE });
  }

  async image(file: PacketFile, caption: string): Promise<boolean> {
    if (!file.bytes || file.bytes.length === 0) return false;
    let img: PDFImage;
    try {
      img = file.contentType === "image/png" ? await this.doc.embedPng(file.bytes) : await this.doc.embedJpg(file.bytes);
    } catch { return false; }
    this.newPage();
    this.page.drawText(pdfSafe(caption), { x: M, y: this.y - 12, size: 11, font: this.bold, color: INK });
    const maxW = W - 2 * M, maxH = this.y - 30 - BOTTOM;
    const s = Math.min(maxW / img.width, maxH / img.height, 1.5);
    const w = img.width * s, h = img.height * s;
    this.page.drawImage(img, { x: M + (maxW - w) / 2, y: this.y - 30 - h, width: w, height: h });
    return true;
  }

  /** Copies the pages of an existing PDF as-is (no stamping or modification). */
  async mergePdf(bytes: Uint8Array): Promise<number> {
    const src = await PDFDocument.load(bytes, { ignoreEncryption: true });
    const pages = await this.doc.copyPages(src, src.getPageIndices());
    pages.forEach((p) => this.doc.addPage(p));
    return pages.length;
  }

  /** Adds each file; returns names that could not be embedded. */
  async addFiles(files: PacketFile[], title: string): Promise<string[]> {
    const failed: string[] = [];
    for (const f of files) {
      let ok = false;
      if (f.bytes && f.bytes.length) {
        try {
          if (f.contentType === "application/pdf") {
            this.newPage();
            this.sub(`${title}: ${f.fileName}`);
            this.para("The original PDF follows on the next page(s), unmodified.", 9, MUTED);
            ok = (await this.mergePdf(f.bytes)) > 0;
          } else ok = await this.image(f, `${title}: ${f.fileName}`);
        } catch { ok = false; }
      }
      if (!ok) failed.push(f.fileName);
    }
    return failed;
  }

  statusColor(s: ChecklistItem["status"]) { return s === "included" ? GREEN : s === "manual" ? AMBER : RED; }
  statusText(s: ChecklistItem["status"]) { return s === "included" ? "INCLUDED" : s === "manual" ? "MANUAL UPLOAD" : "MISSING"; }

  checklist(items: ChecklistItem[]) {
    for (const it of items) {
      const note = it.status === "included" ? "" : it.note || "";
      const lines = this.wrap(`${it.label}${note ? ` - ${note}` : ""}`, 9.5, W - 2 * M - 110);
      this.need(lines.length * 13 + 6);
      this.page.drawText(this.statusText(it.status), { x: M, y: this.y - 10, size: 8.5, font: this.bold, color: this.statusColor(it.status) });
      lines.forEach((ln, i) => this.page.drawText(ln, { x: M + 100, y: this.y - 10 - i * 13, size: 9.5, font: this.font, color: INK }));
      this.y -= lines.length * 13 + 6;
    }
  }

  fmtDate(v: unknown) { return v ? String(v).slice(0, 10) : ""; }
}

export async function buildDisputePacketPdf(d: PacketData, generatedAt = new Date()): Promise<Uint8Array> {
  const p = new Packet(d);
  await p.init();
  const t = d.ticket, b = d.booking, c = d.customer, id = d.identity, v = d.vehicle;
  const renterName = b?.customer_name || c?.name || "";

  // A. Cover (page 1; contents table drawn after sections are placed)
  p.newPage();
  p.page.drawText("Ticket Dispute Evidence Packet", { x: M, y: p.y - 18, size: 22, font: p.bold, color: NAVY });
  p.y -= 38;
  p.para(`${CONTACT_INFO.address}, ${CONTACT_INFO.city}, ${CONTACT_INFO.state} ${CONTACT_INFO.zip}   |   ${CONTACT_INFO.phone}   |   ${CONTACT_INFO.email}`, 9, MUTED);
  p.kv("Business", "Next Gear Auto LLC");
  p.kv("Ticket / citation no.", d.ticketLabel);
  p.kv("Issuing municipality", t.municipality);
  p.kv("Court / authority", d.municipal?.court?.name || "", "NOT ON FILE - confirm with the clerk");
  p.kv("Violation type", t.ticket_type === "traffic" ? "Traffic / moving violation" : t.ticket_type === "parking" ? "Parking violation" : t.ticket_type);
  p.kv("Violation date", p.fmtDate(t.violation_date));
  p.kv("Vehicle", [v?.year, v?.make, v?.model].filter(Boolean).join(" "));
  p.kv("License plate", t.license_plate || v?.license_plate);
  p.kv("VIN", v?.vin);
  p.kv("Renter (legal name)", renterName);
  p.kv("Rental booking reference", b?.id || t.booking_id);
  p.kv("Packet generated", generatedAt.toISOString().replace("T", " ").slice(0, 19) + " UTC");
  const contentsY = p.y;
  p.y -= 8;

  // B. Renter identification
  p.section("B. Renter Identification");
  p.kv("Legal name", renterName);
  p.kv("Address", [id?.addressLine, id?.cityStateZip].filter(Boolean).join(", "));
  p.kv("Date of birth", id?.dob);
  p.kv("Driver's license no.", id?.licenseNumber);
  p.kv("License state", id?.licenseState);
  p.kv("License expires", id?.licenseExpires);
  p.kv("Phone", c?.phone || b?.customer_phone);
  p.kv("Email", c?.email || b?.customer_email);
  const idFail: string[] = [];
  for (const f of [d.idFront, d.idBack]) if (f && !(await p.image(f, f.label))) idFail.push(f.label);

  // C. Signed agreement (original, unmodified pages)
  p.section("C. Signed Rental Agreement");
  if (d.agreement.bytes) {
    p.para("The signed rental agreement follows exactly as stored. Its pages have not been recreated, edited or stamped.", 10, MUTED);
    await p.mergePdf(d.agreement.bytes);
  } else p.para("MISSING: no signed rental agreement PDF was found for this booking.", 11, RED);

  // D. Ticket documents
  p.section("D. Original Ticket / Citation Documentation");
  if (!d.citationFiles.length) p.para("MISSING: no citation scan or photo has been uploaded for this ticket.", 11, RED);
  const dFail = await p.addFiles(d.citationFiles, "Citation");

  // E. Registration
  p.section("E. Vehicle Registration");
  if (!d.registrationFiles.length) p.para("MISSING: no registration has been uploaded for this vehicle.", 11, RED);
  const eFail = await p.addFiles(d.registrationFiles, "Registration");

  // F. Rental verification
  p.section("F. Rental Verification");
  p.kv("Booking reference", b?.id);
  p.kv("Booking status", b?.status);
  p.kv("Pickup", [p.fmtDate(b?.pickup_date), b?.pickup_time].filter(Boolean).join(" "));
  p.kv("Return", [p.fmtDate(b?.return_date), b?.return_time].filter(Boolean).join(" "));
  p.kv("Vehicle assigned", [v?.year, v?.make, v?.model, v?.license_plate].filter(Boolean).join(" "));
  p.kv("Agreement signed", b?.agreement_signed_at ? String(b.agreement_signed_at).replace("T", " ").slice(0, 19) + " UTC" : "");
  const vd = String(t.violation_date || "").slice(0, 10);
  if (vd && b?.pickup_date && b?.return_date) {
    const inside = vd >= String(b.pickup_date).slice(0, 10) && vd <= String(b.return_date).slice(0, 10);
    p.para(inside ? "The violation date falls within the rental period shown above." : "WARNING: the violation date is OUTSIDE the rental period shown above. Review before relying on this packet.", 10, inside ? GREEN : RED);
  }

  // G. Supporting evidence
  p.section("G. Supporting Evidence");
  let gFail: string[] = [];
  if (d.insurance) gFail = gFail.concat(await p.addFiles([d.insurance], "Insurance proof"));
  gFail = gFail.concat(await p.addFiles(d.supportingFiles, "Supporting"));
  if (!d.insurance && !d.supportingFiles.length) p.para("No supporting documents on file. Check-out and return photos are not stored by the system.", 10, MUTED);

  // H. Checklist
  p.section("H. Documentation Checklist");
  p.checklist(d.checklist);
  const failed = [...idFail, ...dFail, ...eFail, ...gFail];
  if (failed.length) {
    p.sub("Files that could not be embedded (add manually)");
    p.para(failed.join(", ") + ". Supported formats are PDF, JPG and PNG.", 9.5, RED);
  }
  const m = d.municipal;
  p.sub(`Municipality guidance: ${t.municipality || "unknown"}`);
  if (!m) p.para("No guidance is configured for this municipality. Contact its municipal court clerk to learn the lessor/rental procedure.", 10, AMBER);
  else {
    p.para(`${m.court.name || m.municipality}${m.court.address ? ", " + m.court.address : ""}${m.court.phone ? ", " + m.court.phone : ""}`, 10);
    p.para(notarizationLabel(m.notarization) + (m.deadlines ? `. Deadline: ${m.deadlines}` : ". Deadline: unverified."), 10);
    for (const f of m.forms) p.para(`Form to obtain: ${f.name}${f.url ? ` (${f.url})` : " (no official link found)"}`, 9.5, INK, 8);
    for (const i of m.instructions) p.para(`- ${i}`, 9.5, INK, 8);
    p.para(`Last verified ${m.last_verified}. ${m.verified_fields_note || ""}`, 8.5, MUTED);
  }
  if (t.ticket_type === "traffic") {
    p.para("MOVING VIOLATION: the notarized lessor statement in N.J.S.A. 39:4-139.5 applies to parking offenses only. For a moving violation the summons is addressed to the driver; ask the court clerk (or an attorney) how to document who was driving. Camera-based tickets follow the rules of the issuing state.", 9.5, AMBER);
  }
  p.sub("Signatures or notarization that may still be required");
  p.para("A notarized lessor statement (N.J.S.A. 39:4-139.5) may need to be signed before a notary and filed with the court clerk. Official municipal forms are not included in this packet and must be obtained from the court.", 9.5);
  p.sub("Important");
  p.para("This packet is a compilation of supporting evidence prepared from Next Gear Auto records. It is not an official municipal filing and does not guarantee that liability will be transferred to the renter. Nothing has been submitted to any court or agency.", 9.5, MUTED);

  // Contents table on cover
  p.page = p.doc.getPage(0);
  let y = contentsY - 6;
  p.page.drawText("Contents", { x: M, y: y - 12, size: 12, font: p.bold, color: NAVY });
  y -= 24;
  const rows = [{ label: "A. Cover Page", page: 1 }, ...p.sections];
  for (const r of rows) {
    p.page.drawText(pdfSafe(r.label), { x: M, y: y - 9, size: 9.5, font: p.font, color: INK });
    const pg = `p. ${r.page}`;
    p.page.drawText(pg, { x: W - M - p.font.widthOfTextAtSize(pg, 9.5), y: y - 9, size: 9.5, font: p.font, color: INK });
    y -= 13;
  }

  // Page numbers on generated pages only (merged originals stay untouched)
  const total = p.doc.getPageCount();
  p.doc.getPages().forEach((pg, i) => {
    if (!p.generated.has(pg)) return;
    const s1 = `Generated ${generatedAt.toISOString().slice(0, 16).replace("T", " ")} UTC | Evidence compilation, not an official municipal filing`;
    pg.drawText(s1, { x: M, y: 34, size: 7.5, font: p.font, color: MUTED });
    const s2 = `Page ${i + 1} of ${total}`;
    pg.drawText(s2, { x: W - M - p.font.widthOfTextAtSize(s2, 8), y: 34, size: 8, font: p.font, color: MUTED });
  });
  return p.doc.save();
}
