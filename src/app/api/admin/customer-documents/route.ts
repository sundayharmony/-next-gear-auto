import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/db/supabase";
import { verifyAdminOrManager } from "@/lib/auth/admin-check";
import { logger } from "@/lib/utils/logger";

/**
 * POST /api/admin/customer-documents
 * Upload an ID document (or insurance proof) directly to a customer profile,
 * independent of any booking.
 *
 * FormData fields:
 *  - file: Image (JPG/PNG/WebP) or PDF, max 5 MB
 *  - customerId: customer ID
 *  - type: "id_document" | "insurance_proof" (defaults to "id_document")
 */
export async function POST(request: NextRequest) {
  const auth = await verifyAdminOrManager(request);
  if (!auth.authorized) return auth.response;

  try {
    const supabase = getServiceSupabase();
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const customerId = formData.get("customerId") as string | null;
    const docType = (formData.get("type") as string) || "id_document";

    if (!file || !customerId) {
      return NextResponse.json(
        { success: false, error: "Missing file or customerId" },
        { status: 400 }
      );
    }

    if (!["id_document", "insurance_proof"].includes(docType)) {
      return NextResponse.json(
        { success: false, error: "Invalid document type" },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { success: false, error: "Invalid file type. Use JPG, PNG, WebP, or PDF." },
        { status: 400 }
      );
    }

    // Validate file size (5 MB max)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { success: false, error: "File too large. Maximum 5 MB." },
        { status: 400 }
      );
    }

    // Validate extension matches MIME
    const ext = file.name.split(".").pop()?.toLowerCase() || "";
    const extMimeMap: Record<string, string[]> = {
      jpg: ["image/jpeg"], jpeg: ["image/jpeg"], png: ["image/png"],
      webp: ["image/webp"], pdf: ["application/pdf"],
    };
    if (!extMimeMap[ext] || !extMimeMap[ext].includes(file.type)) {
      return NextResponse.json(
        { success: false, error: "File extension does not match content type" },
        { status: 400 }
      );
    }

    const fileExt = ext || "jpg";
    const fileName = `customers/${customerId}/${docType}_${crypto.randomUUID()}.${fileExt}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to booking-documents bucket (already exists and has RLS configured)
    let uploadResult = await supabase.storage
      .from("booking-documents")
      .upload(fileName, buffer, { contentType: file.type, upsert: true });

    if (uploadResult.error) {
      logger.error("Customer document upload error:", JSON.stringify(uploadResult.error));
      return NextResponse.json(
        { success: false, error: `Upload failed: ${uploadResult.error.message}` },
        { status: 500 }
      );
    }

    if (!uploadResult.data?.path) {
      return NextResponse.json(
        { success: false, error: "Upload failed: no file path returned" },
        { status: 500 }
      );
    }

    const { data: urlData } = supabase.storage
      .from("booking-documents")
      .getPublicUrl(uploadResult.data.path);

    const publicUrl = urlData.publicUrl;

    // Update the customer record with the document URL
    const columnName = docType === "id_document" ? "id_document_url" : "insurance_proof_url";
    const { error: updateError } = await supabase
      .from("customers")
      .update({ [columnName]: publicUrl })
      .eq("id", customerId);

    if (updateError) {
      // Column might not exist yet — return URL anyway
      logger.warn("Customer document column update failed (column may not exist):", updateError);
      return NextResponse.json({
        success: true,
        url: publicUrl,
        warning: `File uploaded but customer record not updated. You may need to add the ${columnName} column to the customers table.`,
      });
    }

    return NextResponse.json({ success: true, url: publicUrl });
  } catch (error) {
    logger.error("Customer document upload error:", error);
    return NextResponse.json(
      { success: false, error: `Internal server error: ${error instanceof Error ? error.message : "Unknown"}` },
      { status: 500 }
    );
  }
}
