/**
 * Wrapper around fetch that adds admin authentication headers.
 * Reads the user ID from localStorage (set during login).
 */
export function adminFetch(url: string, options: RequestInit = {}): Promise<Response> {
  // Get admin ID from localStorage
  let adminId = "";
  if (typeof window !== "undefined") {
    try {
      const stored = localStorage.getItem("nga_user");
      if (stored) {
        const parsed = JSON.parse(stored);
        adminId = parsed.id || "";
      }
    } catch {
      // ignore parse errors
    }
  }

  const headers = new Headers(options.headers || {});
  if (adminId) {
    headers.set("x-admin-id", adminId);
  }

  return fetch(url, { ...options, headers });
}
