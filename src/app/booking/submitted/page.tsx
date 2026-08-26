"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Clock, CheckCircle, Mail, ArrowRight } from "lucide-react";

function BookingSubmittedContent() {
  const searchParams = useSearchParams();
  const bookingId = searchParams.get("booking_id") || "";

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-pulse text-gray-400">Loading...</div>
      </div>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 via-white to-orange-50 px-4 py-12">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="mb-6">
            <div className="w-20 h-20 mx-auto bg-amber-100 rounded-full flex items-center justify-center">
              <Clock className="w-10 h-10 text-amber-600" />
            </div>
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Booking Under Review
          </h1>

          {bookingId && (
            <p className="text-sm text-gray-500 mb-4 font-mono bg-gray-50 px-3 py-1.5 rounded-lg inline-block">
              #{bookingId}
            </p>
          )}

          <p className="text-gray-600 mb-6 leading-relaxed">
            Thank you for your reservation request! Our team is reviewing your booking 
            and will send you a payment link once approved.
          </p>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
            <h3 className="font-semibold text-amber-800 mb-2 flex items-center justify-center gap-2">
              <Mail className="w-4 h-4" />
              What happens next?
            </h3>
            <ul className="text-sm text-amber-700 space-y-2 text-left">
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 mt-0.5 shrink-0 text-amber-500" />
                <span>We'll review your booking request</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 mt-0.5 shrink-0 text-amber-500" />
                <span>Once approved, you'll receive a payment link via email</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 mt-0.5 shrink-0 text-amber-500" />
                <span>Complete your payment to confirm the reservation</span>
              </li>
            </ul>
          </div>

          <p className="text-sm text-gray-500 mb-6">
            This usually takes a few hours during business hours. 
            Check your email for updates!
          </p>

          <div className="flex flex-col gap-3">
            <Link
              href="/"
              className="inline-flex items-center justify-center gap-2 w-full bg-gray-900 hover:bg-gray-800 text-white font-medium py-3 px-6 rounded-xl transition-colors"
            >
              Return to Homepage
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/account"
              className="inline-flex items-center justify-center gap-2 w-full bg-white hover:bg-gray-50 text-gray-700 font-medium py-3 px-6 rounded-xl border border-gray-200 transition-colors"
            >
              View My Account
            </Link>
          </div>
        </div>

        <p className="mt-6 text-center text-sm text-gray-500">
          Questions? Contact us at{" "}
          <a
            href="mailto:contact@rentnextgearauto.com"
            className="text-amber-600 hover:underline font-medium"
          >
            contact@rentnextgearauto.com
          </a>
        </p>
      </div>
    </main>
  );
}

export default function BookingSubmittedPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="animate-pulse text-gray-400">Loading...</div>
        </div>
      }
    >
      <BookingSubmittedContent />
    </Suspense>
  );
}
