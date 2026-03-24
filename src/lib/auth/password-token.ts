/**
 * HMAC-based token generation and validation for the set-password flow.
 *
 * Tokens encode: email + timestamp, signed with JWT_SECRET.
 * They expire after TOKEN_EXPIRY_HOURS (default: 48h).
 */
import { createHmac } from "crypto";

const TOKEN_EXPIRY_HOURS = 48;

function getSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("JWT_SECRET must be set and at least 32 characters.");
  }
  return secret;
}

/** Generate a signed set-password token for the given email */
export function generatePasswordToken(email: string): string {
  const normalizedEmail = email.toLowerCase().trim();
  const timestamp = Date.now();
  const payload = `${normalizedEmail}:${timestamp}`;
  const hmac = createHmac("sha256", getSecret()).update(payload).digest("hex");
  // Encode as base64url: payload.hmac
  const token = Buffer.from(`${payload}:${hmac}`).toString("base64url");
  return token;
}

/** Validate a set-password token. Returns the email if valid, null if invalid/expired. */
export function validatePasswordToken(token: string): string | null {
  try {
    const decoded = Buffer.from(token, "base64url").toString("utf-8");
    const parts = decoded.split(":");
    if (parts.length < 3) return null;

    const hmac = parts.pop()!;
    const timestamp = parseInt(parts.pop()!, 10);
    const email = parts.join(":"); // handles emails with colons (rare but safe)

    if (!email || isNaN(timestamp)) return null;

    // Verify HMAC signature
    const expectedPayload = `${email}:${timestamp}`;
    const expectedHmac = createHmac("sha256", getSecret()).update(expectedPayload).digest("hex");

    // Timing-safe comparison
    if (hmac.length !== expectedHmac.length) return null;
    const a = Buffer.from(hmac, "hex");
    const b = Buffer.from(expectedHmac, "hex");
    if (a.length !== b.length) return null;

    let match = true;
    for (let i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) match = false; // constant-time comparison
    }
    if (!match) return null;

    // Check expiry
    const expiryMs = TOKEN_EXPIRY_HOURS * 60 * 60 * 1000;
    if (Date.now() - timestamp > expiryMs) return null;

    return email;
  } catch {
    return null;
  }
}
