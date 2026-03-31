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

  // Validate and sanitize search parameter
  let search = searchParams.get("search")?.toLowerCase() || "";
  if (search.length > 100) {
    search = search.slice(0, 100);
  }

  try {
    const limitParam = searchParams.get("limit");
    const offsetParam = searchParams.get("offset");

    const limit = limitParam ? Math.min(Math.max(1, parseInt(limitParam, 10) || 50), 200) : 50;
    const offset = offsetParam ? Math.max(0, parseInt(offsetParam, 10) || 0) : 0;

    let query = supabase
      .from("customers")
      .select("id, name, email, phone, role, profile_picture_url, created_at", { count: "exact" })
      .order("created_at", { ascending: false });

    if (search) {
      const sanitized = search.replace(/[%_,().*]/g, "");
      if (sanitized) {
        query = query.or(`name.ilike.%${sanitized}%,email.ilike.%${sanitized}%`);
      }
    }

    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

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

    return NextResponse.json({ success: true, data: customers, total: count || 0, limit, offset }, {
      headers: {
        "Cache-Control": "no-store, no-cache",
      },
    });
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
    let { name, email, phone } = body;

    // Validate required fields
    if (!name || !email) {
      return NextResponse.json(
        { success: false, error: "Name and email are required" },
        { status: 400 }
      );
    }

    // Validate and sanitize input lengths
    if (typeof name !== "string" || name.length > 100) {
      return NextResponse.json(
        { success: false, error: "Name must be a string with max 100 characters" },
        { status: 400 }
      );
    }

    if (typeof email !== "string" || email.length > 255) {
      return NextResponse.json(
        { success: false, error: "Email must be a string with max 255 characters" },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { success: false, error: "Invalid email format" },
        { status: 400 }
      );
    }

    if (phone && typeof phone !== "string" || phone?.length > 20) {
      return NextResponse.json(
        { success: false, error: "Phone must be a string with max 20 characters" },
        { status: 400 }
      );
    }

    // Trim inputs
    name = name.trim();
    email = email.trim().toLowerCase();
    phone = phone?.trim() || null;

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
    let { name, email, phone } = body;

    // Validate field lengths if provided
    if (name !== undefined) {
      if (typeof name !== "string" || name.length > 100) {
        return NextResponse.json(
          { success: false, error: "Name must be a string with max 100 characters" },
          { status: 400 }
        );
      }
      name = name.trim();
    }

    if (email !== undefined) {
      if (typeof email !== "string" || email.length > 255) {
        return NextResponse.json(
          { success: false, error: "Email must be a string with max 255 characters" },
          { status: 400 }
        );
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return NextResponse.json(
          { success: false, error: "Invalid email format" },
          { status: 400 }
        );
      }
      email = email.trim().toLowerCase();
    }

    if (phone !== undefined && phone !== null) {
      if (typeof phone !== "string" || phone.length > 20) {
        return NextResponse.json(
          { success: false, error: "Phone must be a string with max 20 characters" },
          { status: 400 }
        );
      }
      phone = phone.trim();
    }

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
