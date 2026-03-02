"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  Search, Car, Package, UserCheck, ShieldCheck, FileText, CreditCard,
  Calendar, ArrowLeft, ArrowRight, Check, Users, Briefcase, Fuel, ChevronRight, Tag, X, Upload
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PageContainer } from "@/components/layout/page-container";
import { useBooking } from "@/lib/context/booking-context";
import { cn } from "@/lib/utils/cn";
import vehicles from "@/data/vehicles.json";
import extras from "@/data/extras.json";
import type { BookingExtra } from "@/lib/types";

const STEPS = [
  { num: 1, label: "Search", icon: Search },
  { num: 2, label: "Vehicle", icon: Car },
  { num: 3, label: "Extras", icon: Package },
  { num: 4, label: "Details", icon: UserCheck },
  { num: 5, label: "Verify", icon: ShieldCheck },
  { num: 6, label: "Review", icon: FileText },
  { num: 7, label: "Payment", icon: CreditCard },
];

export default function BookingPage() {
  const booking = useBooking();
  const [localExtras, setLocalExtras] = useState<BookingExtra[]>(
    extras.map((e) => ({ ...e, selected: false, billingType: e.billingType as BookingExtra["billingType"] }))
  );

  // Customer details local state
  const [details, setDetails] = useState({
    name: "",
    email: "",
    phone: "",
    dob: "",
  });

  const [signedName, setSignedName] = useState("");
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [searchDates, setSearchDates] = useState({ pickup: "", return: "" });
  const [promoInput, setPromoInput] = useState("");
  const [promoLoading, setPromoLoading] = useState(false);
  const [promoError, setPromoError] = useState("");
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Recalculate pricing when vehicle or extras change
  useEffect(() => {
    if (booking.selectedVehicle && booking.pickupDate && booking.returnDate) {
      booking.setExtras(localExtras);
      booking.recalculatePrice();
    }
  }, [localExtras, booking.selectedVehicle]);

  const toggleExtra = (id: string) => {
    setLocalExtras((prev) =>
      prev.map((e) => (e.id === id ? { ...e, selected: !e.selected } : e))
    );
  };

  const handleApplyPromo = async () => {
    if (!promoInput.trim()) return;
    setPromoLoading(true);
    setPromoError("");
    const result = await booking.applyPromoCode(promoInput.trim().toUpperCase());
    if (!result.success) {
      setPromoError(result.error || "Invalid promo code");
    }
    setPromoLoading(false);
  };

  const handleFileUpload = (file: File) => {
    setUploadError("");
    const validTypes = ["image/jpeg", "image/png", "application/pdf"];
    if (!validTypes.includes(file.type)) {
      setUploadError("Please upload a JPG, PNG, or PDF file.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setUploadError("File must be under 5MB.");
      return;
    }
    setUploadedFile(file);
  };

  const handleRemovePromo = () => {
    booking.clearPromoCode();
    setPromoInput("");
    setPromoError("");
  };

  const availableVehicles = vehicles.filter((v) => v.isAvailable);

  const canProceed = (): boolean => {
    switch (booking.currentStep) {
      case 1: return !!searchDates.pickup && !!searchDates.return && new Date(searchDates.return) > new Date(searchDates.pickup);
      case 2: return !!booking.selectedVehicle;
      case 3: return true;
      case 4: return !!details.name && !!details.email && !!details.phone && !!details.dob;
      case 5: return true; // ID upload optional in prototype
      case 6: return agreedToTerms && !!signedName;
      case 7: return true;
      default: return false;
    }
  };

  const handleNext = () => {
    if (booking.currentStep === 1) {
      booking.setDates(searchDates.pickup, searchDates.return);
    }
    if (booking.currentStep === 4) {
      booking.setCustomerDetails(details);
    }
    if (booking.currentStep === 3) {
      booking.setExtras(localExtras);
      booking.recalculatePrice();
    }
    if (booking.currentStep === 6) {
      booking.setSignedName(signedName);
    }
    booking.nextStep();
  };

  return (
    <>
      {/* Header */}
      <section className="bg-gradient-to-br from-purple-900 to-gray-900 py-8 text-white">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold">Book Your Vehicle</h1>
          <p className="mt-1 text-purple-200">Complete the steps below to reserve your rental.</p>
        </div>
      </section>

      {/* Progress Steps */}
      <div className="border-b border-gray-200 bg-white sticky top-[64px] z-30">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-1 overflow-x-auto py-3">
            {STEPS.map((step, i) => (
              <React.Fragment key={step.num}>
                {i > 0 && <ChevronRight className="h-4 w-4 shrink-0 text-gray-300" />}
                <button
                  onClick={() => step.num < booking.currentStep && booking.setStep(step.num as 1|2|3|4|5|6|7)}
                  className={cn(
                    "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors",
                    booking.currentStep === step.num
                      ? "bg-purple-600 text-white"
                      : step.num < booking.currentStep
                      ? "bg-purple-100 text-purple-700 cursor-pointer hover:bg-purple-200"
                      : "bg-gray-100 text-gray-400"
                  )}
                  disabled={step.num > booking.currentStep}
                >
                  {step.num < booking.currentStep ? (
                    <Check className="h-3.5 w-3.5" />
                  ) : (
                    <step.icon className="h-3.5 w-3.5" />
                  )}
                  <span className="hidden sm:inline">{step.label}</span>
                </button>
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>

      <PageContainer className="py-8">
        <div className="mx-auto max-w-3xl">
          {/* Step 1: Search */}
          {booking.currentStep === 1 && (
            <Card>
              <CardContent className="p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-1">Select Your Dates</h2>
                <p className="text-sm text-gray-500 mb-6">Choose when you need the vehicle.</p>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">Pick-up Date</label>
                    <Input type="date" value={searchDates.pickup} onChange={(e) => setSearchDates((p) => ({ ...p, pickup: e.target.value }))} min={new Date().toISOString().split("T")[0]} />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">Return Date</label>
                    <Input type="date" value={searchDates.return} onChange={(e) => setSearchDates((p) => ({ ...p, return: e.target.value }))} min={searchDates.pickup || new Date().toISOString().split("T")[0]} />
                  </div>
                </div>
                {searchDates.pickup && searchDates.return && (
                  <div className="mt-4 rounded-lg bg-purple-50 p-3 text-sm text-purple-700">
                    <Calendar className="inline h-4 w-4 mr-1" />
                    {Math.ceil((new Date(searchDates.return).getTime() - new Date(searchDates.pickup).getTime()) / (1000 * 60 * 60 * 24))} day rental
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Step 2: Select Vehicle */}
          {booking.currentStep === 2 && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-gray-900">Choose Your Vehicle</h2>
              <p className="text-sm text-gray-500">Select from our available fleet for your dates.</p>
              <div className="grid grid-cols-1 gap-4">
                {availableVehicles.map((vehicle) => (
                  <Card
                    key={vehicle.id}
                    className={cn(
                      "cursor-pointer transition-all hover:shadow-md",
                      booking.selectedVehicle?.id === vehicle.id && "ring-2 ring-purple-600 shadow-md"
                    )}
                    onClick={() => booking.selectVehicle(vehicle as any)}
                  >
                    <CardContent className="flex items-center gap-4 p-4">
                      <div className="flex h-20 w-28 shrink-0 items-center justify-center rounded-lg bg-gray-100">
                        <Car className="h-10 w-10 text-gray-300" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-gray-900">{vehicle.name}</h3>
                          <Badge variant="secondary">{vehicle.category}</Badge>
                        </div>
                        <div className="mt-1 flex gap-3 text-xs text-gray-500">
                          <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {vehicle.specs.passengers}</span>
                          <span className="flex items-center gap-1"><Briefcase className="h-3 w-3" /> {vehicle.specs.luggage}</span>
                          <span className="flex items-center gap-1"><Fuel className="h-3 w-3" /> {vehicle.specs.mpg} mpg</span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-xl font-bold text-purple-600">${vehicle.dailyRate}</div>
                        <div className="text-xs text-gray-400">/day</div>
                      </div>
                      {booking.selectedVehicle?.id === vehicle.id && (
                        <Check className="h-5 w-5 shrink-0 text-purple-600" />
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Step 3: Extras */}
          {booking.currentStep === 3 && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-gray-900">Add-On Extras</h2>
              <p className="text-sm text-gray-500">Enhance your rental with optional extras.</p>
              <div className="grid grid-cols-1 gap-3">
                {localExtras.map((extra) => (
                  <Card
                    key={extra.id}
                    className={cn(
                      "cursor-pointer transition-all",
                      extra.selected ? "ring-2 ring-purple-600 bg-purple-50" : "hover:shadow-sm"
                    )}
                    onClick={() => toggleExtra(extra.id)}
                  >
                    <CardContent className="flex items-center justify-between p-4">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "flex h-5 w-5 items-center justify-center rounded border-2 transition-colors",
                          extra.selected ? "border-purple-600 bg-purple-600" : "border-gray-300"
                        )}>
                          {extra.selected && <Check className="h-3 w-3 text-white" />}
                        </div>
                        <div>
                          <h3 className="font-medium text-gray-900">{extra.name}</h3>
                          <p className="text-xs text-gray-500">{extra.description}</p>
                        </div>
                      </div>
                      <div className="text-right shrink-0 ml-4">
                        <div className="font-semibold text-gray-900">${extra.pricePerDay}/day</div>
                        {extra.maxPrice && <div className="text-xs text-gray-400">max ${extra.maxPrice}</div>}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Step 4: Your Details */}
          {booking.currentStep === 4 && (
            <Card>
              <CardContent className="p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-1">Your Details</h2>
                <p className="text-sm text-gray-500 mb-6">Tell us about yourself.</p>
                <div className="space-y-4">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">Full Name</label>
                    <Input placeholder="John Doe" value={details.name} onChange={(e) => setDetails((p) => ({ ...p, name: e.target.value }))} />
                  </div>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-gray-700">Email</label>
                      <Input type="email" placeholder="you@example.com" value={details.email} onChange={(e) => setDetails((p) => ({ ...p, email: e.target.value }))} />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-gray-700">Phone</label>
                      <Input type="tel" placeholder="(555) 123-4567" value={details.phone} onChange={(e) => setDetails((p) => ({ ...p, phone: e.target.value }))} />
                    </div>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">Date of Birth</label>
                    <Input type="date" value={details.dob} onChange={(e) => setDetails((p) => ({ ...p, dob: e.target.value }))} />
                    <p className="mt-1 text-xs text-gray-400">You must be at least 18 years old to rent.</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 5: Verification */}
          {booking.currentStep === 5 && (
            <Card>
              <CardContent className="p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-1">ID Verification</h2>
                <p className="text-sm text-gray-500 mb-6">Upload your driver&apos;s license for verification.</p>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".jpg,.jpeg,.png,.pdf"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileUpload(file);
                  }}
                />

                {uploadedFile ? (
                  <div className="rounded-xl border-2 border-green-300 bg-green-50 p-6 text-center">
                    <Check className="mx-auto h-10 w-10 text-green-500 mb-3" />
                    <p className="text-sm font-medium text-green-700">File uploaded successfully</p>
                    <p className="mt-1 text-xs text-gray-500">{uploadedFile.name} ({(uploadedFile.size / 1024).toFixed(0)} KB)</p>
                    <div className="mt-4 flex justify-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => { setUploadedFile(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                      >
                        <X className="h-3.5 w-3.5 mr-1" /> Remove
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        Replace File
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div
                    className="rounded-xl border-2 border-dashed border-gray-300 p-8 text-center transition-colors hover:border-purple-400 cursor-pointer"
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add("border-purple-500", "bg-purple-50"); }}
                    onDragLeave={(e) => { e.currentTarget.classList.remove("border-purple-500", "bg-purple-50"); }}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.currentTarget.classList.remove("border-purple-500", "bg-purple-50");
                      const file = e.dataTransfer.files?.[0];
                      if (file) handleFileUpload(file);
                    }}
                  >
                    <Upload className="mx-auto h-12 w-12 text-gray-300 mb-3" />
                    <p className="text-sm font-medium text-gray-700">Upload Driver&apos;s License</p>
                    <p className="mt-1 text-xs text-gray-400">Drag & drop or click to browse — JPG, PNG, or PDF up to 5MB</p>
                    <Button variant="outline" size="sm" className="mt-4" onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}>
                      Choose File
                    </Button>
                  </div>
                )}

                {uploadError && (
                  <p className="mt-3 text-sm text-red-600">{uploadError}</p>
                )}

                <p className="mt-4 text-xs text-gray-400">Your ID will be verified within 24 hours. You can proceed with your booking now.</p>
              </CardContent>
            </Card>
          )}

          {/* Step 6: Review & Sign */}
          {booking.currentStep === 6 && (
            <div className="space-y-4">
              <Card>
                <CardContent className="p-6">
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">Booking Summary</h2>
                  {booking.selectedVehicle && (
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Vehicle</span>
                        <span className="font-medium text-gray-900">{booking.selectedVehicle.name}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Pick-up</span>
                        <span className="font-medium text-gray-900">{booking.pickupDate}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Return</span>
                        <span className="font-medium text-gray-900">{booking.returnDate}</span>
                      </div>
                      {booking.pricing && (
                        <>
                          <div className="border-t pt-3">
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-500">Base ({booking.pricing.baseDays} days)</span>
                              <span>${booking.pricing.baseTotal.toFixed(2)}</span>
                            </div>
                            {booking.pricing.extras.map((e) => (
                              <div key={e.name} className="flex justify-between text-sm">
                                <span className="text-gray-500">{e.name}</span>
                                <span>${e.total.toFixed(2)}</span>
                              </div>
                            ))}
                            {booking.promoDiscount && (
                              <div className="flex justify-between text-sm text-green-600">
                                <span className="flex items-center gap-1">
                                  <Tag className="h-3 w-3" />
                                  Promo: {booking.promoCode}
                                </span>
                                <span>-${booking.promoDiscount.discountAmount.toFixed(2)}</span>
                              </div>
                            )}
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-500">Tax</span>
                              <span>${booking.pricing.tax.toFixed(2)}</span>
                            </div>
                          </div>
                          <div className="border-t pt-3 flex justify-between font-semibold text-lg">
                            <span>Total</span>
                            <span className="text-purple-600">${booking.pricing.total.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between text-sm text-gray-500">
                            <span>Deposit (due now)</span>
                            <span>$50.00</span>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Promo Code */}
              <Card>
                <CardContent className="p-6">
                  <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <Tag className="h-4 w-4 text-purple-600" />
                    Promo Code
                  </h3>
                  {booking.promoCode ? (
                    <div className="flex items-center justify-between rounded-lg bg-green-50 border border-green-200 p-3">
                      <div>
                        <span className="font-medium text-green-700">{booking.promoCode}</span>
                        <span className="ml-2 text-sm text-green-600">
                          — {booking.promoDiscount?.description || "Discount applied"}
                        </span>
                      </div>
                      <button onClick={handleRemovePromo} className="text-green-600 hover:text-green-800">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <div>
                      <div className="flex gap-2">
                        <Input
                          placeholder="Enter promo code"
                          value={promoInput}
                          onChange={(e) => { setPromoInput(e.target.value); setPromoError(""); }}
                          className="uppercase"
                        />
                        <Button
                          variant="outline"
                          onClick={handleApplyPromo}
                          disabled={promoLoading || !promoInput.trim()}
                        >
                          {promoLoading ? "..." : "Apply"}
                        </Button>
                      </div>
                      {promoError && (
                        <p className="mt-2 text-sm text-red-600">{promoError}</p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <h3 className="font-semibold text-gray-900 mb-3">Rental Agreement</h3>
                  <div className="max-h-40 overflow-y-auto rounded-lg bg-gray-50 p-4 text-xs text-gray-600 leading-relaxed mb-4">
                    <p className="mb-2">By signing this rental agreement, you agree to the terms and conditions set forth by NextGearAuto. You acknowledge that you are renting the vehicle described above for the dates specified. You agree to return the vehicle in the same condition, normal wear and tear excepted.</p>
                    <p className="mb-2">The $50 booking deposit is non-refundable. Free cancellation is available up to 24 hours before the scheduled pickup time. Cancellations less than 24 hours before pickup will be charged in full.</p>
                    <p>A damage deposit will be held on your credit card and released upon satisfactory vehicle return inspection. You are responsible for any damage, loss, or theft of the vehicle during the rental period.</p>
                  </div>
                  <label className="flex items-start gap-2 text-sm mb-4">
                    <input type="checkbox" checked={agreedToTerms} onChange={(e) => setAgreedToTerms(e.target.checked)} className="mt-0.5 rounded border-gray-300 text-purple-600 focus:ring-purple-500" />
                    <span className="text-gray-600">I have read and agree to the rental agreement terms and conditions.</span>
                  </label>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">Digital Signature (Type Full Legal Name)</label>
                    <Input placeholder="Your full legal name" value={signedName} onChange={(e) => setSignedName(e.target.value)} className="font-serif italic text-lg" />
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Step 7: Secure Payment via Stripe */}
          {booking.currentStep === 7 && (
            <Card>
              <CardContent className="p-6 text-center">
                <CreditCard className="mx-auto h-12 w-12 text-purple-600 mb-4" />
                <h2 className="text-xl font-semibold text-gray-900 mb-2">Secure Payment</h2>
                <p className="text-sm text-gray-500 mb-2">
                  You&apos;ll be redirected to Stripe&apos;s secure checkout to pay the $50.00 deposit.
                </p>
                <p className="text-xs text-gray-400 mb-6">
                  Your card details are handled entirely by Stripe — they never touch our servers.
                </p>

                {booking.error && (
                  <div className="mx-auto max-w-sm rounded-lg bg-red-50 border border-red-200 p-3 mb-4 text-sm text-red-700">
                    {booking.error}
                  </div>
                )}

                <div className="mx-auto max-w-sm space-y-3">
                  {booking.pricing && (
                    <div className="rounded-lg bg-gray-50 p-4 text-left text-sm space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Rental Total</span>
                        <span className="font-semibold">${booking.pricing.total.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between border-t pt-2">
                        <span className="text-gray-500">Deposit (due now)</span>
                        <span className="font-bold text-purple-600">${booking.pricing.deposit.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-xs text-gray-400">
                        <span>Remaining (due at pickup)</span>
                        <span>${(booking.pricing.total - booking.pricing.deposit).toFixed(2)}</span>
                      </div>
                    </div>
                  )}

                  <Button
                    className="w-full"
                    size="lg"
                    onClick={() => booking.submitBooking()}
                    disabled={booking.isSubmitting}
                  >
                    {booking.isSubmitting ? (
                      <>
                        <span className="animate-spin mr-2 inline-block h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                        Redirecting to Stripe...
                      </>
                    ) : (
                      "Proceed to Secure Payment"
                    )}
                  </Button>

                  <div className="flex items-center justify-center gap-2 text-xs text-gray-400">
                    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"/></svg>
                    <span>Secured by Stripe</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Navigation buttons */}
          {booking.currentStep <= 7 && (
            <div className="mt-6 flex items-center justify-between">
              <Button
                variant="outline"
                onClick={booking.currentStep === 1 ? undefined : () => booking.prevStep()}
                disabled={booking.currentStep === 1 || booking.isSubmitting}
              >
                <ArrowLeft className="h-4 w-4 mr-1" /> Back
              </Button>
              {booking.currentStep < 7 && (
                <Button onClick={handleNext} disabled={!canProceed()}>
                  {booking.currentStep === 6 ? "Proceed to Payment" : "Continue"}
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              )}
            </div>
          )}
        </div>
      </PageContainer>
    </>
  );
}
