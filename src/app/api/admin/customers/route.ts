import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/db/supabase";
import { verifyAdmin } from "@/lib/auth/admin-check";
import { logger } from "@/lib/utils/logger";

// GET: Return all customers with optional search
export async function GET(req: NextRequest) {
  const auth = await verifyAdmin(req);
  if (!auth.authorized) return auth.response;
  const supabase = getServiceSupabase();
  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search")?.toLowerCase() || "";

  try {
    let query = supabase
      .from("customers")
      .select("id, name, email, phone, role, profile_picture_url, created_at")
      .order("created_at", { ascending: false });

    if (search) {
      const sanitized = search.replace(/[%_,().*]/g, "");
      if (sanitized) {
        query = query.or(`name.ilike.%${sanitized}%,email.ilike.%${sanitized}%`);
      }
    }

    const { data, error } = await query;

    if (error) {
      logger.error("Customers fetch error:", error);
      return NextResponse.json({ success: false, error: "Failed to fetch customers" }, { status: 500 });
    }

    const customers = (data || []).map((c) => ({
      id: c.id,
      name: c.name,
      email: c.email,
      phone: c.phone || "",
      role: c.role || "customer",
      profilePictureUrl: c.profile_picture_url || null,
      createdAt: c.created_at,
    }));

    return NextResponse.json({ success: true, data: customers });
  } catch (err) {
    logger.error("Customers GET error:", err);
    return NextResponse.json({ success: false, error: "Failed to fetch customers" }, { status: 500 });
  }
}

// POST: Create a new customer
export async function POST(req: NextRequest) {
  const auth = await verifyAdmin(req);
  if (!auth.authorized) return auth.response;
  const supabase = getServiceSupabase();

  try {
    const body = await req.json();
    const { name, email, phone } = body;

    if (!name || !email) {
      return NextResponse.json(
        { success: false, error: "Name and email are required" },
        { status: 400 }
      );
    }

    const customerId = "c_" + crypto.randomUUID();

    const { data, error } = await supabase
      .from("customers")
      .insert([
        {
          id: customerId,
          name,
          email,
          phone: phone || null,
          role: "customer",
          created_at: new Date().toISOString(),
        },
      ])
      .select("id, name, email, phone, role, created_at");

    if (error) {
      logger.error("Customer creation error:", error);
      return NextResponse.json({ success: false, error: "Failed to create customer" }, { status: 500 });
    }

    const customer = (data && data.length > 0) ? {
      id: data[0].id,
      name: data[0].name,
      email: data[0].email,
      phone: data[0].phone || "",
      role: data[0].role || "customer",
      createdAt: data[0].created_at,
    } : null;

    return NextResponse.json({ success: true, data: customer }, { status: 201 });
  } catch (err) {
    logger.error("Customers POST error:", err);
    return NextResponse.json({ success: false, error: "Failed to create customer" }, { status: 500 });
  }
}

// PATCH: Update a customer by ID
export async function PATCH(req: NextRequest) {
  const auth = await verifyAdmin(req);
  if (!auth.authorized) return auth.response;
  const supabase = getServiceSupabase();

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Customer ID is required" },
        { status: 400 }
      );
    }

    const body = await req.json();
    const { name, email, phone } = body;

    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email;
    if (phone !== undefined) updateData.phone = phone;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { success: false, error: "No fields to update" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("customers")
      .update(updateData)
      .eq("id", id)
      .select("id, name, email, phone, role, profile_picture_url, created_at");

    if (error) {
      logger.error("Customer update error:", error);
      return NextResponse.json({ success: false, error: "Failed to update customer" }, { status: 500 });
    }

    const customer = (data && data[0]) ? {
      id: data[0].id,
      name: data[0].name,
      email: data[0].email,
      phone: data[0].phone || "",
      role: data[0].role || "customer",
      profilePictureUrl: data[0].profile_picture_url || null,
      createdAt: data[0].created_at,
    } : null;

    return NextResponse.json({ success: true, data: customer });
  } catch (err) {
    logger.error("Customers PATCH error:", err);
    return NextResponse.json({ success: false, error: "Failed to update customer" }, { status: 500 });
  }
}

// DELETE: Remove a customer by ID
export async function DELETE(req: NextRequest) {
  const auth = await verifyAdmin(req);
  if (!auth.authorized) return auth.response;
  const supabase = getServiceSupabase();

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Customer ID is required" },
        { status: 400 }
      );
    }

    // First nullify customer_id on related bookings to avoid FK constraint
    const { error: updateError } = await supabase
      .from("bookings")
      .update({ customer_id: null })
      .eq("customer_id", id);

    if (updateError) {
      logger.error("Error updating bookings during customer deletion:", updateError);
      return NextResponse.json({ success: false, error: "Failed to update bookings" }, { status: 500 });
    }

    const { error } = await supabase
      .from("customers")
      .delete()
      .eq("id", id);

    if (error) {
      logger.error("Customer deletion error:", error);
      return NextResponse.json({ success: false, error: "Failed to delete customer" }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: "Customer deleted successfully" });
  } catch (err) {
    logger.error("Customers DELETE error:", err);
    return NextResponse.json({ success: false, error: "Failed to delete customer" }, { status: 500 });
  }
}
