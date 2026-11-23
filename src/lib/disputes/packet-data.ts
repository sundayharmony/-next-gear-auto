import { getVehicleDisplayName } from "@/lib/types";
import { fetchRenterIdentity, type AgreementRenterIdentity } from "@/lib/agreement/signed-agreement";
import { findMunicipalRequirement, type MunicipalRequirement } from "./municipal-guidance";

export const EVIDENCE_BUCKET = "ticket-evidence";
const DOCS_BUCKET = "booking-documents";

export type ItemStatus = "included" | "missing" | "manual";
export interface ChecklistItem {
  key: string;
  section: string;
  label: string;
  status: ItemStatus;
  note?: string;
}
export interface EvidenceRow {
  id: string;
  ticket_id: string | null;
  vehicle_id: string | null;
  kind: "citation" | "registration" | "correspondence" | "other";
  storage_path: string;
  file_name: string;
  content_type: string;
  size_bytes: number | null;
  created_at: string;
}
export interface PacketFile {
  label: string;
  fileName: string;
  contentType: string;
  bytes: Uint8Array | null;
}
export interface PacketData {
  ticket: Record<string, any>;
  ticketLabel: string;
  vehicle: Record<string, any> | null;
  vehicleName: string;
  booking: Record<string, any> | null;
  customer: Record<string, any> | null;
  identity: AgreementRenterIdentity | null;
  municipal: MunicipalRequirement | null;
  evidence: EvidenceRow[];
  agreement: { exists: boolean; bytes: Uint8Array | null };
  idFront: PacketFile | null;
  idBack: PacketFile | null;
  insurance: PacketFile | null;
  citationFiles: PacketFile[];
  registrationFiles: PacketFile[];
  supportingFiles: PacketFile[];
  checklist: ChecklistItem[];
}

/** Extract the storage path from a booking-documents URL (public or signed) or a bare path. */
export function bookingDocPath(url: string | null | undefined): string | null {
  if (!url) return null;
  const m = url.match(/\/object\/(?:public|sign|authenticated)\/booking-documents\/([^?]+)/);
  if (m) return decodeURIComponent(m[1]);
  if (!/^https?:/i.test(url)) return url.replace(/^\/+/, "");
  return null;
}

async function download(supabase: any, bucket: string, path: string): Promise<Uint8Array | null> {
  const { data, error } = await supabase.storage.from(bucket).download(path);
  if (error || !data) return null;
  return new Uint8Array(await data.arrayBuffer());
}

function guessType(path: string): string {
  const p = path.toLowerCase();
  if (p.endsWith(".pdf")) return "application/pdf";
  if (p.endsWith(".png")) return "image/png";
  if (p.endsWith(".webp")) return "image/webp";
  return "image/jpeg";
}

async function bookingFile(supabase: any, label: string, url: string | null | undefined, withBytes: boolean): Promise<PacketFile | null> {
  const path = bookingDocPath(url);
  if (!path) return null;
  return {
    label,
    fileName: path.split("/").pop() || label,
    contentType: guessType(path),
    bytes: withBytes ? await download(supabase, DOCS_BUCKET, path) : new Uint8Array(0),
  };
}

async function evidenceFile(supabase: any, row: EvidenceRow, withBytes: boolean): Promise<PacketFile> {
  return {
    label: row.file_name,
    fileName: row.file_name,
    contentType: row.content_type,
    bytes: withBytes ? await download(supabase, EVIDENCE_BUCKET, row.storage_path) : new Uint8Array(0),
  };
}

