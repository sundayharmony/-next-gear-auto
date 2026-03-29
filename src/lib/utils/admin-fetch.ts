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

export async function adminFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const headers = new Headers(options.headers || {});

  // Add timeout to fetch if not already provided
  let signal = options.signal;
  if (!signal) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout
    signal = controller.signal;
    // Clean up timeout on completion
    signal.addEventListener("abort", () => clearTimeout(timeoutId));
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

  // Ensure cookies are sent with the request
  const res = await fetch(url, {
    ...options,
    headers,
    credentials: "same-origin",
    signal,
  });

  // If 401, try refreshing the token
  if (res.status === 401 && typeof window !== "undefined") {
    try {
      const refreshRes = await fetch("/api/auth/refresh", {
        method: "POST",
        credentials: "same-origin",
      });

      if (refreshRes.ok) {
        // Retry the original request with fresh tokens
        return fetch(url, {
          ...options,
          headers,
          credentials: "same-origin",
          signal,
        });
      }
    } catch {
      // Refresh failed — fall through to redirect
    }

    // Refresh failed — clear state and redirect to login
    localStorage.removeItem("nga_user");
    window.location.href = "/admin";
  }

  return res;
}
