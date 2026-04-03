"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  FileText,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Loader2,
  AlertCircle,
  PenLine,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageContainer } from "@/components/layout/page-container";
import { SignaturePad } from "@/components/signature-pad";
import { RentalAgreementInline, getPageForStep } from "@/components/rental-agreement-inline";
import { csrfFetch } from "@/lib/utils/csrf-fetch";
import { AGREEMENT_SIGNATURE_FIELDS as SIGNATURE_FIELDS } from "@/data/agreement-fields";

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

interface VehicleInfo {
  make: string;
  model: string;
  year: number;
  licensePlate?: string;
  vin?: string;
  color?: string;
  mileage?: number;
}

export default function AgreementSigningPage() {
  const params = useParams();
  const router = useRouter();
  const bookingId = params.bookingId as string;

  // Validate bookingId format
  const isValidId = /^[a-zA-Z0-9_-]{1,50}$/.test(bookingId || "");

  const [booking, setBooking] = useState<BookingInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [signatures, setSignatures] = useState<Record<string, string | null>>({});
  const [currentStep, setCurrentStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [vehicle, setVehicle] = useState<VehicleInfo | null>(null);

  // Fetch booking details
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
          // Fetch vehicle details if vehicle_id is available
          if (data.data.vehicle_id) {
            try {
              const vRes = await fetch("/api/vehicles");
              if (!vRes.ok) throw new Error(`HTTP ${vRes.status}`);
              const vData = await vRes.json();
              if (isMounted && vData.success && Array.isArray(vData.data)) {
                const v = vData.data.find((veh: { id: string }) => veh.id === data.data.vehicle_id);
                if (v) setVehicle(v);
              }
            } catch {
              // Vehicle fetch failed, continue without it
            }
          }
          // Check if already signed
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

    return () => { isMounted = false; };
  }, [bookingId, isValidId]);

  const handleSignatureChange = useCallback(
    (fieldId: string, dataUrl: string | null) => {
      setSignatures((prev) => ({ ...prev, [fieldId]: dataUrl }));
    },
    []
  );

  const completedCount = SIGNATURE_FIELDS.filter((f) => signatures[f.id]).length;
  const allSigned = completedCount === SIGNATURE_FIELDS.length;
  const currentField = SIGNATURE_FIELDS[currentStep];

  // Calculate total rental days safely
  const calculateTotalDays = (): number => {
    if (!booking?.pickup_date || !booking?.return_date) return 1;
    try {
      const pickupDate = new Date(`${booking.pickup_date}T00:00:00`);
      const returnDate = new Date(`${booking.return_date}T00:00:00`);
      if (isNaN(pickupDate.getTime()) || isNaN(returnDate.getTime())) return 1;
      const diff = (returnDate.getTime() - pickupDate.getTime()) / (1000 * 60 * 60 * 24);
      return Math.max(1, Math.ceil(diff));
    } catch {
      return 1;
    }
  };

  const handleSubmit = async () => {
    if (!allSigned || !booking) return;

    // Validate all signature fields are properly filled
    const hasNullSignatures = SIGNATURE_FIELDS.some((f) => !signatures[f.id]);
    if (hasNullSignatures) {
      setError("All signature fields are required. Please sign all sections.");
      return;
    }

    setSubmitting(true);

    try {
      const res = await csrfFetch("/api/rental-agreement/sign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId, signatures, customerEmail: booking.customer_email }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      if (data.success && data.data?.url) {
        setSubmitted(true);
        setSignedUrl(data.data.url);
      } else {
        setError(data.error || "Failed to submit signed agreement.");
      }
    } catch {
      setError("Network error. Please try again.");
    }
    setSubmitting(false);
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
      </div>
    );
  }

  // Error state
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

  // Already signed
  if (submitted) {
    return (
      <>
        <section className="bg-gradient-to-br from-green-700 to-green-900 py-12 text-white">
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
                <p className="text-sm text-gray-500 mb-4">
                  Booking: {bookingId}
                </p>
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

  return (
    <>
      {/* Hero */}
      <section className="bg-gradient-to-br from-purple-900 to-gray-900 py-10 text-white">
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
              <p className="mt-1 text-purple-200">
                {booking?.vehicle_name} — {booking?.pickup_date} to {booking?.return_date}
              </p>
            </div>
          </div>
        </div>
      </section>

      <PageContainer className="py-8">
        <div className="mx-auto max-w-3xl">
          {error && (
            <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 flex items-center justify-between">
              <span>{error}</span>
              <button onClick={() => setError(null)} className="ml-3 text-red-400 hover:text-red-600 shrink-0" aria-label="Dismiss error">
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* Inline Rental Agreement */}
          {booking && (
            <Card className="mb-6">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <FileText className="h-4 w-4 text-purple-500" />
                    Rental Agreement
                  </h3>
                </div>
                <RentalAgreementInline
                  vehicle={vehicle}
                  customerName={booking.customer_name}
                  customerEmail={booking.customer_email}
                  customerPhone={booking.customer_phone}
                  pickupDate={booking.pickup_date}
                  returnDate={booking.return_date}
                  pickupTime={booking.pickup_time}
                  returnTime={booking.return_time}
                  totalPrice={booking.total_price}
                  totalDays={calculateTotalDays()}
                  currentPage={getPageForStep(currentStep)}
                />
                <p className="text-xs text-gray-400 mt-2">
                  Vehicle and booking information has been pre-filled. Review the agreement above, then sign below.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Progress */}
          <div className="mb-6" aria-live="polite" aria-label="Signature progress">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">
                Signatures: {completedCount} of {SIGNATURE_FIELDS.length}
              </span>
              <span className="text-xs text-gray-400">
                Step {currentStep + 1} of {SIGNATURE_FIELDS.length}
              </span>
            </div>
            <div className="flex gap-1">
              {SIGNATURE_FIELDS.map((field, i) => (
                <button
                  key={field.id}
                  onClick={() => setCurrentStep(i)}
                  className={`h-8 w-8 flex-1 rounded-full transition-colors flex items-center justify-center relative ${
                    signatures[field.id]
                      ? "bg-green-500"
                      : i === currentStep
                        ? "bg-purple-500"
                        : "bg-gray-200"
                  }`}
                  title={`${field.label}: ${signatures[field.id] ? 'Signed' : 'Pending'}`}
                  aria-label={`${field.label}: ${signatures[field.id] ? 'Signed' : 'Pending'}`}
                >
                  {signatures[field.id] ? (
                    <CheckCircle2 className="h-5 w-5 text-white" />
                  ) : i === currentStep ? (
                    <PenLine className="h-5 w-5 text-white" />
                  ) : null}
                </button>
              ))}
            </div>
          </div>

          {/* Current Signature Field */}
          <Card className="mb-6 border-purple-200">
            <CardContent className="p-6">
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-1">
                  {signatures[currentField.id] ? (
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  ) : (
                    <PenLine className="h-5 w-5 text-purple-500" />
                  )}
                  <h3 className="text-lg font-semibold text-gray-900">
                    {currentField.label}
                  </h3>
                </div>
                <p className="text-sm text-gray-500 ml-7">
                  {currentField.description}
                </p>
              </div>

              <div className="flex justify-center">
                <SignaturePad
                  key={currentField.id}
                  onSignatureChange={(data) =>
                    handleSignatureChange(currentField.id, data)
                  }
                  isInitials={currentField.isInitials}
                  label={currentField.isInitials ? "Initial here" : "Sign here"}
                  width={currentField.isInitials ? 200 : 400}
                  height={currentField.isInitials ? 80 : 150}
                />
              </div>

              {/* Navigation buttons */}
              <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-100">
                <Button
                  variant="outline"
                  onClick={() => setCurrentStep((s) => Math.max(0, s - 1))}
                  disabled={currentStep === 0}
                >
                  <ArrowLeft className="h-4 w-4 mr-1" /> Previous
                </Button>

                {currentStep < SIGNATURE_FIELDS.length - 1 ? (
                  <Button
                    onClick={() => setCurrentStep((s) => s + 1)}
                    disabled={!signatures[currentField.id]}
                  >
                    Next <ArrowRight className="h-4 w-4 ml-1" />
                  </Button>
                ) : (
                  <Button
                    onClick={handleSubmit}
                    disabled={!allSigned || submitting}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Submitting...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-4 w-4 mr-2" /> Submit Signed Agreement
                      </>
                    )}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Signature Summary */}
          <Card>
            <CardContent className="p-4">
              <h4 className="text-sm font-semibold text-gray-700 mb-3">All Signatures</h4>
              <div className="space-y-2">
                {SIGNATURE_FIELDS.map((field, i) => (
                  <button
                    key={field.id}
                    onClick={() => setCurrentStep(i)}
                    className={`w-full flex items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors ${
                      i === currentStep
                        ? "bg-purple-50 border border-purple-200"
                        : "hover:bg-gray-50"
                    }`}
                  >
                    {signatures[field.id] ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                    ) : (
                      <div className="h-4 w-4 rounded-full border-2 border-gray-300 shrink-0" />
                    )}
                    <span className="text-sm text-gray-700 truncate">
                      {field.label}
                    </span>
                    {signatures[field.id] && (
                      <span className="ml-auto text-xs text-green-600 shrink-0">Signed</span>
                    )}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </PageContainer>
    </>
  );
}
