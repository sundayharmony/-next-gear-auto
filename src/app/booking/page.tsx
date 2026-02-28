"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Search, Car, Package, UserCheck, ShieldCheck, FileText, CreditCard,
  Calendar, ArrowLeft, ArrowRight, Check, Users, Briefcase, Fuel, ChevronRight
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
                <div className="rounded-xl border-2 border-dashed border-gray-300 p-8 text-center transition-colors hover:border-purple-400">
                  <ShieldCheck className="mx-auto h-12 w-12 text-gray-300 mb-3" />
                  <p className="text-sm font-medium text-gray-700">Upload Driver&apos;s License</p>
                  <p className="mt-1 text-xs text-gray-400">JPG, PNG, or PDF up to 5MB</p>
                  <Button variant="outline" size="sm" className="mt-4">
                    Choose File
                  </Button>
                </div>
                <div className="mt-4 rounded-lg bg-blue-50 p-3 text-sm text-blue-700 border border-blue-200">
                  <strong>Prototype Mode:</strong> ID verification is simulated. Click Next to continue.
                </div>
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

          {/* Step 7: Payment / Confirmation */}
          {booking.currentStep === 7 && (
            <Card>
              <CardContent className="p-6 text-center">
                {!booking.bookingId ? (
                  <>
                    <CreditCard className="mx-auto h-12 w-12 text-purple-600 mb-4" />
                    <h2 className="text-xl font-semibold text-gray-900 mb-2">Process Payment</h2>
                    <p className="text-sm text-gray-500 mb-6">$50.00 non-refundable deposit will be charged.</p>
                    <div className="mx-auto max-w-sm rounded-lg border border-gray-200 p-4 mb-6">
                      <div className="rounded-lg bg-blue-50 p-3 text-sm text-blue-700 border border-blue-200 mb-4">
                        <strong>Prototype Mode:</strong> No real payment will be processed.
                      </div>
                      <Button className="w-full" size="lg" onClick={() => booking.submitBooking()} disabled={booking.isSubmitting}>
                        {booking.isSubmitting ? "Processing..." : "Pay $50.00 Deposit"}
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                      <Check className="h-8 w-8 text-green-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Booking Confirmed!</h2>
                    <p className="text-gray-500 mb-2">Your booking ID is:</p>
                    <p className="text-lg font-mono font-semibold text-purple-600 mb-6">{booking.bookingId}</p>
                    <p className="text-sm text-gray-500 mb-6">A confirmation email has been sent (simulated). Your ID will be verified and the booking confirmed shortly.</p>
                    <div className="flex justify-center gap-3">
                      <Link href="/account"><Button>View My Bookings</Button></Link>
                      <Link href="/fleet"><Button variant="outline">Browse More Vehicles</Button></Link>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          )}

          {/* Navigation buttons */}
          {booking.currentStep < 7 || !booking.bookingId ? (
            <div className="mt-6 flex items-center justify-between">
              <Button
                variant="outline"
                onClick={booking.currentStep === 1 ? undefined : () => booking.prevStep()}
                disabled={booking.currentStep === 1}
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
          ) : null}
        </div>
      </PageContainer>
    </>
  );
}
