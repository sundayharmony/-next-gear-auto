import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/db/supabase";
import { verifyAdmin } from "@/lib/auth/admin-check";
import { sendPasswordResetLink } from "@/lib/email/mailer";

export async function POST(req: NextRequest) {
  const auth = await verifyAdmin(req);
  if (!auth.authorized) return auth.response;

  try {
    const body = await req.json();
    const { email, customerId } = body;

    if (!email || !customerId) {
      return NextResponse.json(
        { success: false, message: "Email and customerId are required" },
        { status: 400 }
      );
    }

    const supabase = getServiceSupabase();

    // Fetch the customer
    const { data: customer, error: fetchError } = await supabase
      .from("customers")
      .select("id, name, email, password_hash")
      .eq("id", customerId)
      .single();

    if (fetchError || !customer) {
      return NextResponse.json(
        { success: false, message: "Customer not found" },
        { status: 404 }
      );
    }

    // If customer already has a password_hash, clear it
    if (customer.password_hash) {
      const { error: updateError } = await supabase
        .from("customers")
        .update({ password_hash: null })
        .eq("id", customerId);

      if (updateError) {
        console.error("Failed to clear password_hash:", updateError);
        return NextResponse.json(
          { success: false, message: "Failed to reset password hash" },
          { status: 500 }
        );
      }
    }

    // Send the password reset email
    await sendPasswordResetLink({
      customerName: customer.name,
      customerEmail: customer.email,
    });

    return NextResponse.json({
      success: true,
      message: "Password reset link sent successfully",
    });
  } catch (error) {
    console.error("Send password link error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to send password reset link" },
      { status: 500 }
    );
  }
}
