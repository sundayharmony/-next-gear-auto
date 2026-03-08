/**
 * Wrapper around fetch that adds admin authentication headers.
 * Reads the user ID from localStorage (set during login).
 * Redirects to admin login if authentication fails.
 */
export async function adminFetch(url: string, options: RequestInit = {}): Promise<Response> {
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

  const res = await fetch(url, { ...options, headers });

  // If unauthorized, redirect to admin login
  if (res.status === 401 && typeof window !== "undefined") {
    localStorage.removeItem("nga_user");
    window.location.href = "/admin";
  }

  return res;
}
