"use client";

import React, { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { XCircle, ArrowLeft, RefreshCw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageContainer } from "@/components/layout/page-container";

function CancelContent() {
  const searchParams = useSearchParams();
  const bookingId = searchParams.get("booking_id");

  return (
    <>
      <section className="bg-gradient-to-br from-gray-700 to-gray-900 py-16 text-white">
        <div className="mx-auto max-w-5xl px-4 text-center">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-white/20">
            <XCircle className="h-10 w-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold sm:text-4xl">Payment Not Completed</h1>
          <p className="mt-2 text-gray-300">
            Your payment session was not completed. No charges have been made.
          </p>
        </div>
      </section>

      <PageContainer className="py-8">
        <div className="mx-auto max-w-2xl">
          <Card>
            <CardContent className="p-6 text-center">
              <p className="text-gray-600 mb-2">
                Your payment session was not completed. Your booking remains in pending status and will expire automatically if not paid within 24 hours.
              </p>
              {bookingId && (
                <p className="text-sm text-gray-400 mb-6">
                  Booking Reference: {bookingId}
                </p>
              )}

              <div className="rounded-lg bg-blue-50 border border-blue-200 p-4 mb-6 text-left">
                <p className="text-sm text-blue-800">
                  <strong>What happens next:</strong> You can return to complete payment for this booking at any time. If you don't complete payment within 24 hours, your booking will be automatically cancelled.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link href={bookingId ? `/booking?retry=${bookingId}` : "/booking"}>
                  <Button className="w-full sm:w-auto">
                    <RefreshCw className="h-4 w-4 mr-1" /> Retry Payment
                  </Button>
                </Link>
                <Link href="/fleet">
                  <Button variant="outline" className="w-full sm:w-auto">
                    <ArrowLeft className="h-4 w-4 mr-1" /> Back to Fleet
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </PageContainer>
    </>
  );
}

export default function BookingCancelPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-8 w-8 text-gray-600 animate-spin" />
        </div>
      }
    >
      <CancelContent />
    </Suspense>
  );
}
