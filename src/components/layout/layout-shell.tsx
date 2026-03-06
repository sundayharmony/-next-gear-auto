"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { Header } from "./header";
import { Footer } from "./footer";

export function LayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdmin = pathname.startsWith("/admin");

  useEffect(() => {
    // #region agent log
    fetch("http://127.0.0.1:7294/ingest/53c91875-0450-4365-9e2e-62372b8ba563",{method:"POST",headers:{"Content-Type":"application/json","X-Debug-Session-Id":"27d820"},body:JSON.stringify({sessionId:"27d820",runId:"baseline",hypothesisId:"H1",location:"src/components/layout/layout-shell.tsx:13",message:"layout shell mounted",data:{pathname,isAdmin},timestamp:Date.now()})}).catch(()=>{});
    // #endregion

    const onError = (event: ErrorEvent) => {
      // #region agent log
      fetch("http://127.0.0.1:7294/ingest/53c91875-0450-4365-9e2e-62372b8ba563",{method:"POST",headers:{"Content-Type":"application/json","X-Debug-Session-Id":"27d820"},body:JSON.stringify({sessionId:"27d820",runId:"baseline",hypothesisId:"H1",location:"src/components/layout/layout-shell.tsx:18",message:"window error captured",data:{pathname,message:event.message,source:event.filename,line:event.lineno,column:event.colno},timestamp:Date.now()})}).catch(()=>{});
      // #endregion
    };

    const onUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason = typeof event.reason === "string" ? event.reason : (event.reason?.message || "unknown");
      // #region agent log
      fetch("http://127.0.0.1:7294/ingest/53c91875-0450-4365-9e2e-62372b8ba563",{method:"POST",headers:{"Content-Type":"application/json","X-Debug-Session-Id":"27d820"},body:JSON.stringify({sessionId:"27d820",runId:"baseline",hypothesisId:"H1",location:"src/components/layout/layout-shell.tsx:24",message:"unhandled promise rejection",data:{pathname,reason},timestamp:Date.now()})}).catch(()=>{});
      // #endregion
    };

    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onUnhandledRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onUnhandledRejection);
    };
  }, [pathname, isAdmin]);

  if (isAdmin) {
    return <>{children}</>;
  }

  return (
    <>
      <Header />
      <div className="flex-1">{children}</div>
      <Footer />
    </>
  );
}
