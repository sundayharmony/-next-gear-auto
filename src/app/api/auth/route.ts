import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/db/supabase";
import bcrypt from "bcryptjs";
import { validatePassword, PASSWORD_REQUIREMENTS } from "@/lib/auth/password-policy";
import { createAccessToken, createRefreshToken, setAuthCookies, clearAuthCookies, getAuthFromRequest } from "@/lib/auth/jwt";
import { loginLimiter, getClientIp, rateLimitResponse } from "@/lib/security/rate-limit";
import { auditLog } from "@/lib/security/audit-log";
import { logger } from "@/lib/utils/logger";
import { isAppRole, type AppRole } from "@/lib/auth/roles";

function normalizeRole(role: unknown): AppRole {
  if (isAppRole(role)) return role;
  return "customer";
}

// GET: Validate current session and return user data from JWT
export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthFromRequest(request);
    // #region agent log
    fetch('http://127.0.0.1:7281/ingest/53c91875-0450-4365-9e2e-62372b8ba563',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'6fde49'},body:JSON.stringify({sessionId:'6fde49',runId:'admin-access-denied-run1',hypothesisId:'H2',location:'api/auth/route.ts:GET',message:'Auth GET token payload parsed',data:{hasAuth:Boolean(auth),role:auth?.role||null,subPresent:Boolean(auth?.sub)},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
    if (!auth) {
      // Return 200 with success:false (not 401) so browsers don't log a red console error
      // on every page load for unauthenticated visitors
      return NextResponse.json({ success: false, message: "Not authenticated" });
    }

    const supabase = getServiceSupabase();

    // Look up the user in the appropriate table based on role
    if (auth.role === "admin") {
      const { data: admin } = await supabase.from("admins").select("id, name, email, phone, created_at").eq("id", auth.sub).maybeSingle();
      if (!admin) {
        return NextResponse.json({ success: false, message: "Admin not found" }, { status: 404 });
      }
      return NextResponse.json({
        success: true,
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
      });
    }

    const { data: customer } = await supabase.from("customers").select("id, name, email, phone, dob, driver_license, created_at, role").eq("id", auth.sub).maybeSingle();
    if (!customer) {
      return NextResponse.json({ success: false, message: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: {
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
      },
    });
  } catch {
    return NextResponse.json({ success: false, message: "Session validation failed" }, { status: 401 });
  }
}

export async function POST(request: Request) {
  try {
    // Rate limit login/signup attempts
    const ip = getClientIp(request);
    const rateCheck = loginLimiter.check(ip);
    if (!rateCheck.allowed) {
      return rateLimitResponse(rateCheck.resetAt);
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ success: false, message: "Invalid request body" }, { status: 400 });
    }
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
        .select("id, name, email, phone, created_at, password_hash")
        .eq("email", normalizedEmail)
        .maybeSingle();

      if (admin) {
        const passwordMatch = await bcrypt.compare(password, admin.password_hash);
        if (!passwordMatch) {
          auditLog("LOGIN_FAILED", { ip, email: normalizedEmail, details: { reason: "Invalid password", role: "admin" } });
          return NextResponse.json(
            { success: false, message: "Invalid email or password." },
            { status: 401 }
          );
        }

        auditLog("LOGIN_SUCCESS", { ip, userId: admin.id, email: normalizedEmail, details: { role: "admin" } });
        // #region agent log
        fetch('http://127.0.0.1:7281/ingest/53c91875-0450-4365-9e2e-62372b8ba563',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'6fde49'},body:JSON.stringify({sessionId:'6fde49',runId:'admin-access-denied-run1',hypothesisId:'H1',location:'api/auth/route.ts:POST:adminLogin',message:'Admin login success path hit',data:{emailDomain:normalizedEmail.split("@")[1]||null,roleIssued:'admin'},timestamp:Date.now()})}).catch(()=>{});
        // #endregion

        // Issue JWT tokens
        const accessToken = await createAccessToken({ userId: admin.id, role: "admin", email: admin.email });
        const refreshToken = await createRefreshToken({ userId: admin.id, role: "admin", email: admin.email });

        const response = NextResponse.json({
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

        // Add rate limit info to response headers (reuse initial check)
        response.headers.set("X-RateLimit-Remaining", String(rateCheck.remaining));
        response.headers.set("X-RateLimit-Reset", new Date(rateCheck.resetAt).toISOString());

        return setAuthCookies(response, accessToken, refreshToken);
      }

      // Then check customers table
      const { data: customer, error } = await adminDb
        .from("customers")
        .select("id, name, email, phone, dob, driver_license, created_at, role, password_hash")
        .eq("email", normalizedEmail)
        .maybeSingle();

      if (error || !customer) {
        auditLog("LOGIN_FAILED", { ip, email: normalizedEmail, details: { reason: "Account not found" } });
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
        auditLog("LOGIN_FAILED", { ip, email: normalizedEmail, details: { reason: "Invalid password", role: "customer" } });
        return NextResponse.json(
          { success: false, message: "Invalid email or password." },
          { status: 401 }
        );
      }

      auditLog("LOGIN_SUCCESS", { ip, userId: customer.id, email: normalizedEmail, details: { role: "customer" } });
      // #region agent log
      fetch('http://127.0.0.1:7281/ingest/53c91875-0450-4365-9e2e-62372b8ba563',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'6fde49'},body:JSON.stringify({sessionId:'6fde49',runId:'admin-access-denied-run1',hypothesisId:'H1',location:'api/auth/route.ts:POST:customerLogin',message:'Customer table login success path hit',data:{emailDomain:normalizedEmail.split("@")[1]||null,dbRole:customer.role||null,passwordHashPresent:Boolean(customer.password_hash)},timestamp:Date.now()})}).catch(()=>{});
      // #endregion

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

      // Issue JWT tokens
      // Validate role type before casting to prevent type errors
      const roleValue = customer.role || "customer";
      const customerRole = normalizeRole(roleValue);
      // #region agent log
      fetch('http://127.0.0.1:7281/ingest/53c91875-0450-4365-9e2e-62372b8ba563',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'6fde49'},body:JSON.stringify({sessionId:'6fde49',runId:'admin-access-denied-run1',hypothesisId:'H1',location:'api/auth/route.ts:POST:customerRoleNormalize',message:'Role normalization for non-admin login',data:{roleValue,normalizedRole:customerRole},timestamp:Date.now()})}).catch(()=>{});
      // #endregion
      const accessToken = await createAccessToken({ userId: customer.id, role: customerRole, email: customer.email });
      const refreshToken = await createRefreshToken({ userId: customer.id, role: customerRole, email: customer.email });

      const response = NextResponse.json({ data: mapped, success: true });

      // Add rate limit info to response headers (reuse initial check)
      response.headers.set("X-RateLimit-Remaining", String(rateCheck.remaining));
      response.headers.set("X-RateLimit-Reset", new Date(rateCheck.resetAt).toISOString());

      return setAuthCookies(response, accessToken, refreshToken);
    }

    if (action === "signup") {
      if (!body.name || !body.email || !body.password) {
        return NextResponse.json(
          { success: false, message: "Name, email, and password are required." },
          { status: 400 }
        );
      }

      // Validate email format BEFORE checking database existence
      // This prevents unnecessary database queries for obviously invalid emails
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(body.email)) {
        return NextResponse.json(
          { success: false, message: "Invalid email format" },
          { status: 400 }
        );
      }

      const pwCheck = validatePassword(body.password);
      if (!pwCheck.valid) {
        return NextResponse.json(
          { success: false, message: pwCheck.message, requirements: PASSWORD_REQUIREMENTS },
          { status: 400 }
        );
      }

      // Check if email already exists (single query instead of two)
      const { data: existing } = await adminDb
        .from("customers")
        .select("id, password_hash")
        .eq("email", body.email.toLowerCase().trim())
        .maybeSingle();

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
            .select("id, name, email, phone, dob, created_at, role")
            .eq("id", existing.id)
            .maybeSingle();

          if (updated) {
            // Validate role type before casting
            const roleValue = updated.role || "customer";
            const updatedRole = normalizeRole(roleValue);
            const accessToken = await createAccessToken({ userId: updated.id, role: updatedRole, email: updated.email });
            const refreshToken = await createRefreshToken({ userId: updated.id, role: updatedRole, email: updated.email });

            const response = NextResponse.json({
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
            return setAuthCookies(response, accessToken, refreshToken);
          }
        }

        return NextResponse.json(
          { success: false, message: "Email already registered. Please sign in instead." },
          { status: 409 }
        );
      }

      // Hash the password
      const passwordHash = await bcrypt.hash(body.password, 12);

      const newId = "c_" + crypto.randomUUID();
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
        .select("id, name, email, phone, dob, created_at, role")
        .maybeSingle();

      if (error) {
        logger.error("Signup error:", error);
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

      const accessToken = await createAccessToken({ userId: newCustomer.id, role: "customer", email: newCustomer.email });
      const refreshToken = await createRefreshToken({ userId: newCustomer.id, role: "customer", email: newCustomer.email });

      const response = NextResponse.json({ data: mapped, success: true }, { status: 201 });
      return setAuthCookies(response, accessToken, refreshToken);
    }

    return NextResponse.json(
      { success: false, message: "Invalid action" },
      { status: 400 }
    );
  } catch (err) {
    logger.error("Auth API error:", err);
    return NextResponse.json(
      { success: false, message: "Invalid request" },
      { status: 400 }
    );
  }
}

// PATCH: Update user profile
export async function PATCH(request: NextRequest) {
  try {
    // Verify authenticated user can only update their own profile
    const auth = await getAuthFromRequest(request);
    if (!auth) {
      return NextResponse.json(
        { success: false, message: "Authentication required." },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { id, name, phone, dob } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, message: "User ID is required." },
        { status: 400 }
      );
    }

    // Users can only update their own profile (admins can update anyone)
    if (auth.role !== "admin" && auth.sub !== id) {
      return NextResponse.json(
        { success: false, message: "You can only update your own profile." },
        { status: 403 }
      );
    }

    const adminDb = getServiceSupabase();

    // Check if it's an admin — table name is strictly whitelisted
    const { data: admin } = await adminDb.from("admins").select("id").eq("id", id).maybeSingle();
    const table: "admins" | "customers" = admin ? "admins" : "customers";

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
      logger.error("Profile update error:", error);
      return NextResponse.json(
        { success: false, message: "Failed to update profile." },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, message: "Profile updated." });
  } catch (err) {
    logger.error("Profile PATCH error:", err);
    return NextResponse.json(
      { success: false, message: "Invalid request." },
      { status: 400 }
    );
  }
}
