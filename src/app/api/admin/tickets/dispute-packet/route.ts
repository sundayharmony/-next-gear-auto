import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/db/supabase";
import { verifyAdminOrManager } from "@/lib/auth/admin-check";
import { gatherPacketData } from "@/lib/disputes/packet-data";
import { buildDisputePacketPdf } from "@/lib/disputes/packet-pdf";
import { notarizationLabel } from "@/lib/disputes/municipal-guidance";
import { logger } from "@/lib/utils/logger";

export const maxDuration = 60;

/**
 * GET /api/admin/tickets/dispute-packet?id=<ticketId>[&mode=summary]
 * Staff only. mode=summary returns the checklist + municipality guidance as JSON;
 * otherwise streams one merged PDF. Nothing is stored or exposed through a public URL.
 */
export async function GET(req: NextRequest) {
  const auth = await verifyAdminOrManager(req);
  if (!auth.authorized) return auth.response;

  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id) return NextResponse.json({ success: false, message: "Ticket id required" }, { status: 400 });
  const summary = url.searchParams.get("mode") === "summary";

  try {
    const supabase = getServiceSupabase();
    const d = await gatherPacketData(supabase, id, !summary);
    if (!d) return NextResponse.json({ success: false, message: "Ticket not found" }, { status: 404 });

    if (summary) {
      const m = d.municipal;
      return NextResponse.json(
        {
          success: true,
          checklist: d.checklist,
          guidance: m
            ? {
                municipality: m.municipality,
                court: m.court,
                notarization: notarizationLabel(m.notarization),
                deadlines: m.deadlines || null,
                forms: m.forms,
                supportingDocuments: m.supporting_documents,
                instructions: m.instructions,
                links: m.links,
                lastVerified: m.last_verified,
                note: m.verified_fields_note || null,
              }
            : null,
        },
        { headers: { "Cache-Control": "no-store" } },
      );
    }

    const bytes = await buildDisputePacketPdf(d);
    logger.info(`Dispute packet generated for ticket ${id} by ${auth.userId ?? "staff"}`);
    const safe = String(d.ticket.ticket_number || d.ticket.id).replace(/[^a-zA-Z0-9-_]/g, "_");
    return new NextResponse(Buffer.from(bytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="NextGearAuto_DisputePacket_${safe}.pdf"`,
        "Cache-Control": "no-store, private",
      },
    });
  } catch (err) {
    logger.error("Dispute packet error:", err);
    return NextResponse.json({ success: false, message: "Could not build the packet" }, { status: 500 });
  }
}
