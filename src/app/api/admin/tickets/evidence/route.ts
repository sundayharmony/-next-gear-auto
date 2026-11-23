import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/db/supabase";
import { verifyAdminOrManager } from "@/lib/auth/admin-check";
import { EVIDENCE_BUCKET } from "@/lib/disputes/packet-data";
import { logger } from "@/lib/utils/logger";

const MAX_BYTES = 10 * 1024 * 1024;
const TYPES: Record<string, string> = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
};
const KINDS = ["citation", "registration", "correspondence", "other"];

/** GET ?ticket_id=&vehicle_id= : list evidence metadata (no file URLs). */
export async function GET(req: NextRequest) {
  const auth = await verifyAdminOrManager(req);
  if (!auth.authorized) return auth.response;
  const sp = new URL(req.url).searchParams;
  const ticketId = sp.get("ticket_id");
  const vehicleId = sp.get("vehicle_id");
  if (!ticketId && !vehicleId) return NextResponse.json({ success: false, message: "ticket_id or vehicle_id required" }, { status: 400 });
  const filters = [ticketId && `ticket_id.eq.${ticketId}`, vehicleId && `vehicle_id.eq.${vehicleId}`].filter(Boolean).join(",");
  const { data, error } = await getServiceSupabase()
    .from("ticket_evidence_documents")
    .select("id, ticket_id, vehicle_id, kind, file_name, content_type, size_bytes, created_at")
    .or(filters)
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  return NextResponse.json({ success: true, documents: data || [] }, { headers: { "Cache-Control": "no-store" } });
}

/** POST multipart: file, kind, ticketId (citation/correspondence/other) or vehicleId (registration). */
export async function POST(req: NextRequest) {
  const auth = await verifyAdminOrManager(req);
  if (!auth.authorized) return auth.response;
  try {
    const form = await req.formData();
    const file = form.get("file") as File | null;
    const kind = String(form.get("kind") || "");
    const ticketId = (form.get("ticketId") as string) || null;
    const vehicleId = (form.get("vehicleId") as string) || null;
    if (!file || !KINDS.includes(kind)) return NextResponse.json({ success: false, message: "file and a valid kind are required" }, { status: 400 });
    const ext = TYPES[file.type];
    if (!ext) return NextResponse.json({ success: false, message: "Only PDF, JPG or PNG files are accepted" }, { status: 400 });
    if (file.size > MAX_BYTES) return NextResponse.json({ success: false, message: "File must be 10 MB or smaller" }, { status: 400 });
    const isVehicleDoc = kind === "registration";
    if (isVehicleDoc ? !vehicleId : !ticketId) {
      return NextResponse.json({ success: false, message: isVehicleDoc ? "vehicleId required for registration" : "ticketId required" }, { status: 400 });
    }
    const supabase = getServiceSupabase();
    const scope = isVehicleDoc ? `vehicle/${vehicleId}` : `ticket/${ticketId}`;
    const storagePath = `${scope}/${kind}-${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from(EVIDENCE_BUCKET)
      .upload(storagePath, new Uint8Array(await file.arrayBuffer()), { contentType: file.type, upsert: false });
    if (upErr) {
      logger.error("Evidence upload error:", upErr);
      return NextResponse.json({ success: false, message: "Upload failed" }, { status: 500 });
    }
    const { data, error } = await supabase
      .from("ticket_evidence_documents")
      .insert({
        ticket_id: isVehicleDoc ? null : ticketId,
        vehicle_id: isVehicleDoc ? vehicleId : null,
        kind,
        storage_path: storagePath,
        file_name: file.name.slice(0, 120),
        content_type: file.type,
        size_bytes: file.size,
        uploaded_by: auth.userId ?? null,
      })
      .select("id, kind, file_name, content_type, size_bytes, created_at")
      .single();
    if (error) {
      await supabase.storage.from(EVIDENCE_BUCKET).remove([storagePath]);
      return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true, document: data });
  } catch (err) {
    logger.error("Evidence POST error:", err);
    return NextResponse.json({ success: false, message: "Upload failed" }, { status: 500 });
  }
}

/** DELETE ?id= : removes one evidence document (never touches rental agreements or customer IDs). */
export async function DELETE(req: NextRequest) {
  const auth = await verifyAdminOrManager(req);
  if (!auth.authorized) return auth.response;
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ success: false, message: "id required" }, { status: 400 });
  const supabase = getServiceSupabase();
  const { data: row } = await supabase.from("ticket_evidence_documents").select("storage_path").eq("id", id).maybeSingle();
  if (!row) return NextResponse.json({ success: false, message: "Not found" }, { status: 404 });
  await supabase.storage.from(EVIDENCE_BUCKET).remove([row.storage_path]);
  const { error } = await supabase.from("ticket_evidence_documents").delete().eq("id", id);
  if (error) return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
