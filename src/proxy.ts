import { NextRequest, NextResponse } from "next/server";
import { jwtVerify, SignJWT, type JWTPayload } from "jose";
import { isAdminRole, tokenHasOwnerAccess, tokenHasStaffAccess } from "@/lib/auth/roles";
import { logger } from "@/lib/utils/logger";
import {
  buildContentSecurityPolicy,
  shouldApplyDocumentCsp,
} from "@/lib/security/build-csp";

/**
 * Next.js Proxy — runs on every matching request before the route handler.
 * (Renamed from middleware.ts to proxy.ts for Next.js 16 compatibility.)
 *
 * Responsibilities:
 *   1. Nonce-based Content-Security-Policy on HTML/document routes
 *   2. Validate JWT on /admin/* pages (redirect to login if missing/invalid)
 *   3. Auto-refresh expired access tokens using the refresh token
 *   4. Add CSRF token cookie for state-changing requests
 */

const COOKIE_NAME = "nga_token";
const REFRESH_COOKIE = "nga_refresh";
const CSRF_COOKIE = "nga_csrf";

function getSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    return new Uint8Array(0);
  }
  return new TextEncoder().encode(secret);
}

async function isValidJwt(token: string): Promise<boolean> {
  try {
    const secret = getSecret();
    if (secret.length === 0) return false;
    await jwtVerify(token, secret, { issuer: "nextgearauto" });
    return true;
  } catch {
    return false;
  }
}

async function getJwtPayload(token: string): Promise<JWTPayload | null> {
  try {
    const secret = getSecret();
    if (secret.length === 0) return null;
    const { payload } = await jwtVerify(token, secret, { issuer: "nextgearauto" });
    return payload;
  } catch {
    return null;
  }
}

/** Try to refresh an expired access token using the refresh token */
async function tryRefreshToken(refreshToken: string): Promise<string | null> {
  try {
    const secret = getSecret();
    if (secret.length === 0) return null;
    const { payload } = await jwtVerify(refreshToken, secret, { issuer: "nextgearauto" });
    if (!payload.sub || !payload.role || !payload.email) return null;

    const newAccessToken = await new SignJWT({
      sub: payload.sub,
      role: payload.role,
      email: payload.email,
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("1h")
      .setIssuer("nextgearauto")
      .sign(secret);

    return newAccessToken;
  } catch {
    return null;
  }
}

function generateCsrfToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (b) => b.toString(16).padStart(2, "0")).join("");
}

function generateNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

function createNextResponse(req: NextRequest): NextResponse {
  const { pathname } = req.nextUrl;
  const applyCsp = shouldApplyDocumentCsp(pathname);

  if (!applyCsp) {
    return NextResponse.next();
  }

  const nonce = generateNonce();
  const isDev = process.env.NODE_ENV === "development";
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-nonce", nonce);

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });
  response.headers.set(
    "Content-Security-Policy",
    buildContentSecurityPolicy(nonce, isDev)
  );
  return response;
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const response = createNextResponse(req);

  if (!req.cookies.get(CSRF_COOKIE)) {
    response.cookies.set(CSRF_COOKIE, generateCsrfToken(), {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: 60 * 60 * 24,
    });
  }

  const mutatingMethods = ["POST", "PUT", "PATCH", "DELETE"];
  if (
    pathname.startsWith("/api/") &&
    mutatingMethods.includes(req.method) &&
    !pathname.startsWith("/api/webhooks/") &&
    !(pathname.startsWith("/api/auth") && req.method === "POST") &&
    !pathname.startsWith("/api/cron/")
  ) {
    const csrfCookie = req.cookies.get(CSRF_COOKIE)?.value;
    const csrfHeader = req.headers.get("x-csrf-token");

    if (!csrfCookie || !csrfHeader || csrfCookie !== csrfHeader) {
      logger.warn("CSRF_REJECTED", { path: pathname, method: req.method });
      return NextResponse.json(
        { success: false, message: "Invalid CSRF token" },
        { status: 403 }
      );
    }
  }

  const isAdminRoute =
    pathname.startsWith("/admin/") && !pathname.startsWith("/admin/login");
  const isOwnerRoute = pathname.startsWith("/owner");
  const isManagerRoute = pathname.startsWith("/manager");
  if (isAdminRoute || isManagerRoute || isOwnerRoute) {
    const token = req.cookies.get(COOKIE_NAME)?.value;
    const secret = getSecret();

    if (secret.length === 0) {
      logger.error("JWT_SECRET missing or too short — panel routes denied");
      return NextResponse.json(
        { success: false, message: "Authentication service unavailable" },
        { status: 503 }
      );
    }

    let authenticated = token ? await isValidJwt(token) : false;
    let effectiveToken = token ?? null;

    if (!authenticated) {
      const refreshToken = req.cookies.get(REFRESH_COOKIE)?.value;
      if (refreshToken) {
        const newAccessToken = await tryRefreshToken(refreshToken);
        if (newAccessToken) {
          response.cookies.set(COOKIE_NAME, newAccessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
            path: "/",
            maxAge: 60 * 60,
          });
          authenticated = true;
          effectiveToken = newAccessToken;
        }
      }
    }

    const payload = effectiveToken ? await getJwtPayload(effectiveToken) : null;

    if (authenticated && isAdminRoute) {
      const role = payload?.role;
      if (!payload || !isAdminRole(role as Parameters<typeof isAdminRole>[0])) {
        const loginUrl = new URL("/admin", req.url);
        loginUrl.searchParams.set("redirect", pathname + req.nextUrl.search);
        return NextResponse.redirect(loginUrl);
      }
    }

    if (authenticated && isManagerRoute) {
      if (!payload || !tokenHasStaffAccess(payload as { role?: unknown; roles?: unknown })) {
        const loginUrl = new URL("/admin", req.url);
        loginUrl.searchParams.set("redirect", pathname + req.nextUrl.search);
        return NextResponse.redirect(loginUrl);
      }
    }

    if (authenticated && isOwnerRoute) {
      if (!payload || !tokenHasOwnerAccess(payload as { role?: unknown; roles?: unknown })) {
        const loginUrl = new URL("/login", req.url);
        loginUrl.searchParams.set("redirect", pathname + req.nextUrl.search);
        return NextResponse.redirect(loginUrl);
      }
    }

    if (!authenticated) {
      const loginUrl = new URL(isOwnerRoute ? "/login" : "/admin", req.url);
      loginUrl.searchParams.set("redirect", pathname + req.nextUrl.search);
      return NextResponse.redirect(loginUrl);
    }
  }

  return response;
}

export const config = {
  matcher: [
    {
      source:
        "/((?!_next/static|_next/image|favicon.ico|icon.png|apple-icon.png|images|robots.txt|sitemap.xml|manifest.json).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
