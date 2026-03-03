import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/db/supabase";
import { verifyAdmin } from "@/lib/auth/admin-check";

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
      .select("id, name, email, phone, role, created_at")
      .order("created_at", { ascending: false });

    if (search) {
      query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%`);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Customers fetch error:", error);
      return NextResponse.json({ success: false, error: "Failed to fetch customers" }, { status: 500 });
    }

    const customers = (data || []).map((c) => ({
      id: c.id,
      name: c.name,
      email: c.email,
      phone: c.phone || "",
      role: c.role || "customer",
      createdAt: c.created_at,
    }));

    return NextResponse.json({ success: true, data: customers });
  } catch (err) {
    console.error("Customers GET error:", err);
    return NextResponse.json({ success: false, error: "Failed to fetch customers" }, { status: 500 });
  }
}
