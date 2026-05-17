"use client";

import React, { Suspense, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { PageContainer } from "@/components/layout/page-container";
import { useAuth } from "@/lib/context/auth-context";
import { isStaffRole, type AppRole } from "@/lib/auth/roles";

function StaffLandingInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isAuthenticated, isLoading } = useAuth();
  const nextPath = searchParams.get("next");

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated || !user?.role) {
      const q = new URLSearchParams();
      q.set("redirect", "/staff");
      if (nextPath) q.set("next", nextPath);
      router.replace(`/login?${q.toString()}`);
      return;
    }
    const role = user.role as AppRole;
    if (!isStaffRole(role)) {
      router.replace("/login?staff=1");
      return;
    }
    if (nextPath && (nextPath.startsWith("/admin") || nextPath.startsWith("/manager"))) {
      router.replace(nextPath);
      return;
    }
    router.replace(role === "admin" ? "/admin" : "/manager");
  }, [isLoading, isAuthenticated, user, router, nextPath]);

  return (
    <PageContainer className="py-16 text-center">
      <Loader2 className="mx-auto h-10 w-10 animate-spin text-purple-600 mb-4" aria-hidden />
      <p className="text-gray-600">Opening staff panel…</p>
      <p className="mt-4 text-sm text-gray-500">
        <Link href="/login" className="text-purple-600 hover:underline">Sign in</Link>
        {" · "}
        <Link href="/" className="text-purple-600 hover:underline">Home</Link>
      </p>
    </PageContainer>
  );
}

export default function StaffLandingPage() {
  return (
    <Suspense
      fallback={
        <PageContainer className="py-16 text-center">
          <Loader2 className="mx-auto h-10 w-10 animate-spin text-purple-600 mb-4" />
          <p className="text-gray-600">Loading…</p>
        </PageContainer>
      }
    >
      <StaffLandingInner />
    </Suspense>
  );
}
