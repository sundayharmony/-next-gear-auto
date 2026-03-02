import { NextResponse } from "next/server";
import { supabase, getServiceSupabase } from "@/lib/db/supabase";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, action } = body;

    // Use service role for server-side operations (bypasses RLS)
    const adminDb = getServiceSupabase();

    if (action === "login") {
      const { data: customer, error } = await adminDb
        .from("customers")
        .select("*")
        .eq("email", email)
        .single();

      if (error || !customer) {
        return NextResponse.json(
          { success: false, message: "No account found with that email. Please sign up first." },
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
      // Check if email already exists
      const { data: existing } = await adminDb
        .from("customers")
        .select("id")
        .eq("email", body.email)
        .single();

      if (existing) {
        return NextResponse.json(
          { success: false, message: "Email already registered. Please sign in instead." },
          { status: 409 }
        );
      }

      const newId = "c" + Date.now();
      const { data: newCustomer, error } = await adminDb
        .from("customers")
        .insert({
          id: newId,
          name: body.name,
          email: body.email,
          phone: body.phone || "",
          dob: "",
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
