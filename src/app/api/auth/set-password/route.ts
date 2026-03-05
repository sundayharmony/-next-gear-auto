import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/db/supabase";
import bcrypt from "bcryptjs";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { success: false, message: "Email and password are required." },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { success: false, message: "Password must be at least 6 characters." },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();
    const supabase = getServiceSupabase();

    // Find the customer
    const { data: customer, error: findError } = await supabase
      .from("customers")
      .select("id, password_hash, name, email, phone, dob, role, created_at")
      .eq("email", normalizedEmail)
      .single();

    if (findError || !customer) {
      return NextResponse.json(
        { success: false, message: "No account found with that email address." },
        { status: 404 }
      );
    }

    // Only allow setting password if one doesn't exist yet
    if (customer.password_hash) {
      return NextResponse.json(
        { success: false, message: "This account already has a password. Please use the login page instead." },
        { status: 409 }
      );
    }

    // Hash and set the password
    const passwordHash = await bcrypt.hash(password, 12);
    const { error: updateError } = await supabase
      .from("customers")
      .update({ password_hash: passwordHash })
      .eq("id", customer.id);

    if (updateError) {
      console.error("Set password error:", updateError);
      return NextResponse.json(
        { success: false, message: "Failed to set password. Please try again." },
        { status: 500 }
      );
    }

    // Return user data so frontend can log them in
    const userData = {
      id: customer.id,
      name: customer.name,
      email: customer.email,
      phone: customer.phone || "",
      dob: customer.dob || "",
      driverLicense: null,
      paymentMethods: [],
      bookings: [],
      createdAt: customer.created_at,
      role: customer.role || "customer",
    };

    return NextResponse.json({
      success: true,
      message: "Password set successfully!",
      data: userData,
    });
  } catch (err) {
    console.error("Set password API error:", err);
    return NextResponse.json(
      { success: false, message: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
