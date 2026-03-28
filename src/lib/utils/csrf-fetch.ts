/**
 * Lightweight fetch wrapper that includes the CSRF token header.
 *
 * Use this for ALL client-side mutating requests (POST, PUT, PATCH, DELETE).
 * The proxy (src/proxy.ts) validates the double-submit CSRF token on all
 * mutating /api/* calls. Without this header, requests will be rejected with 403.
 *
 * For admin pages, use `adminFetch` instead (which adds CSRF + JWT refresh).
 */

/** Read the CSRF token from the nga_csrf cookie */
export function getCsrfToken(): string {
  if (typeof document === "undefined") return "";
  const match = document.cookie.match(/(?:^|;\s*)nga_csrf=([^;]*)/);
  if (!match || !match[1]) return "";
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return "";
  }
}

/** Fetch wrapper that automatically includes the CSRF token header */
export async function csrfFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const headers = new Headers(options.headers || {});

  const csrf = getCsrfToken();
  if (csrf) {
    headers.set("x-csrf-token", csrf);
  }

  return fetch(url, {
    ...options,
    headers,
    credentials: "same-origin",
  });
}
