"use client";

import React, { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { XCircle, ArrowLeft, RefreshCw } from "lucide-react";
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
          <h1 className="text-3xl font-bold sm:text-4xl">Payment Cancelled</h1>
          <p className="mt-2 text-gray-300">
            Your payment was not completed. No charges have been made.
          </p>
        </div>
      </section>

      <PageContainer className="py-8">
        <div className="mx-auto max-w-2xl">
          <Card>
            <CardContent className="p-6 text-center">
              <p className="text-gray-600 mb-2">
                Your booking has been cancelled and will not be charged.
              </p>
              {bookingId && (
                <p className="text-sm text-gray-400 mb-6">
                  Reference: {bookingId}
                </p>
              )}

              <div className="rounded-lg bg-amber-50 border border-amber-200 p-4 mb-6 text-left">
                <p className="text-sm text-amber-800">
                  <strong>Next steps:</strong> To start a new booking, begin fresh from the fleet selection.
                  Your previous booking details have been cleared.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link href="/booking">
                  <Button className="w-full sm:w-auto">
                    <RefreshCw className="h-4 w-4 mr-1" /> Start New Booking
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
          <div className="animate-spin h-8 w-8 border-4 border-gray-600 border-t-transparent rounded-full" />
        </div>
      }
    >
      <CancelContent />
    </Suspense>
  );
}
