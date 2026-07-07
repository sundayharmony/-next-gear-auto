/**
 * Canonical site origin and OAuth cookie options for Google Calendar connect.
 * Production uses NEXT_PUBLIC_SITE_URL so connect + callback share one redirect URI
 * and cookies survive www ↔ non-www redirects at the edge.
 */
export function getCanonicalSiteOrigin(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim() || "http://localhost:3000";
  return new URL(raw.replace(/\/$/, "")).origin;
}

export function resolveOAuthSiteOrigin(requestOrigin?: string): string {
  if (process.env.NODE_ENV === "production") {
    return getCanonicalSiteOrigin();
  }
  return (requestOrigin || getCanonicalSiteOrigin()).replace(/\/$/, "");
}

export function getOAuthCookieOptions() {
  const isProd = process.env.NODE_ENV === "production";
  const base = {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax" as const,
    maxAge: 600,
    path: "/",
  };

  if (!isProd) return base;

  try {
    const host = new URL(getCanonicalSiteOrigin()).hostname;
    if (host === "rentnextgearauto.com" || host.endsWith(".rentnextgearauto.com")) {
      return { ...base, domain: ".rentnextgearauto.com" };
    }
  } catch {
    // Fall through with host-only cookies.
  }

  return base;
}

export const GCAL_OAUTH_FLASH_COOKIE = "gcal_connect_flash";
