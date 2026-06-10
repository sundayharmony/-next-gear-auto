/**
 * HMAC-signed tokens for rental agreement PDF access when a booking has no
 * customer email on file. Tokens encode bookingId + optional email + expiry.
 */
import { createHmac, timingSafeEqual, randomBytes } from "crypto";

const TOKEN_EXPIRY_HOURS = 72;

function getSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("JWT_SECRET must be set and at least 32 characters.");
  }
  return secret;
}

/** Generate a signed agreement access token for a booking. */
export function generateAgreementAccessToken(bookingId: string, email?: string): string {
  const normalizedEmail = email ? email.toLowerCase().trim() : "";
  const timestamp = Date.now();
  const randomNonce = randomBytes(16).toString("hex");
  const payload = `${bookingId}:${normalizedEmail}:${timestamp}:${randomNonce}`;
  const hmac = createHmac("sha256", getSecret()).update(payload).digest("hex");
  return Buffer.from(`${payload}:${hmac}`).toString("base64url");
}

export interface AgreementAccessClaims {
  bookingId: string;
  email?: string;
}

/** Validate token; returns claims when valid and not expired. */
export function validateAgreementAccessToken(token: string): AgreementAccessClaims | null {
  try {
    const decoded = Buffer.from(token, "base64url").toString("utf-8");
    if (!decoded) return null;
    const parts = decoded.split(":");
    if (parts.length < 5) return null;

    const hmac = parts.pop();
    const nonce = parts.pop();
    const timestampStr = parts.pop();
    const email = parts.pop() ?? "";
    const bookingId = parts.join(":");
    if (!hmac || !nonce || !timestampStr || !bookingId) return null;

    const timestamp = parseInt(timestampStr, 10);
    if (Number.isNaN(timestamp)) return null;

    const expectedPayload = `${bookingId}:${email}:${timestamp}:${nonce}`;
    const expectedHmac = createHmac("sha256", getSecret()).update(expectedPayload).digest("hex");
    if (hmac.length !== expectedHmac.length) return null;
    if (!/^[0-9a-f]+$/i.test(hmac)) return null;
    const a = Buffer.from(hmac, "hex");
    const b = Buffer.from(expectedHmac, "hex");
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

    const expiryMs = TOKEN_EXPIRY_HOURS * 60 * 60 * 1000;
    if (Date.now() - timestamp > expiryMs) return null;

    return {
      bookingId,
      email: email || undefined,
    };
  } catch {
    return null;
  }
}
