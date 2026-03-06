"use client";

import React, { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Check, Car, Calendar, CreditCard, ArrowRight, FileCheck, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageContainer } from "@/components/layout/page-container";

const formatTime = (t?: string) => {
  if (!t) return "";
  const [h, m] = t.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${ampm}`;
};

interface BookingDetails {
  id: string;
  vehicle_name: string;
  pickup_date: string;
  return_date: string;
  pickup_time?: string;
  return_time?: string;
  total_price: number;
  deposit: number;
  customer_name: string;
}

function SuccessContent() {
  const searchParams = useSearchParams();
  const bookingId = searchParams.get("booking_id");
  const sessionId = searchParams.get("session_id");
  const [booking, setBooking] = useState<BookingDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [agreementStatus, setAgreementStatus] = useState<"idle" | "signing" | "signed" | "error">("idle");

  // Submit agreement signatures that were saved to localStorage before Stripe redirect
  useEffect(() => {
    async function submitAgreementSignatures() {
      if (!bookingId) return;

      const storageKey = `nga_agreement_sigs_${bookingId}`;
      try {
        const savedSigs = localStorage.getItem(storageKey);
        if (!savedSigs) return;

        const signatures = JSON.parse(savedSigs);
        // Filter out null/empty signatures
        const validSigs: Record<string, string> = {};
        for (const [key, val] of Object.entries(signatures)) {
          if (val && typeof val === "string") validSigs[key] = val;
        }

        if (Object.keys(validSigs).length === 0) {
          localStorage.removeItem(storageKey);
          return;
        }

        setAgreementStatus("signing");

        const res = await fetch("/api/rental-agreement/sign", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ bookingId, signatures: validSigs }),
        });

        const data = await res.json();
        if (data.success) {
          setAgreementStatus("signed");
          // Clean up localStorage
          localStorage.removeItem(storageKey);
        } else {
          console.error("Agreement sign failed:", data.error);
          setAgreementStatus("error");
        }
      } catch (err) {
        console.error("Failed to submit agreement signatures:", err);
        setAgreementStatus("error");
      }
    }

    submitAgreementSignatures();
  }, [bookingId]);

  useEffect(() => {
    async function fetchBooking() {
      if (!bookingId) {
        setLoading(false);
        return;
      }
      try {
        const res = await fetch(`/api/bookings?id=${bookingId}`);
        const data = await res.json();
        if (data.success && data.data) {
          setBooking(data.data);
        }
      } catch (err) {
        console.error("Failed to fetch booking:", err);
      }
      setLoading(false);
    }
    fetchBooking();
  }, [bookingId]);

  return (
    <>
      <section className="bg-gradient-to-br from-green-700 to-green-900 py-16 text-white">
        <div className="mx-auto max-w-5xl px-4 text-center">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-white/20">
            <Check className="h-10 w-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold sm:text-4xl">Booking Confirmed!</h1>
          <p className="mt-2 text-green-100">
            Your payment was successful and your reservation is confirmed.
          </p>
        </div>
      </section>

      <PageContainer className="py-8">
        <div className="mx-auto max-w-2xl">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin h-8 w-8 border-4 border-purple-600 border-t-transparent rounded-full mx-auto" />
              <p className="mt-4 text-gray-500">Loading your booking details...</p>
            </div>
          ) : (
            <>
              <Card className="mb-6">
                <CardContent className="p-6">
                  <div className="text-center mb-6">
                    <p className="text-sm text-gray-500 mb-1">Booking ID</p>
                    <p className="text-2xl font-mono font-bold text-purple-600">
                      {bookingId || "—"}
                    </p>
                  </div>

                  {booking && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between py-3 border-b border-gray-100">
                        <span className="flex items-center gap-2 text-sm text-gray-500">
                          <Car className="h-4 w-4" /> Vehicle
                        </span>
                        <span className="text-sm font-medium text-gray-900">
                          {booking.vehicle_name}
                        </span>
                      </div>
                      <div className="flex items-center justify-between py-3 border-b border-gray-100">
                        <span className="flex items-center gap-2 text-sm text-gray-500">
                          <Calendar className="h-4 w-4" /> Dates & Times
                        </span>
                        <div className="text-right text-sm">
                          <div className="font-medium text-gray-900">
                            {booking.pickup_date} at <span className="text-xl font-bold text-purple-600">{formatTime(booking.pickup_time)}</span>
                          </div>
                          <div className="font-medium text-gray-900">
                            {booking.return_date} at <span className="text-xl font-bold text-purple-600">{formatTime(booking.return_time)}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between py-3 border-b border-gray-100">
                        <span className="flex items-center gap-2 text-sm text-gray-500">
                          <CreditCard className="h-4 w-4" /> Amount Paid
                        </span>
                        <span className="text-sm font-semibold text-green-600">
                          ${booking.total_price?.toFixed(2) || "—"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between py-3">
                        <span className="text-sm text-gray-500">Total</span>
                        <span className="text-lg font-bold text-purple-600">
                          ${booking.total_price?.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="mt-6 rounded-lg bg-purple-50 p-4">
                    <p className="text-sm text-purple-800">
                      <strong>What&apos;s next?</strong> A confirmation email has been sent to your email address.
                      Please bring a valid driver&apos;s license and the credit card used for payment at vehicle pickup.
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Rental Agreement Status */}
              {bookingId && agreementStatus !== "idle" && (
                <Card className={`mb-6 border-${agreementStatus === "signed" ? "green" : agreementStatus === "error" ? "red" : "purple"}-200 bg-gradient-to-r ${
                  agreementStatus === "signed" ? "from-green-50 to-emerald-50" :
                  agreementStatus === "error" ? "from-red-50 to-orange-50" :
                  "from-purple-50 to-indigo-50"
                }`}>
                  <CardContent className="p-6 text-center">
                    {agreementStatus === "signing" && (
                      <>
                        <Loader2 className="mx-auto h-8 w-8 text-purple-600 mb-2 animate-spin" />
                        <h3 className="text-lg font-semibold text-gray-900 mb-1">
                          Generating Your Rental Agreement...
                        </h3>
                        <p className="text-sm text-gray-500">
                          Applying your signatures to the rental agreement PDF.
                        </p>
                      </>
                    )}
                    {agreementStatus === "signed" && (
                      <>
                        <FileCheck className="mx-auto h-8 w-8 text-green-600 mb-2" />
                        <h3 className="text-lg font-semibold text-gray-900 mb-1">
                          Rental Agreement Signed!
                        </h3>
                        <p className="text-sm text-gray-500">
                          Your signed rental agreement has been saved to your booking.
                        </p>
                      </>
                    )}
                    {agreementStatus === "error" && (
                      <>
                        <FileCheck className="mx-auto h-8 w-8 text-red-500 mb-2" />
                        <h3 className="text-lg font-semibold text-gray-900 mb-1">
                          Agreement Processing Issue
                        </h3>
                        <p className="text-sm text-gray-500 mb-3">
                          There was an issue generating your signed agreement. Don&apos;t worry — you can sign it later.
                        </p>
                        <Link href={`/booking/agreement/${bookingId}`}>
                          <Button className="bg-purple-600 hover:bg-purple-700">
                            Sign Agreement Now
                            <ArrowRight className="h-4 w-4 ml-2" />
                          </Button>
                        </Link>
                      </>
                    )}
                  </CardContent>
                </Card>
              )}

              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link href="/account">
                  <Button className="w-full sm:w-auto">
                    View My Bookings <ArrowRight className="h-4 w-4 ml-1" />
                  </Button>
                </Link>
                <Link href="/fleet">
                  <Button variant="outline" className="w-full sm:w-auto">
                    Browse More Vehicles
                  </Button>
                </Link>
              </div>
            </>
          )}
        </div>
      </PageContainer>
    </>
  );
}

export default function BookingSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-24">
          <div className="animate-spin h-8 w-8 border-4 border-purple-600 border-t-transparent rounded-full" />
        </div>
      }
    >
      <SuccessContent />
    </Suspense>
  );
}
