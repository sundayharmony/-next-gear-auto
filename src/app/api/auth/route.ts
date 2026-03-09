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

      const normalizedEmail = email.toLowerCase().trim();

      // Check admins table first
      const { data: admin } = await adminDb
        .from("admins")
        .select("*")
        .eq("email", normalizedEmail)
        .single();

      if (admin) {
        const passwordMatch = await bcrypt.compare(password, admin.password_hash);
        if (!passwordMatch) {
          return NextResponse.json(
            { success: false, message: "Invalid email or password." },
            { status: 401 }
          );
        }
        return NextResponse.json({
          data: {
            id: admin.id,
            name: admin.name,
            email: admin.email,
            phone: admin.phone || "",
            dob: "",
            driverLicense: null,
            paymentMethods: [],
            bookings: [],
            createdAt: admin.created_at,
            role: "admin",
          },
          success: true,
        });
      }

      // Then check customers table
      const { data: customer, error } = await adminDb
        .from("customers")
        .select("*")
        .eq("email", normalizedEmail)
        .single();

      if (error || !customer) {
        return NextResponse.json(
          { success: false, message: "Invalid email or password." },
          { status: 401 }
        );
      }

      // Verify password
      if (!customer.password_hash) {
        return NextResponse.json(
          { success: false, message: "No password set yet. Please check your booking confirmation email for the link to set up your password.", needsPassword: true, email: normalizedEmail },
          { status: 401 }
        );
      }

      const passwordMatch = await bcrypt.compare(password, customer.password_hash);
      if (!passwordMatch) {
        return NextResponse.json(
          { success: false, message: "Invalid email or password." },
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
        role: customer.role || "customer",
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

      // Check if email already exists (single query instead of two)
      const { data: existing } = await adminDb
        .from("customers")
        .select("id, password_hash")
        .eq("email", body.email.toLowerCase().trim())
        .single();

      if (existing) {
        if (!existing.password_hash) {
          // Customer was auto-created during booking, set their password
          const passwordHash = await bcrypt.hash(body.password, 12);
          await adminDb
            .from("customers")
            .update({
              password_hash: passwordHash,
              name: body.name,
              phone: body.phone || "",
            })
            .eq("id", existing.id);

          const { data: updated } = await adminDb
            .from("customers")
            .select("*")
            .eq("id", existing.id)
            .single();

          if (updated) {
            return NextResponse.json({
              data: {
                id: updated.id,
                name: updated.name,
                email: updated.email,
                phone: updated.phone || "",
                dob: updated.dob || "",
                driverLicense: null,
                paymentMethods: [],
                bookings: [],
                createdAt: updated.created_at,
                role: updated.role || "customer",
              },
              success: true,
            }, { status: 201 });
          }
        }

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
        console.error("Signup error:", error);
        return NextResponse.json(
          { success: false, message: "Failed to create account. Please try again." },
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

// PATCH: Update user profile
export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, name, phone, dob } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, message: "User ID is required." },
        { status: 400 }
      );
    }

    const adminDb = getServiceSupabase();

    // Check if it's an admin
    const { data: admin } = await adminDb.from("admins").select("id").eq("id", id).single();
    const table = admin ? "admins" : "customers";

    const updates: Record<string, string> = {};
    if (name) updates.name = name.trim().slice(0, 100);
    if (phone !== undefined) updates.phone = phone.trim().slice(0, 20);
    if (dob !== undefined && table === "customers") updates.dob = dob;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { success: false, message: "No fields to update." },
        { status: 400 }
      );
    }

    const { error } = await adminDb.from(table).update(updates).eq("id", id);

    if (error) {
      console.error("Profile update error:", error);
      return NextResponse.json(
        { success: false, message: "Failed to update profile." },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, message: "Profile updated." });
  } catch (err) {
    console.error("Profile PATCH error:", err);
    return NextResponse.json(
      { success: false, message: "Invalid request." },
      { status: 400 }
    );
  }
}
