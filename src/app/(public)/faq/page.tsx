import React from "react";
import Link from "next/link";
import { HelpCircle, ArrowRight, FileText, Shield, CreditCard, Car } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageContainer } from "@/components/layout/page-container";
import { FAQAccordion } from "@/components/sections/faq-accordion";
import { generateFAQSchema } from "@/lib/utils/schema-generators";

export const metadata = {
  title: "FAQ & Policies",
  description: "Frequently asked questions about NextGearAuto rentals, policies, pricing, and more.",
};

const generalFaqs = [
  {
    question: "What do I need to rent a vehicle?",
    answer: "You need a valid driver's license, a credit or debit card, and you must be at least 18 years old. During the booking process, you will upload a photo of your driver's license for verification.",
  },
  {
    question: "What is the minimum rental age?",
    answer: "The minimum age to rent from NextGearAuto is 18 years old. All renters must present a valid driver's license.",
  },
  {
    question: "How do I make a reservation?",
    answer: "You can book online through our website using our simple 7-step booking process. Select your dates, choose a vehicle, add any extras, provide your details, verify your ID, review your booking, and complete your payment. It takes just a few minutes!",
  },
  {
    question: "Can someone else drive the rental vehicle?",
    answer: "The rental agreement covers the primary renter only. Additional drivers must be registered and verified separately. Contact us to add an additional driver to your booking.",
  },
  {
    question: "Do you offer long-term rentals?",
    answer: "Yes! We offer daily, weekly, and monthly rates. For rentals of 30 days or more, our monthly rate provides the best value. The system automatically applies the best rate based on your rental duration.",
  },
];

const pricingFaqs = [
  {
    question: "How is the rental price calculated?",
    answer: "Our pricing engine automatically applies the best rate based on your rental duration. Rentals of 30+ days get the monthly rate, 7-29 days get the weekly rate for full weeks plus daily for remaining days, and 1-6 days get the daily rate. Extras, taxes, and fees are added to the base rate.",
  },
  {
    question: "What payment is required at booking?",
    answer: "Full payment for your rental is required at the time of booking to secure your vehicle reservation. This ensures your reservation is confirmed and you can pick up your vehicle on your scheduled date. This payment is separate from the damage deposit.",
  },
  {
    question: "What is the damage deposit?",
    answer: "A damage deposit is held on your credit card as an authorization hold (not a charge). This hold reserves funds in case of vehicle damage. Upon return, if the vehicle is in good condition, the hold is released. The amount varies by vehicle category.",
  },
  {
    question: "Are there any hidden fees?",
    answer: "No. We believe in transparent pricing. Your booking confirmation shows the complete breakdown including base rate, extras, taxes, and all fees. What you see is what you pay.",
  },
];

const cancellationFaqs = [
  {
    question: "What is the cancellation policy?",
    answer: "Free cancellation with a full refund is available up to 24 hours before your scheduled pickup time. Cancellations less than 24 hours before pickup are charged in full with no refund.",
  },
  {
    question: "What happens if I don't show up?",
    answer: "No-shows are charged the full rental amount with no refund. If you cannot make your reservation, please cancel at least 24 hours in advance to receive a full refund.",
  },
  {
    question: "Can I modify my reservation?",
    answer: "Yes, you can modify your reservation dates or vehicle through your account dashboard or by contacting us. Modifications are subject to vehicle availability and may result in a price adjustment.",
  },
];

const insuranceFaqs = [
  {
    question: "Do I need insurance to rent?",
    answer: "Your personal auto insurance or credit card rental coverage may provide coverage. We also offer optional insurance coverage ($15/day) that includes basic collision damage waiver for added peace of mind.",
  },
  {
    question: "What add-ons are available?",
    answer: "We offer insurance coverage ($15/day), child seats ($10/day, max $50), roadside assistance ($8/day for 24/7 towing, lockout, and tire service), and fuel pre-pay (market rate + $10 fee to return the vehicle empty).",
  },
  {
    question: "What happens if the vehicle is damaged?",
    answer: "Damage is assessed upon vehicle return. The damage deposit held on your card may be partially or fully captured to cover repair costs. If you purchased our insurance coverage, the damage waiver may apply depending on the type and extent of damage.",
  },
];

