"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Check, Car, Calendar, CreditCard, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageContainer } from "@/components/layout/page-container";

interface BookingDetails {
  id: string;
  vehicle_name: string;
  pickup_date: string;
  return_date: string;
  total_price: number;
  deposit: number;
  customer_name: string;
}

export default function BookingSuccessPage() {
  const searchParams = useSearchParams();
  const bookingId = searchParams.get("booking_id");
  const sessionId = searchParams.get("session_id");
  const [booking, setBooking] = useState<BookingDetails | null>(null);
  const [loading, setLoading] = useState(true);

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
                          <Calendar className="h-4 w-4" /> Dates
                        </span>
                        <span className="text-sm font-medium text-gray-900">
                          {booking.pickup_date} → {booking.return_date}
                        </span>
                      </div>
                      <div className="flex items-center justify-between py-3 border-b border-gray-100">
                        <span className="flex items-center gap-2 text-sm text-gray-500">
                          <CreditCard className="h-4 w-4" /> Deposit Paid
                        </span>
                        <span className="text-sm font-semibold text-green-600">
                          ${booking.deposit?.toFixed(2) || "50.00"}
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
                      The remaining balance of{" "}
                      <strong>
                        ${booking ? (booking.total_price - booking.deposit).toFixed(2) : "—"}
                      </strong>{" "}
                      is due at vehicle pickup. Please bring a valid driver&apos;s license and the credit
                      card used for the deposit.
                    </p>
                  </div>
                </CardContent>
              </Card>

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
