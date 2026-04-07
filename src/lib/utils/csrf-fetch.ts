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
    const decoded = decodeURIComponent(match[1]);
    // Validate token format: alphanumeric, not too long (max 256 chars)
    if (!/^[a-zA-Z0-9\-_.]+$/.test(decoded) || decoded.length > 256) {
      return "";
    }
    return decoded;
  } catch {
    return "";
  }
}

/** Fetch wrapper that automatically includes the CSRF token header */
export async function csrfFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const headers = new Headers(options.headers || {});

  let csrf = getCsrfToken();
  if (csrf) {
    headers.set("x-csrf-token", csrf);
  } else {
    console.warn("CSRF token not found in cookies");
  }

  let response = await fetch(url, {
    ...options,
    headers,
    credentials: "same-origin",
  });

  // Retry with refreshed CSRF token on 403 (token might have expired)
  if (response.status === 403) {
    const newCsrf = getCsrfToken();
    if (newCsrf && newCsrf !== csrf) {
      // Token was refreshed, retry the request
      const retryHeaders = new Headers(options.headers || {});
      retryHeaders.set("x-csrf-token", newCsrf);
      response = await fetch(url, {
        ...options,
        headers: retryHeaders,
        credentials: "same-origin",
      });
    }
  }

  return response;
}
