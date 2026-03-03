import React from "react";
import Link from "next/link";
import { AlertCircle, Mail, Phone, MapPin, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageContainer } from "@/components/layout/page-container";

export const metadata = {
  title: "Terms of Service",
  description: "NextGearAuto terms of service - rental policies, restrictions, and legal agreements.",
};

export default function TermsPage() {
  return (
    <>
      {/* Hero */}
      <section className="bg-gradient-to-br from-purple-900 to-gray-900 py-16 text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-start gap-4">
            <AlertCircle className="h-12 w-12 text-purple-400 flex-shrink-0 mt-1" />
            <div>
              <h1 className="text-4xl font-bold sm:text-5xl">Terms of Service</h1>
              <p className="mt-3 text-lg text-purple-200">
                Please read these terms carefully before renting a vehicle from NextGearAuto.
              </p>
            </div>
          </div>
        </div>
      </section>

      <PageContainer className="py-12">
        <div className="mx-auto max-w-3xl space-y-8">
          {/* Last Updated */}
          <Card className="border-purple-200 bg-purple-50">
            <CardContent className="p-6">
              <p className="text-sm text-gray-600">
                <strong>Last Updated:</strong> February 2026
              </p>
              <p className="text-sm text-gray-600 mt-2">
                These Terms of Service govern all vehicle rentals through NextGearAuto. By completing a booking or renting a vehicle, you agree to be bound by these terms.
              </p>
            </CardContent>
          </Card>

          {/* Introduction */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">1. Agreement to Terms</h2>
            <p className="text-gray-600 leading-relaxed">
              By booking or renting a vehicle from NextGearAuto, you accept and agree to be legally bound by these Terms of Service, our Privacy Policy, and all other terms and conditions incorporated by reference. If you do not agree to these terms, you may not rent a vehicle from us.
            </p>
          </section>

          {/* Eligibility */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">2. Rental Eligibility</h2>
            <p className="text-gray-600 leading-relaxed mb-4">
              To rent a vehicle from NextGearAuto, you must meet all of the following requirements:
            </p>

            <div className="space-y-3 bg-purple-50 p-6 rounded-lg border border-purple-200">
              <div className="flex gap-3">
                <span className="text-purple-600 font-bold text-lg">•</span>
                <p className="text-gray-600"><strong>Age:</strong> Be at least 18 years old</p>
              </div>

              <div className="flex gap-3">
                <span className="text-purple-600 font-bold text-lg">•</span>
                <p className="text-gray-600"><strong>Valid Driver's License:</strong> Possess a valid, non-suspended driver's license from any U.S. state or territory</p>
              </div>

              <div className="flex gap-3">
                <span className="text-purple-600 font-bold text-lg">•</span>
                <p className="text-gray-600"><strong>Driving Record:</strong> Have a clean driving record without major violations</p>
              </div>

              <div className="flex gap-3">
                <span className="text-purple-600 font-bold text-lg">•</span>
                <p className="text-gray-600"><strong>Valid Payment Method:</strong> Provide a valid credit or debit card for payment and damage deposit authorization</p>
              </div>

              <div className="flex gap-3">
                <span className="text-purple-600 font-bold text-lg">•</span>
                <p className="text-gray-600"><strong>Identity Verification:</strong> Provide a valid form of identification and allow us to verify your identity and driving record</p>
              </div>

              <div className="flex gap-3">
                <span className="text-purple-600 font-bold text-lg">•</span>
                <p className="text-gray-600"><strong>Age Restrictions:</strong> Meet any age restrictions for specific vehicle categories</p>
              </div>
            </div>

            <p className="text-gray-600 leading-relaxed mt-4">
              We reserve the right to deny a rental if you do not meet these requirements or if we believe you pose a safety or liability risk.
            </p>
          </section>

          {/* Booking & Payment */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">3. Booking & Payment Terms</h2>

            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Booking Process</h3>
                <p className="text-gray-600 leading-relaxed">
                  All reservations must be made online through our website or by contacting us directly. A booking is confirmed only after you receive a confirmation email with your reservation details.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Payment Requirement</h3>
                <p className="text-gray-600 leading-relaxed">
                  Full payment for your rental is required at the time of reservation. This payment secures your vehicle reservation and confirms your booking. This payment is separate from the damage deposit held at pickup.
                </p>
              </div>


              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Damage Deposit</h3>
                <p className="text-gray-600 leading-relaxed">
                  A damage deposit is held on your credit card at pickup as an authorization hold (not a charge). The amount varies by vehicle category ($200-$500). If the vehicle is returned in good condition, the hold is released within 5-7 business days.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Price Guarantee</h3>
                <p className="text-gray-600 leading-relaxed">
                  The price quoted at booking is guaranteed and will not change unless you modify your reservation dates or vehicle selection. All applicable taxes and fees are included in the quoted price.
                </p>
              </div>
            </div>
          </section>

          {/* Cancellation Policy */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">4. Cancellation & Modification Policy</h2>

            <Card className="border-purple-200 bg-white mb-4">
              <CardContent className="p-6">
                <h3 className="font-semibold text-gray-900 mb-4">Cancellation Terms</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-purple-200">
                        <th className="pb-3 text-left font-semibold text-gray-700">Timing</th>
                        <th className="pb-3 text-left font-semibold text-gray-700">Refund Status</th>
                      </tr>
                    </thead>
                    <tbody className="text-gray-600">
                      <tr className="border-b border-purple-100">
                        <td className="py-3">24+ hours before pickup</td>
                        <td className="py-3 text-green-600 font-medium">Full refund</td>
                      </tr>
                      <tr className="border-b border-purple-100">
                        <td className="py-3">Less than 24 hours before pickup</td>
                        <td className="py-3 text-red-600 font-medium">No refund</td>
                      </tr>
                      <tr>
                        <td className="py-3">No-show</td>
                        <td className="py-3 text-red-600 font-medium">No refund</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            <p className="text-gray-600 leading-relaxed">
              Modifications to your reservation (dates or vehicle) may be made up to 24 hours before pickup subject to vehicle availability. Modifications may result in a price adjustment. Cancellations must be made through your account or by contacting us directly.
            </p>
          </section>

          {/* Vehicle Use Restrictions */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">5. Vehicle Use Restrictions</h2>
            <p className="text-gray-600 leading-relaxed mb-4">
              You agree to use the rental vehicle only for lawful purposes and in accordance with all traffic laws and regulations. The following activities are strictly prohibited:
            </p>

            <div className="space-y-2 text-gray-600">
              <div className="flex gap-2">
                <span className="text-red-600 font-bold">✕</span>
                <span>Off-road driving or use on unpaved roads</span>
              </div>
              <div className="flex gap-2">
                <span className="text-red-600 font-bold">✕</span>
                <span>Smoking, vaping, or use of any tobacco products inside the vehicle</span>
              </div>
              <div className="flex gap-2">
                <span className="text-red-600 font-bold">✕</span>
                <span>Consumption of food or beverages (except water in closed containers)</span>
              </div>
              <div className="flex gap-2">
                <span className="text-red-600 font-bold">✕</span>
                <span>Driving outside the specified geographic area (New Jersey, New York, Pennsylvania)</span>
              </div>
              <div className="flex gap-2">
                <span className="text-red-600 font-bold">✕</span>
                <span>Using the vehicle for commercial purposes or ride-sharing</span>
              </div>
              <div className="flex gap-2">
                <span className="text-red-600 font-bold">✕</span>
                <span>Transporting hazardous or illegal materials</span>
              </div>
              <div className="flex gap-2">
                <span className="text-red-600 font-bold">✕</span>
                <span>Towing or carrying cargo beyond vehicle capacity</span>
              </div>
              <div className="flex gap-2">
                <span className="text-red-600 font-bold">✕</span>
                <span>Driving while impaired by alcohol or drugs</span>
              </div>
              <div className="flex gap-2">
                <span className="text-red-600 font-bold">✕</span>
                <span>Racing, reckless driving, or other dangerous activities</span>
              </div>
              <div className="flex gap-2">
                <span className="text-red-600 font-bold">✕</span>
                <span>Sublet or transfer of the rental to another party</span>
              </div>
            </div>

            <p className="text-gray-600 leading-relaxed mt-4">
              Violation of these restrictions may result in termination of your rental, additional charges, and potential legal action.
            </p>
          </section>

          {/* Insurance & Liability */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">6. Insurance & Liability</h2>

            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Your Insurance Responsibility</h3>
                <p className="text-gray-600 leading-relaxed">
                  You are responsible for maintaining appropriate insurance coverage during your rental period. Your personal auto insurance policy or credit card rental coverage may provide collision and comprehensive coverage. We recommend verifying your coverage with your insurance provider before renting.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Optional Insurance</h3>
                <p className="text-gray-600 leading-relaxed">
                  NextGearAuto offers optional insurance coverage for $15/day that includes a collision damage waiver and comprehensive coverage. This coverage is optional and can be added during the booking process.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Liability</h3>
                <p className="text-gray-600 leading-relaxed">
                  You are responsible for all damages, accidents, traffic violations, parking citations, and other liabilities incurred during your rental period. You agree to hold NextGearAuto harmless from any claims arising from your use of the vehicle.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Damage & Accidents</h3>
                <p className="text-gray-600 leading-relaxed">
                  You must immediately notify us of any damage or accidents. Damage is assessed upon vehicle return and repair costs are charged to your credit card or deducted from your damage deposit. You are liable for all repair costs regardless of fault.
                </p>
              </div>
            </div>
          </section>

          {/* Fuel Policy */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">7. Fuel Policy</h2>
            <p className="text-gray-600 leading-relaxed mb-4">
              Vehicles are provided with a full tank of fuel. You must return the vehicle with a full tank of fuel. If the vehicle is not returned with a full tank:
            </p>

            <div className="bg-purple-50 p-6 rounded-lg border border-purple-200 space-y-3">
              <div className="flex gap-3">
                <span className="text-purple-600 font-bold">1.</span>
                <p className="text-gray-600">Fuel will be refilled and the cost charged to your credit card at the pump price plus a $10 refueling fee</p>
              </div>
              <div className="flex gap-3">
                <span className="text-purple-600 font-bold">2.</span>
                <p className="text-gray-600">Fuel pre-payment is available during checkout at market rate plus a $10 fee to return the vehicle empty</p>
              </div>
              <div className="flex gap-3">
                <span className="text-purple-600 font-bold">3.</span>
                <p className="text-gray-600">You are responsible for the cost of fuel consumed during your rental period</p>
              </div>
            </div>
          </section>

          {/* Late Return Fees */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">8. Late Return & Additional Charges</h2>
            <p className="text-gray-600 leading-relaxed mb-4">
              Vehicles must be returned by the scheduled return time. Late returns are subject to additional charges:
            </p>

            <Card className="border-purple-200 bg-white">
              <CardContent className="p-6">
                <div className="space-y-3">
                  <div className="flex justify-between pb-3 border-b border-purple-100">
                    <span className="font-semibold text-gray-900">Time Period</span>
                    <span className="font-semibold text-gray-900">Charge</span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-gray-600">1-30 minutes late</span>
                    <span className="text-gray-600">$25</span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-gray-600">31 minutes - 2 hours late</span>
                    <span className="text-gray-600">$50</span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-gray-600">Over 2 hours late</span>
                    <span className="text-gray-600">Full additional day rental charge</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <p className="text-gray-600 leading-relaxed mt-4">
              Late returns may also result in loss of vehicle availability for subsequent bookings.
            </p>
          </section>

          {/* Additional Drivers & Children */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">9. Additional Drivers & Child Safety Seats</h2>

            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Additional Drivers</h3>
                <p className="text-gray-600 leading-relaxed">
                  Additional drivers may be registered and verified for an additional fee ($15 per driver per rental). All additional drivers must meet the same eligibility requirements as the primary renter and provide valid identification.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Child Safety Seats</h3>
                <p className="text-gray-600 leading-relaxed">
                  Child safety seats are available for $10/day (maximum $50 per rental). Properly installed child safety seats are required by law for children under a certain age and weight. You are responsible for proper installation and use.
                </p>
              </div>
            </div>
          </section>

          {/* Vehicle Inspection */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">10. Vehicle Inspection & Return</h2>
            <p className="text-gray-600 leading-relaxed mb-4">
              Before picking up the vehicle, you will have the opportunity to inspect it and note any existing damage. Upon return:
            </p>

            <ul className="space-y-2 text-gray-600">
              <li className="flex gap-2">
                <span className="text-purple-600 font-bold">•</span>
                <span>The vehicle must be clean and free of personal items</span>
              </li>
              <li className="flex gap-2">
                <span className="text-purple-600 font-bold">•</span>
                <span>All doors, windows, and locks must be functioning properly</span>
              </li>
              <li className="flex gap-2">
                <span className="text-purple-600 font-bold">•</span>
                <span>The tank must be full unless fuel pre-pay was selected</span>
              </li>
              <li className="flex gap-2">
                <span className="text-purple-600 font-bold">•</span>
                <span>Mileage will be recorded at return</span>
              </li>
              <li className="flex gap-2">
                <span className="text-purple-600 font-bold">•</span>
                <span>Any damage will be assessed and photographed</span>
              </li>
            </ul>
          </section>

          {/* Limitation of Liability */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">11. Limitation of Liability</h2>
            <p className="text-gray-600 leading-relaxed mb-4">
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, NEXTGEARAUTO SHALL NOT BE LIABLE FOR:
            </p>

            <div className="bg-gray-50 p-6 rounded-lg space-y-2 text-gray-600">
              <p>• Any indirect, incidental, or consequential damages</p>
              <p>• Loss of data, profits, or business opportunities</p>
              <p>• Delays or failures in service delivery</p>
              <p>• Third-party claims or actions arising from your use of the vehicle</p>
            </div>

            <p className="text-gray-600 leading-relaxed mt-4">
              You assume all risks associated with renting and operating the vehicle. NextGearAuto's liability is limited to the rental price paid for the vehicle.
            </p>
          </section>

          {/* Governing Law */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">12. Governing Law & Dispute Resolution</h2>
            <p className="text-gray-600 leading-relaxed mb-4">
              These Terms of Service are governed by and construed in accordance with the laws of the State of New Jersey, without regard to its conflict of law provisions. You agree to submit to the exclusive jurisdiction of the courts located in Jersey City, New Jersey for any legal proceedings.
            </p>

            <p className="text-gray-600 leading-relaxed">
              Any disputes arising from your rental agreement shall be resolved through binding arbitration or small claims court, at the discretion of NextGearAuto.
            </p>
          </section>

          {/* Violation of Terms */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">13. Violation of Terms</h2>
            <p className="text-gray-600 leading-relaxed">
              If you violate any provision of these terms, NextGearAuto may immediately terminate your rental, require return of the vehicle, and pursue legal action to recover damages. Violations may result in being banned from future rentals with NextGearAuto.
            </p>
          </section>

          {/* Entire Agreement */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">14. Entire Agreement</h2>
            <p className="text-gray-600 leading-relaxed">
              These Terms of Service, along with our Privacy Policy and any other referenced documents, constitute the entire agreement between you and NextGearAuto regarding vehicle rentals and supersede all prior agreements and understandings.
            </p>
          </section>

          {/* Contact Information */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">15. Contact Us</h2>
            <p className="text-gray-600 leading-relaxed mb-6">
              If you have questions about these Terms of Service or need to report an issue, please contact us:
            </p>

            <Card className="border-purple-200 bg-white">
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <Mail className="h-5 w-5 text-purple-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-gray-900">Email</p>
                      <p className="text-gray-600">
                        <a href="mailto:contact@rentnextgearauto.com" className="text-purple-600 hover:underline">
                          contact@rentnextgearauto.com
                        </a>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Phone className="h-5 w-5 text-purple-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-gray-900">Phone</p>
                      <p className="text-gray-600">
                        <a href="tel:(551) 429-3472" className="text-purple-600 hover:underline">
                          (551) 429-3472
                        </a>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <MapPin className="h-5 w-5 text-purple-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-gray-900">Address</p>
                      <p className="text-gray-600">92 Forrest Street<br />Jersey City, NJ 07304</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>

          {/* CTA */}
          <section className="mt-12 text-center">
            <Card className="bg-gray-50 border-0">
              <CardContent className="p-8">
                <h3 className="text-xl font-bold text-gray-900">Ready to Rent?</h3>
                <p className="mt-2 text-gray-600">Browse our fleet and book your next vehicle today.</p>
                <div className="mt-6 flex justify-center gap-4">
                  <Link href="/fleet">
                    <Button>View Our Fleet <ArrowRight className="h-4 w-4" /></Button>
                  </Link>
                  <Link href="/location">
                    <Button variant="outline">Contact Us</Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </section>
        </div>
      </PageContainer>
    </>
  );
}
