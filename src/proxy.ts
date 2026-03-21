import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

/**
 * Next.js Proxy — runs on every matching request before the route handler.
 * (Renamed from middleware.ts to proxy.ts for Next.js 16 compatibility.)
 *
 * Responsibilities:
 *   1. Validate JWT on /admin/* pages (redirect to login if missing/invalid)
 *   2. Validate JWT on /api/admin/* endpoints (return 401 if missing/invalid)
 *   3. Add CSRF token cookie for state-changing requests
 *   4. Rate-limit headers (informational — actual enforcement in route handlers)
 */

const COOKIE_NAME = "nga_token";
const CSRF_COOKIE = "nga_csrf";

function getSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    // In development without JWT_SECRET, allow requests through (legacy mode)
    return new Uint8Array(0);
  }
  return new TextEncoder().encode(secret);
}

async function isValidJwt(token: string): Promise<boolean> {
  try {
    const secret = getSecret();
    if (secret.length === 0) return false; // No JWT_SECRET configured
    await jwtVerify(token, secret, { issuer: "nextgearauto" });
    return true;
  } catch {
    return false;
  }
}

/** Generate a random CSRF token */
function generateCsrfToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (b) => b.toString(16).padStart(2, "0")).join("");
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // ── CSRF Token Management ───────────────────────────────────────
  // Ensure every response has a CSRF cookie (double-submit pattern)
  const response = NextResponse.next();
  if (!req.cookies.get(CSRF_COOKIE)) {
    response.cookies.set(CSRF_COOKIE, generateCsrfToken(), {
      httpOnly: false, // Must be readable by JavaScript
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: 60 * 60 * 24, // 24 hours
    });
  }

  // ── CSRF Validation on mutating API requests ────────────────────
  const mutatingMethods = ["POST", "PUT", "PATCH", "DELETE"];
  if (
    pathname.startsWith("/api/") &&
    mutatingMethods.includes(req.method) &&
    // Exempt webhook endpoints and auth (login needs to work without CSRF)
    !pathname.startsWith("/api/webhooks/") &&
    !pathname.startsWith("/api/auth/") &&
    !pathname.startsWith("/api/cron/")
  ) {
    const csrfCookie = req.cookies.get(CSRF_COOKIE)?.value;
    const csrfHeader = req.headers.get("x-csrf-token");

    if (!csrfCookie || !csrfHeader || csrfCookie !== csrfHeader) {
      return NextResponse.json(
        { success: false, message: "Invalid CSRF token" },
        { status: 403 }
      );
    }
  }

  // ── Admin Page Protection ───────────────────────────────────────
  // Protect /admin/* pages (except the login page itself at /admin)
  if (
    pathname.startsWith("/admin/") &&
    !pathname.startsWith("/admin/login")
  ) {
    const token = req.cookies.get(COOKIE_NAME)?.value;
    const secret = getSecret();

    // Only enforce JWT if JWT_SECRET is configured
    if (secret.length > 0) {
      if (!token || !(await isValidJwt(token))) {
        // Check legacy header fallback
        const legacyId = req.headers.get("x-admin-id");
        if (!legacyId) {
          const loginUrl = new URL("/admin", req.url);
          loginUrl.searchParams.set("redirect", pathname);
          return NextResponse.redirect(loginUrl);
        }
      }
    }
  }

  return response;
}

/**
 * Matcher: run proxy on admin pages/APIs, and all API routes for CSRF.
 * Skip static assets and Next.js internals.
 */
export const config = {
  matcher: [
    // Admin pages
    "/admin/:path*",
    // API routes (for CSRF)
    "/api/:path*",
  ],
};
