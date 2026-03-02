import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/db/supabase";
import bcrypt from "bcryptjs";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password, action } = body;

    // Use service role for server-side operations (bypasses RLS)
    const adminDb = getServiceSupabase();

    if (action === "login") {
      if (!email || !password) {
        return NextResponse.json(
          { success: false, message: "Email and password are required." },
          { status: 400 }
        );
      }

      const { data: customer, error } = await adminDb
        .from("customers")
        .select("*")
        .eq("email", email.toLowerCase().trim())
        .single();

      if (error || !customer) {
        return NextResponse.json(
          { success: false, message: "No account found with that email. Please sign up first." },
          { status: 401 }
        );
      }

      // Verify password
      if (!customer.password_hash) {
        return NextResponse.json(
          { success: false, message: "Account has no password set. Please contact support." },
          { status: 401 }
        );
      }

      const passwordMatch = await bcrypt.compare(password, customer.password_hash);
      if (!passwordMatch) {
        return NextResponse.json(
          { success: false, message: "Incorrect password. Please try again." },
          { status: 401 }
        );
      }

      // Map DB fields to frontend expected format
      const mapped = {
        id: customer.id,
        name: customer.name,
        email: customer.email,
        phone: customer.phone || "",
        dob: customer.dob || "",
        driverLicense: customer.driver_license || null,
        paymentMethods: [],
        bookings: [],
        createdAt: customer.created_at,
        role: customer.role,
      };

      return NextResponse.json({ data: mapped, success: true });
    }

    if (action === "signup") {
      if (!body.name || !body.email || !body.password) {
        return NextResponse.json(
          { success: false, message: "Name, email, and password are required." },
          { status: 400 }
        );
      }

      if (body.password.length < 6) {
        return NextResponse.json(
          { success: false, message: "Password must be at least 6 characters." },
          { status: 400 }
        );
      }

      // Check if email already exists
      const { data: existing } = await adminDb
        .from("customers")
        .select("id")
        .eq("email", body.email.toLowerCase().trim())
        .single();

      if (existing) {
        return NextResponse.json(
          { success: false, message: "Email already registered. Please sign in instead." },
          { status: 409 }
        );
      }

      // Hash the password
      const passwordHash = await bcrypt.hash(body.password, 12);

      const newId = "c" + Date.now();
      const { data: newCustomer, error } = await adminDb
        .from("customers")
        .insert({
          id: newId,
          name: body.name,
          email: body.email.toLowerCase().trim(),
          phone: body.phone || "",
          dob: "",
          password_hash: passwordHash,
          role: "customer",
        })
        .select("*")
        .single();

      if (error) {
        console.error("Signup error:", error.message, error.details, error.hint);
        return NextResponse.json(
          { success: false, message: `Failed to create account: ${error.message}` },
          { status: 500 }
        );
      }

      const mapped = {
        id: newCustomer.id,
        name: newCustomer.name,
        email: newCustomer.email,
        phone: newCustomer.phone || "",
        dob: newCustomer.dob || "",
        driverLicense: null,
        paymentMethods: [],
        bookings: [],
        createdAt: newCustomer.created_at,
        role: newCustomer.role,
      };

      return NextResponse.json({ data: mapped, success: true }, { status: 201 });
    }

    return NextResponse.json(
      { success: false, message: "Invalid action" },
      { status: 400 }
    );
  } catch (err) {
    console.error("Auth API error:", err);
    return NextResponse.json(
      { success: false, message: "Invalid request" },
      { status: 400 }
    );
  }
}
