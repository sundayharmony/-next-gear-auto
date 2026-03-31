import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/db/supabase";
import { verifyAdmin } from "@/lib/auth/admin-check";
import { logger } from "@/lib/utils/logger";
import { reviewLimiter, getClientIp, rateLimitResponse } from "@/lib/security/rate-limit";

// GET: Return reviews — verified admins see all statuses, public only sees approved
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const vehicleId = searchParams.get("vehicleId");
  const adminRequested = searchParams.get("admin") === "true";
  const statusFilter = searchParams.get("status"); // all, pending, approved, rejected
  const supabase = getServiceSupabase();

  // Verify admin identity if admin view requested
  let isAdmin = false;
  if (adminRequested) {
    const auth = await verifyAdmin(req);
    isAdmin = auth.authorized;
  }

  // Try to fetch from Supabase first
  try {
    let query = supabase
      .from("reviews")
      .select("*")
      .order("created_at", { ascending: false });

    // For public API, only show approved. For verified admin, optionally filter by status
    if (!isAdmin) {
      query = query.eq("status", "approved");
    } else if (statusFilter && statusFilter !== "all") {
      query = query.eq("status", statusFilter);
    }

    if (vehicleId) {
      query = query.eq("vehicle_id", vehicleId);
    }

    const { data: dbReviews, error } = await query;

    if (error) {
      logger.error("Reviews fetch error:", error);
      return NextResponse.json({ data: [], success: true });
    }

    // Map Supabase reviews to frontend format
    const reviews = (dbReviews || []).map((r) => ({
      id: r.id,
      customerId: r.customer_id,
      customerName: r.customer_name,
      vehicleId: r.vehicle_id,
      rating: r.rating,
      text: r.text,
      status: r.status,
      createdAt: r.created_at,
      isVerified: true,
    }));

    return NextResponse.json({ data: reviews, success: true });
  } catch (err) {
    logger.error("Reviews GET error:", err);
    return NextResponse.json({ data: [], success: true });
  }
}

// POST: Submit a new review
export async function POST(req: NextRequest) {
  // Rate limiting
  const ip = getClientIp(req);
  const rateCheck = reviewLimiter.check(ip);
  if (!rateCheck.allowed) {
    return rateLimitResponse(rateCheck.resetAt);
  }

  const supabase = getServiceSupabase();
  try {
    const body = await req.json();
    const { customerId, customerName, vehicleId, bookingId, rating, text } = body;

    // Validation
    if (!customerName || !vehicleId || !rating || !text) {
      return NextResponse.json(
        { success: false, error: "customerName, vehicleId, rating, and text are required" },
        { status: 400 }
      );
    }

    if (rating < 1 || rating > 5) {
      return NextResponse.json(
        { success: false, error: "Rating must be between 1 and 5" },
        { status: 400 }
      );
    }

    if (text.length > 500) {
      return NextResponse.json(
        { success: false, error: "Review text cannot exceed 500 characters" },
        { status: 400 }
      );
    }

    // Sanitize customer name - escape HTML entities
    const escapeHtml = (s: string) =>
      s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
    const safeName = escapeHtml(customerName.trim());

    // Sanitize review text - escape HTML entities and prevent CSV/formula injection
    const safeText = escapeHtml((text || "").trim()).replace(/^[=+\-@\t\r]/g, "");

    // Insert into Supabase
    const reviewId = `rev_${crypto.randomUUID()}`;

    const { data, error } = await supabase.from("reviews").insert({
      id: reviewId,
      customer_id: customerId || null,
      customer_name: safeName,
      vehicle_id: vehicleId,
      booking_id: bookingId || null,
      rating,
      text: safeText.trim(),
      status: "pending", // Reviews need admin approval
    }).select().single();

    if (error) {
      logger.error("Review insert error:", error);
      return NextResponse.json(
        { success: false, error: "Failed to submit review. Please try again." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        id: data.id,
        message: "Thank you! Your review has been submitted and will appear after approval.",
      },
    });
  } catch (err) {
    logger.error("Review POST error:", err);
    return NextResponse.json(
      { success: false, error: "Failed to submit review" },
      { status: 500 }
    );
  }
}

// PATCH: Approve or reject a review (admin)
export async function PATCH(req: NextRequest) {
  const auth = await verifyAdmin(req);
  if (!auth.authorized) return auth.response;
  const supabase = getServiceSupabase();
  try {
    const body = await req.json();
    const { id, status } = body;

    if (!id || !status) {
      return NextResponse.json({ success: false, error: "id and status are required" }, { status: 400 });
    }

    if (!["approved", "rejected", "pending"].includes(status)) {
      return NextResponse.json({ success: false, error: "Invalid status" }, { status: 400 });
    }

    const { error } = await supabase
      .from("reviews")
      .update({ status })
      .eq("id", id);

    if (error) {
      logger.error("Review PATCH error:", error);
      return NextResponse.json({ success: false, error: "Failed to update review" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    logger.error("Review PATCH error:", err);
    return NextResponse.json({ success: false, error: "Failed to update review" }, { status: 500 });
  }
}

// DELETE: Remove a review (admin)
export async function DELETE(req: NextRequest) {
  const auth = await verifyAdmin(req);
  if (!auth.authorized) return auth.response;
  const supabase = getServiceSupabase();
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ success: false, error: "id is required" }, { status: 400 });
  }

  try {
    const { error } = await supabase.from("reviews").delete().eq("id", id);

    if (error) {
      logger.error("Review DELETE error:", error);
      return NextResponse.json({ success: false, error: "Failed to delete review" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    logger.error("Review DELETE error:", err);
    return NextResponse.json({ success: false, error: "Failed to delete review" }, { status: 500 });
  }
}
