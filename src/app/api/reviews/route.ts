import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/db/supabase";
import reviewsData from "@/data/reviews.json";

// GET: Return all reviews (from JSON fallback + Supabase)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const vehicleId = searchParams.get("vehicleId");
  const supabase = getServiceSupabase();

  // Try to fetch from Supabase first
  try {
    let query = supabase
      .from("reviews")
      .select("*")
      .eq("status", "approved")
      .order("created_at", { ascending: false });

    if (vehicleId) {
      query = query.eq("vehicle_id", vehicleId);
    }

    const { data: dbReviews, error } = await query;

    if (!error && dbReviews && dbReviews.length > 0) {
      // Map Supabase reviews to frontend format
      const reviews = dbReviews.map((r) => ({
        id: r.id,
        customerId: r.customer_id,
        customerName: r.customer_name,
        vehicleId: r.vehicle_id,
        rating: r.rating,
        text: r.text,
        createdAt: r.created_at,
        isVerified: true,
      }));

      // Merge with JSON fallback reviews
      const jsonReviews = vehicleId
        ? reviewsData.filter((r) => r.vehicleId === vehicleId)
        : reviewsData;

      const allReviews = [...reviews, ...jsonReviews];
      return NextResponse.json({ data: allReviews, success: true });
    }
  } catch {
    // Fall through to JSON fallback
  }

  // Fallback to static JSON
  const filtered = vehicleId
    ? reviewsData.filter((r) => r.vehicleId === vehicleId)
    : reviewsData;

  return NextResponse.json({ data: filtered, success: true });
}

// POST: Submit a new review
export async function POST(req: NextRequest) {
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

    // Insert into Supabase
    const reviewId = `rev_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    const { data, error } = await supabase.from("reviews").insert({
      id: reviewId,
      customer_id: customerId || null,
      customer_name: customerName,
      vehicle_id: vehicleId,
      booking_id: bookingId || null,
      rating,
      text: text.trim(),
      status: "pending", // Reviews need admin approval
    }).select().single();

    if (error) {
      console.error("Review insert error:", error);
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
    console.error("Review POST error:", err);
    return NextResponse.json(
      { success: false, error: "Failed to submit review" },
      { status: 500 }
    );
  }
}
