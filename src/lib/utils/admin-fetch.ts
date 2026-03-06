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

  // #region agent log
  fetch("http://127.0.0.1:7294/ingest/53c91875-0450-4365-9e2e-62372b8ba563",{method:"POST",headers:{"Content-Type":"application/json","X-Debug-Session-Id":"27d820"},body:JSON.stringify({sessionId:"27d820",runId:"baseline",hypothesisId:"H2",location:"src/lib/utils/admin-fetch.ts:26",message:"admin fetch request",data:{url,method:options.method||"GET",hasAdminId:Boolean(adminId)},timestamp:Date.now()})}).catch(()=>{});
  // #endregion
  const res = await fetch(url, { ...options, headers });

  // #region agent log
  fetch("http://127.0.0.1:7294/ingest/53c91875-0450-4365-9e2e-62372b8ba563",{method:"POST",headers:{"Content-Type":"application/json","X-Debug-Session-Id":"27d820"},body:JSON.stringify({sessionId:"27d820",runId:"baseline",hypothesisId:"H2",location:"src/lib/utils/admin-fetch.ts:30",message:"admin fetch response",data:{url,status:res.status},timestamp:Date.now()})}).catch(()=>{});
  // #endregion

  // If unauthorized, redirect to admin login
  if (res.status === 401 && typeof window !== "undefined") {
    // #region agent log
    fetch("http://127.0.0.1:7294/ingest/53c91875-0450-4365-9e2e-62372b8ba563",{method:"POST",headers:{"Content-Type":"application/json","X-Debug-Session-Id":"27d820"},body:JSON.stringify({sessionId:"27d820",runId:"baseline",hypothesisId:"H2",location:"src/lib/utils/admin-fetch.ts:35",message:"admin fetch unauthorized redirect",data:{url},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
    localStorage.removeItem("nga_user");
    window.location.href = "/admin";
  }

  return res;
}
