"use client";

import React from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCw, Phone, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CONTACT_INFO } from "@/lib/constants";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="text-center max-w-lg">
        {/* Error Icon */}
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-red-100">
          <AlertTriangle className="h-10 w-10 text-red-500" />
        </div>

        <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">
          Something Went Wrong
        </h1>
        <p className="mt-3 text-gray-500">
          We hit an unexpected bump in the road. Don&apos;t worry — your booking
          data is safe. Please try again or contact our support team.
        </p>

        {error.digest && (
          <p className="mt-2 text-xs text-gray-400">
            Error ID: {error.digest}
          </p>
        )}

        {/* Actions */}
        <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Button onClick={reset} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Try Again
          </Button>
          <Link href="/">
            <Button variant="outline" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Home
            </Button>
          </Link>
        </div>

        {/* Contact Support */}
        <div className="mt-8 rounded-xl border border-gray-200 bg-gray-50 p-4">
          <p className="text-sm text-gray-600">
            Need help? Contact our support team:
          </p>
          <a
            href={`tel:${CONTACT_INFO.phone.replace(/[^\d+]/g, "")}`}
            className="mt-2 inline-flex items-center gap-2 text-sm font-medium text-purple-600 hover:text-purple-700 transition-colors"
          >
            <Phone className="h-4 w-4" />
            {CONTACT_INFO.phone}
          </a>
        </div>
      </div>
    </div>
  );
}