export default function FAQPage() {
  const allFaqs = [...generalFaqs, ...pricingFaqs, ...cancellationFaqs, ...insuranceFaqs];

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(generateFAQSchema(allFaqs)),
        }}
      />

      {/* Hero */}
      <section className="bg-gradient-to-br from-purple-900 to-gray-900 py-16 text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl font-bold sm:text-5xl">FAQ & Policies</h1>
          <p className="mt-3 text-lg text-purple-200">
            Everything you need to know about renting with NextGearAuto.
          </p>
        </div>
      </section>

      {/* Quick links */}
      <div className="border-b border-gray-200 bg-white sticky top-[64px] z-30">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex gap-6 overflow-x-auto py-3 text-sm">
            <a href="#general" className="flex items-center gap-1.5 whitespace-nowrap text-gray-600 hover:text-purple-600 font-medium">
              <HelpCircle className="h-4 w-4" /> General
            </a>
            <a href="#pricing" className="flex items-center gap-1.5 whitespace-nowrap text-gray-600 hover:text-purple-600 font-medium">
              <CreditCard className="h-4 w-4" /> Pricing
            </a>
            <a href="#cancellation" className="flex items-center gap-1.5 whitespace-nowrap text-gray-600 hover:text-purple-600 font-medium">
              <FileText className="h-4 w-4" /> Cancellation
            </a>
            <a href="#insurance" className="flex items-center gap-1.5 whitespace-nowrap text-gray-600 hover:text-purple-600 font-medium">
              <Shield className="h-4 w-4" /> Insurance & Add-Ons
            </a>
          </div>
        </div>
      </div>

      <PageContainer className="py-12">
        <div className="mx-auto max-w-3xl space-y-12">
          {/* General */}
          <section id="general">
            <div className="flex items-center gap-2 mb-6">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-100">
                <HelpCircle className="h-4 w-4 text-purple-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">General Questions</h2>
            </div>
            <FAQAccordion items={generalFaqs} />
          </section>

          {/* Pricing */}
          <section id="pricing">
            <div className="flex items-center gap-2 mb-6">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-100">
                <CreditCard className="h-4 w-4 text-purple-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Pricing & Payments</h2>
            </div>
            <FAQAccordion items={pricingFaqs} />
          </section>

          {/* Cancellation */}
          <section id="cancellation">
            <div className="flex items-center gap-2 mb-6">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-100">
                <FileText className="h-4 w-4 text-purple-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Cancellation & Modifications</h2>
            </div>
            <FAQAccordion items={cancellationFaqs} />

            {/* Policy summary card */}
            <Card className="mt-6 border-purple-200 bg-purple-50">
              <CardContent className="p-5">
                <h3 className="font-semibold text-gray-900 mb-3">Cancellation Policy Summary</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-purple-200">
                        <th className="pb-2 text-left font-medium text-gray-700">Timing</th>
                        <th className="pb-2 text-left font-medium text-gray-700">Refund Status</th>
                      </tr>
                    </thead>
                    <tbody className="text-gray-600">
                      <tr className="border-b border-purple-100">
                        <td className="py-2">24+ hours before</td>
                        <td className="py-2 text-green-600 font-medium">Full refund</td>
                      </tr>
                      <tr className="border-b border-purple-100">
                        <td className="py-2">Less than 24 hours</td>
                        <td className="py-2 text-red-600 font-medium">No refund</td>
                      </tr>
                      <tr>
                        <td className="py-2">No-show</td>
                        <td className="py-2 text-red-600 font-medium">No refund</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </section>

          {/* Insurance */}
          <section id="insurance">
            <div className="flex items-center gap-2 mb-6">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-100">
                <Shield className="h-4 w-4 text-purple-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Insurance & Add-Ons</h2>
            </div>
            <FAQAccordion items={insuranceFaqs} />
          </section>
        </div>

        {/* CTA */}
        <div className="mt-16 text-center">
          <Card className="mx-auto max-w-2xl bg-gray-50 border-0 p-8">
            <h3 className="text-xl font-bold text-gray-900">Still Have Questions?</h3>
            <p className="mt-2 text-gray-500">Our team is happy to help with anything not covered here.</p>
            <div className="mt-6 flex justify-center gap-4">
              <Link href="/location">
                <Button>Contact Us <ArrowRight className="h-4 w-4" /></Button>
              </Link>
              <Link href="/fleet">
                <Button variant="outline">Browse Fleet</Button>
              </Link>
            </div>
          </Card>
        </div>
      </PageContainer>
    </>
  );
}
