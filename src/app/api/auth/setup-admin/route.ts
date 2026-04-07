import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/db/supabase";
import bcrypt from "bcryptjs";
import { logger } from "@/lib/utils/logger";
import { createRateLimiter, getClientIp } from "@/lib/security/rate-limit";

// Strict rate limit: 3 calls per 24 hours per IP
const setupLimiter = createRateLimiter({ windowMs: 24 * 60 * 60 * 1000, max: 3 });

// One-time setup: creates or updates the admin account with a hashed password
// Call this once via: POST /api/auth/setup-admin with { "secret": "SUPABASE_SERVICE_KEY first 20 chars" }
export async function POST(request: Request) {
  // Rate limit to prevent brute force
  const ip = getClientIp(request);
  const rateCheck = setupLimiter.check(`setup-admin:${ip}`);
  if (!rateCheck.allowed) {
    return NextResponse.json(
      { success: false, message: "Too many requests. Please try again later." },
      { status: 429, headers: { "Retry-After": String(Math.max(0, Math.ceil((rateCheck.resetAt - Date.now()) / 1000))) } }
    );
  }

  try {
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ success: false, message: "Invalid request body" }, { status: 400 });
    }

    // Simple security: require a secret to run this
    const serviceKey = process.env.SUPABASE_SERVICE_KEY || "";
    const expectedSecret = serviceKey.substring(0, 20);

    if (!body.secret || body.secret !== expectedSecret) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const adminDb = getServiceSupabase();
    const adminEmail = "admin@nextgearauto.com";

    // Password must come from environment variable only (never from request body)
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminPassword) {
      return NextResponse.json(
        { success: false, message: "Admin password must be set via ADMIN_PASSWORD environment variable" },
        { status: 400 }
      );
    }

    const passwordHash = await bcrypt.hash(adminPassword, 12);

    // Check if admin exists in admins table
    const { data: existing } = await adminDb
      .from("admins")
      .select("id")
      .eq("email", adminEmail)
      .maybeSingle();

    if (existing) {
      // Update existing admin with hashed password
      const { error } = await adminDb
        .from("admins")
        .update({ password_hash: passwordHash })
        .eq("email", adminEmail);

      if (error) {
        logger.error("Failed to update admin:", error);
        return NextResponse.json(
          { success: false, message: "Failed to update admin" },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: "Admin password updated successfully.",
      });
    } else {
      // Create admin account in admins table
      const { error } = await adminDb
        .from("admins")
        .insert({
          id: "admin_001",
          name: "Admin",
          email: adminEmail,
          phone: "(551) 429-3472",
          password_hash: passwordHash,
          role: "admin",
        });

      if (error) {
        logger.error("Failed to create admin:", error);
        return NextResponse.json(
          { success: false, message: "Failed to create admin" },
          { status: 500 }
        );
      }

      // Also clean up admin from customers table if it exists there
      await adminDb.from("customers").delete().eq("email", adminEmail);

      return NextResponse.json({
        success: true,
        message: "Admin account created successfully in admins table.",
      });
    }
  } catch (err) {
    logger.error("Setup admin error:", err);
    return NextResponse.json(
      { success: false, message: "Setup failed" },
      { status: 500 }
    );
  }
}