export async function gatherPacketData(supabase: any, ticketId: string, withBytes: boolean): Promise<PacketData | null> {
  const { data: ticket } = await supabase.from("tickets").select("*").eq("id", ticketId).maybeSingle();
  if (!ticket) return null;

  const [{ data: vehicle }, { data: booking }] = await Promise.all([
    ticket.vehicle_id ? supabase.from("vehicles").select("*").eq("id", ticket.vehicle_id).maybeSingle() : { data: null },
    ticket.booking_id ? supabase.from("bookings").select("*").eq("id", ticket.booking_id).maybeSingle() : { data: null },
  ]);
  const customerId = ticket.customer_id || booking?.customer_id || null;
  const { data: customer } = customerId
    ? await supabase.from("customers").select("id, name, email, phone, dob, driver_license, id_document_url, id_document_back_url").eq("id", customerId).maybeSingle()
    : { data: null };
  const identity = await fetchRenterIdentity(supabase, customerId);

  const vehicleId = ticket.vehicle_id || booking?.vehicle_id || null;
  const filters = [`ticket_id.eq.${ticketId}`];
  if (vehicleId) filters.push(`vehicle_id.eq.${vehicleId}`);
  const { data: evRows } = await supabase
    .from("ticket_evidence_documents")
    .select("*")
    .or(filters.join(","))
    .order("created_at", { ascending: true });
  const evidence = (evRows || []) as EvidenceRow[];

  // Signed agreement (original file, never regenerated here).
  let agreement: PacketData["agreement"] = { exists: false, bytes: null };
  if (booking?.id) {
    const path = `${booking.id}/rental-agreement-signed.pdf`;
    if (withBytes) {
      const bytes = await download(supabase, DOCS_BUCKET, path);
      agreement = { exists: !!bytes, bytes };
    } else {
      const { data: list } = await supabase.storage.from(DOCS_BUCKET).list(booking.id);
      agreement = { exists: !!list?.some((f: any) => f.name === "rental-agreement-signed.pdf"), bytes: null };
    }
  }

  const idFront = await bookingFile(supabase, "Driver's license (front)", booking?.id_document_url || customer?.id_document_url, withBytes);
  const idBack = await bookingFile(supabase, "Driver's license (back)", booking?.id_document_back_url || customer?.id_document_back_url, withBytes);
  const insurance = await bookingFile(supabase, "Renter's insurance proof", booking?.insurance_proof_url, withBytes);
  const citationFiles = await Promise.all(evidence.filter((e) => e.kind === "citation" && e.ticket_id === ticketId).map((e) => evidenceFile(supabase, e, withBytes)));
  const registrationFiles = await Promise.all(evidence.filter((e) => e.kind === "registration").map((e) => evidenceFile(supabase, e, withBytes)));
  const supportingFiles = await Promise.all(evidence.filter((e) => e.kind === "correspondence" || e.kind === "other").map((e) => evidenceFile(supabase, e, withBytes)));

  const vehicleName = vehicle ? getVehicleDisplayName(vehicle) : "";
  const ticketLabel = ticket.prefix && ticket.ticket_number ? `${ticket.prefix}-${ticket.ticket_number}` : ticket.ticket_number || ticket.id;
  const municipal = findMunicipalRequirement(ticket.municipality);

  const d: PacketData = {
    ticket, ticketLabel, vehicle, vehicleName, booking, customer, identity, municipal, evidence,
    agreement, idFront, idBack, insurance, citationFiles, registrationFiles, supportingFiles, checklist: [],
  };
  d.checklist = buildChecklist(d);
  return d;
}

function buildChecklist(d: PacketData): ChecklistItem[] {
  const t = d.ticket;
  const items: ChecklistItem[] = [];
  const add = (key: string, section: string, label: string, ok: boolean, note?: string, manual = false) =>
    items.push({ key, section, label, status: ok ? "included" : manual ? "manual" : "missing", note });

  add("ticket-info", "A", "Ticket details (number, municipality, violation date)", !!(t.ticket_number && t.municipality && t.violation_date),
    [!t.ticket_number && "ticket number", !t.municipality && "municipality", !t.violation_date && "violation date"].filter(Boolean).join(", ") || undefined);
  add("booking", "F", "Linked rental booking", !!d.booking, d.booking ? undefined : "Link this ticket to a booking on the Edit screen");
  add("vehicle", "A", "Vehicle (year/make/model, plate, VIN)", !!(d.vehicle && d.vehicle.license_plate && d.vehicle.vin), d.vehicle ? (d.vehicle.vin ? undefined : "VIN not on file") : "No vehicle linked");
  add("renter-name", "B", "Renter's legal name", !!(d.booking?.customer_name || d.customer?.name));
  add("renter-address", "B", "Renter's address", !!d.identity?.addressLine, "Not on file. Confirm from the license reader on the booking.");
  add("renter-license", "B", "Driver's license number", !!d.identity?.licenseNumber, "Not on file.");
  add("id-front", "B", "Driver's license photo (front)", !!d.idFront && !!d.idFront.bytes, d.idFront ? "File could not be read." : "No ID photo on the booking or profile.", true);
  add("id-back", "B", "Driver's license photo (back)", !!d.idBack && !!d.idBack.bytes, "Optional. Not on file.", true);
  add("agreement", "C", "Signed rental agreement (original PDF)", d.agreement.exists, "No signed agreement PDF found for this booking.");
  add("citation", "D", "Original ticket / citation scan or photo", d.citationFiles.length > 0, "Upload the citation from the ticket page.", true);
  add("registration", "E", "Vehicle registration", d.registrationFiles.length > 0, "Upload the registration for this vehicle.", true);
  add("rental-dates", "F", "Pickup and return date/time", !!(d.booking?.pickup_date && d.booking?.return_date),
    d.booking ? undefined : "Needs a linked booking");
  add("checkout-photos", "G", "Check-out / return condition photos", false, "The system does not store these. Upload any you have as supporting evidence.", true);
  add("insurance", "G", "Renter's insurance proof", !!d.insurance, "Not on file (optional).", true);
  add("supporting", "G", "Other supporting evidence / correspondence", d.supportingFiles.length > 0, "Optional.", true);
  return items;
}
