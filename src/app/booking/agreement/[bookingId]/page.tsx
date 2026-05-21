"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  FileText,
  CheckCircle2,
  ArrowLeft,
  Loader2,
  AlertCircle,
  PenLine,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageContainer } from "@/components/layout/page-container";
import {
  AgreementSigningWizard,
  type AgreementSigningVehicle,
} from "@/components/agreement-signing-wizard";
import { vehicleForSigningFromDisplayName } from "@/lib/agreement/vehicle-for-signing";
import { csrfFetch } from "@/lib/utils/csrf-fetch";

interface BookingInfo {
  id: string;
  customer_name: string;
  customer_email: string;
  customer_phone?: string;
  vehicle_name: string;
  vehicle_id?: string;
  pickup_date: string;
  return_date: string;
  pickup_time?: string;
  return_time?: string;
  total_price: number;
  agreement_signed_at: string | null;
  rental_agreement_url: string | null;
}

export default function AgreementSigningPage() {
  const params = useParams();
  const bookingId = params.bookingId as string;

  const isValidId = /^[a-zA-Z0-9_-]{1,50}$/.test(bookingId || "");

  const [booking, setBooking] = useState<BookingInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [vehicle, setVehicle] = useState<AgreementSigningVehicle | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function fetchBooking() {
      try {
        const res = await fetch(`/api/bookings?id=${bookingId}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (!isMounted) return;
        if (data.success && data.data) {
          setBooking(data.data);
          let resolvedVehicle: AgreementSigningVehicle | null = null;
          if (data.data.vehicle_id) {
            try {
              const vRes = await fetch("/api/vehicles");
              if (!vRes.ok) throw new Error(`HTTP ${vRes.status}`);
              const vData = await vRes.json();
              if (vData.success && Array.isArray(vData.data)) {
                const v = vData.data.find((veh: { id: string }) => veh.id === data.data.vehicle_id);
                if (v) {
                  resolvedVehicle = {
                    make: v.make,
                    model: v.model,
                    year: v.year,
                    licensePlate: v.licensePlate,
                    vin: v.vin,
                    color: v.color,
                    mileage: v.mileage,
                  };
                }
              }
            } catch {
              // Fall back to booking vehicle name below
            }
          }
          if (!resolvedVehicle && data.data.vehicle_name) {
            resolvedVehicle = vehicleForSigningFromDisplayName(data.data.vehicle_name);
          }
          if (isMounted) setVehicle(resolvedVehicle);
          if (data.data.agreement_signed_at) {
            setSubmitted(true);
            setSignedUrl(data.data.rental_agreement_url);
          }
        } else {
          setError("Booking not found. Please check your booking ID.");
        }
      } catch {
        if (isMounted) setError("Failed to load booking details.");
      }
      if (isMounted) setLoading(false);
    }
    if (bookingId && isValidId) {
      fetchBooking();
    } else if (bookingId && !isValidId) {
      setError("Invalid booking ID format.");
      setLoading(false);
    }

    return () => {
      isMounted = false;
    };
  }, [bookingId, isValidId]);

  const handleSubmit = async (signatures: Record<string, string>) => {
    if (!booking) return;

    const res = await csrfFetch("/api/rental-agreement/sign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        bookingId,
        signatures,
        customerEmail: booking.customer_email,
      }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || "Failed to submit signed agreement.");
    }

    if (data.data?.url) {
      setSubmitted(true);
      setSignedUrl(data.data.url);
    } else {
      throw new Error("Failed to submit signed agreement.");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
      </div>
    );
  }

  if (error && !booking) {
    return (
      <PageContainer className="py-16">
        <div className="mx-auto max-w-lg text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-red-400 mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Error</h2>
          <p className="text-gray-500 mb-6">{error}</p>
          <Link href="/account">
            <Button>Go to My Bookings</Button>
          </Link>
        </div>
      </PageContainer>
    );
  }

  if (submitted) {
    return (
      <>
        <section className="page-hero page-hero--success page-hero--md text-white">
          <div className="mx-auto max-w-5xl px-4 text-center">
            <CheckCircle2 className="mx-auto h-14 w-14 text-green-200 mb-3" />
            <h1 className="text-3xl font-bold">Agreement Signed!</h1>
            <p className="mt-2 text-green-100">
              Your rental agreement has been signed and saved to your booking.
            </p>
          </div>
        </section>
        <PageContainer className="py-8">
          <div className="mx-auto max-w-lg">
            <Card>
              <CardContent className="p-6 text-center">
                <FileText className="mx-auto h-10 w-10 text-purple-500 mb-3" />
                <h3 className="text-lg font-semibold mb-2">Signed Rental Agreement</h3>
                <p className="text-sm text-gray-500 mb-4">Booking: {bookingId}</p>
                {signedUrl && (
                  <a
                    href={signedUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block"
                  >
                    <Button className="mb-3">
                      <FileText className="h-4 w-4 mr-2" /> View Signed Agreement
                    </Button>
                  </a>
                )}
                <div className="flex justify-center gap-3 mt-4">
                  <Link href="/account">
                    <Button variant="outline">My Bookings</Button>
                  </Link>
                  <Link href="/fleet">
                    <Button variant="outline">Browse Fleet</Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </PageContainer>
      </>
    );
  }

  if (!booking) return null;

  return (
    <>
      <section className="page-hero page-hero--md text-white">
        <div className="mx-auto max-w-5xl px-4">
          <Link
            href={`/booking/success?booking_id=${bookingId}`}
            className="inline-flex items-center gap-1 text-sm text-purple-300 hover:text-white mb-3 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to booking
          </Link>
          <div className="flex items-center gap-3">
            <PenLine className="h-8 w-8 text-purple-300" />
            <div>
              <h1 className="text-3xl font-bold">Sign Rental Agreement</h1>
              <p className="mt-1 page-hero-subtitle">
                {booking.vehicle_name} — {booking.pickup_date} to {booking.return_date}
              </p>
            </div>
          </div>
        </div>
      </section>

      <PageContainer className="py-8">
        <div className="mx-auto max-w-3xl">
          <AgreementSigningWizard
            booking={{
              customer_name: booking.customer_name,
              customer_email: booking.customer_email,
              customer_phone: booking.customer_phone,
              pickup_date: booking.pickup_date,
              return_date: booking.return_date,
              pickup_time: booking.pickup_time,
              return_time: booking.return_time,
              total_price: booking.total_price,
            }}
            vehicle={vehicle}
            onSubmit={handleSubmit}
          />
        </div>
      </PageContainer>
    </>
  );
}
