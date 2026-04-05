/**
 * JWT authentication utilities using HMAC-SHA256 (HS256).
 *
 * Tokens are issued on login and stored in HTTP-only, Secure, SameSite=Strict cookies.
 * This replaces the previous header-based admin ID authentication.
 *
 * Environment variable required:
 *   JWT_SECRET — at least 32 characters, set in .env.local and Vercel env vars
 */

import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import { NextRequest, NextResponse } from "next/server";

// ─── Types ───────────────────────────────────────────────────────────

export interface TokenPayload extends JWTPayload {
  sub: string;       // user ID
  role: "admin" | "customer";
  email: string;
}

// ─── Config ──────────────────────────────────────────────────────────

const COOKIE_NAME = "nga_token";
const TOKEN_EXPIRY = "1h";           // access token lifetime
const REFRESH_COOKIE = "nga_refresh";
const REFRESH_EXPIRY = "48h";        // refresh token lifetime

// Cache the encoded secret to avoid re-encoding and re-validating entropy on every call
let _cachedSecret: Uint8Array | null = null;
let _cachedSecretRaw: string | null = null;

function getSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("JWT_SECRET must be set and at least 32 characters.");
  }
  // Return cached value if the env var hasn't changed
  if (_cachedSecret && _cachedSecretRaw === secret) {
    return _cachedSecret;
  }
  // Entropy validation: ensure the secret has sufficient character variety
  const hasLower = /[a-z]/.test(secret);
  const hasUpper = /[A-Z]/.test(secret);
  const hasDigits = /\d/.test(secret);
  const hasSpecial = /[^a-zA-Z0-9]/.test(secret);
  const entropyScore = Number(hasLower) + Number(hasUpper) + Number(hasDigits) + Number(hasSpecial);
  if (entropyScore < 3) {
    throw new Error("JWT_SECRET lacks sufficient entropy. Use at least 3 of: lowercase, uppercase, digits, special characters.");
  }
  _cachedSecret = new TextEncoder().encode(secret);
  _cachedSecretRaw = secret;
  return _cachedSecret;
}

// ─── Token Creation ──────────────────────────────────────────────────

export async function createAccessToken(payload: {
  userId: string;
  role: "admin" | "customer";
  email: string;
}): Promise<string> {
  return new SignJWT({
    sub: payload.userId,
    role: payload.role,
    email: payload.email,
  } satisfies TokenPayload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(TOKEN_EXPIRY)
    .setIssuer("nextgearauto")
    .sign(getSecret());
}

export async function createRefreshToken(payload: {
  userId: string;
  role: "admin" | "customer";
  email: string;
}): Promise<string> {
  return new SignJWT({
    sub: payload.userId,
    role: payload.role,
    email: payload.email,
    type: "refresh",
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(REFRESH_EXPIRY)
    .setIssuer("nextgearauto")
    .sign(getSecret());
}

// ─── Token Verification ─────────────────────────────────────────────

export async function verifyToken(token: string): Promise<TokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret(), {
      issuer: "nextgearauto",
    });
    return payload as TokenPayload;
  } catch {
    return null;
  }
}

// ─── Cookie Helpers ──────────────────────────────────────────────────

/** Set auth cookies on a NextResponse */
export function setAuthCookies(
  response: NextResponse,
  accessToken: string,
  refreshToken: string,
): NextResponse {
  // Access token: short-lived, HTTP-only
  response.cookies.set(COOKIE_NAME, accessToken, {
    httpOnly: true,
    secure: true, // Always secure, even in dev (localhost works with Secure cookies)
    sameSite: "strict",
    path: "/",
    maxAge: 60 * 60, // 1 hour in seconds
  });

  // Refresh token: longer-lived, HTTP-only
  response.cookies.set(REFRESH_COOKIE, refreshToken, {
    httpOnly: true,
    secure: true, // Always secure, even in dev (localhost works with Secure cookies)
    sameSite: "strict",
    path: "/",
    maxAge: 60 * 60 * 48, // 48 hours in seconds
  });

  return response;
}

/** Clear auth cookies (logout) */
export function clearAuthCookies(response: NextResponse): NextResponse {
  response.cookies.set(COOKIE_NAME, "", { path: "/", maxAge: 0 });
  response.cookies.set(REFRESH_COOKIE, "", { path: "/", maxAge: 0 });
  return response;
}

/** Extract and verify the JWT from an incoming request's cookies or Authorization header.
 *  Also supports the legacy x-admin-id header for backward compatibility during migration. */
export async function getAuthFromRequest(
  req: NextRequest
): Promise<TokenPayload | null> {
  // 1. Try cookie-based JWT (preferred)
  const cookieToken = req.cookies.get(COOKIE_NAME)?.value;
  if (cookieToken) {
    const payload = await verifyToken(cookieToken);
    if (payload) return payload;
  }

  // 2. Try Authorization: Bearer header
  const authHeader = req.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const payload = await verifyToken(authHeader.slice(7));
    if (payload) return payload;
  }

  return null;
}

export { COOKIE_NAME, REFRESH_COOKIE };
