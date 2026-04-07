/**
 * Wrapper around fetch for admin API calls.
 *
 * JWT tokens are stored in HTTP-only cookies and sent automatically.
 * This wrapper handles:
 *   - CSRF token (via shared getCsrfToken)
 *   - Automatic token refresh on 401 responses
 *   - Redirect to admin login if refresh fails
 *   - Legacy x-admin-id header (will be removed after full migration)
 */
import { getCsrfToken } from "./csrf-fetch";

const MAX_RETRIES = 1; // Maximum retry attempts to prevent infinite loops

export async function adminFetch(url: string, options: RequestInit = {}): Promise<Response> {
  // Validate URL to prevent open redirect/SSRF: must start with "/"
  if (!url.startsWith("/")) {
    throw new Error("Invalid URL: must be a relative path starting with /");
  }

  const headers = new Headers(options.headers || {});

  // Add timeout to fetch if not already provided
  let signal = options.signal;
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  let controller: AbortController | undefined;
  if (!signal) {
    controller = new AbortController();
    timeoutId = setTimeout(() => controller!.abort(), 15000); // 15 second timeout
    signal = controller.signal;
  }

  // Add CSRF token for state-changing requests
  const csrf = getCsrfToken();
  if (csrf) {
    headers.set("x-csrf-token", csrf);
  }

  // Legacy fallback: still send x-admin-id header during migration period
  if (typeof window !== "undefined") {
    try {
      const stored = localStorage.getItem("nga_user");
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (typeof parsed === "object" && parsed !== null && typeof parsed.id === "string" && parsed.id) {
            headers.set("x-admin-id", parsed.id);
          }
        } catch {
          // ignore malformed JSON
        }
      }
    } catch {
      // ignore localStorage errors
    }
  }

  let retryCount = 0;

  const executeRequest = async (): Promise<Response> => {
    // Ensure cookies are sent with the request
    const res = await fetch(url, {
      ...options,
      headers,
      credentials: "same-origin",
      signal,
    });

    // If 401 or 403 (CSRF), try refreshing the token (but only once)
    if ((res.status === 401 || res.status === 403) && retryCount < MAX_RETRIES && typeof window !== "undefined") {
      retryCount++;
      try {
        const refreshController = new AbortController();
        const refreshTimeout = setTimeout(() => refreshController.abort(), 5000);
        const refreshRes = await fetch("/api/auth/refresh", {
          method: "POST",
          credentials: "same-origin",
          signal: refreshController.signal,
        });
        clearTimeout(refreshTimeout);

        if (refreshRes.ok) {
          // Get updated CSRF token and retry the original request with fresh tokens
          const newCsrf = getCsrfToken();
          const retryHeaders = new Headers(options.headers || {});
          if (newCsrf) {
            retryHeaders.set("x-csrf-token", newCsrf);
          }
          const retryRes = await fetch(url, {
            ...options,
            headers: retryHeaders,
            credentials: "same-origin",
            signal,
          });
          return retryRes;
        }
      } catch {
        // Refresh failed — fall through to redirect
      }

      // Refresh failed — clear state and redirect to login
      if (res.status === 401) {
        localStorage.removeItem("nga_user");
        window.location.href = "/admin";
      }
    }

    return res;
  };

  try {
    return await executeRequest();
  } finally {
    // Clean up the timeout — do NOT abort the controller here,
    // as the caller still needs to read the response body (.json(), .text(), etc.)
    if (timeoutId) clearTimeout(timeoutId);
  }
}
