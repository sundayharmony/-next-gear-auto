import React from "react";
import { MapPin, Phone, Mail, Clock, Car, Navigation } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageContainer } from "@/components/layout/page-container";
import { CONTACT_INFO, SITE_NAME } from "@/lib/constants";
import { ContactForm } from "@/components/forms/contact-form";

export const metadata = {
  title: "Location & Contact",
  description: "Visit NextGearAuto or get in touch. Find our address, hours, and contact information.",
};

export default function LocationPage() {
  return (
    <>
      {/* Hero */}
      <section className="bg-gradient-to-br from-purple-900 to-gray-900 py-16 text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl font-bold sm:text-5xl">Location & Contact</h1>
          <p className="mt-3 text-lg text-purple-200">
            Visit us in person or reach out — we are here to help.
          </p>
        </div>
      </section>

      <PageContainer className="py-12">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          {/* Contact Info + Map */}
          <div className="lg:col-span-2 space-y-8">
            {/* Google Maps Embed */}
            <Card className="overflow-hidden relative bg-gray-100">
              <noscript>
                <div className="flex h-96 items-center justify-center bg-gray-200 text-center">
                  <p className="text-gray-600">Map requires JavaScript. <a href="https://maps.google.com/maps?q=92+Forrest+Street,+Jersey+City,+NJ+07304" className="text-purple-600 hover:underline">View on Google Maps</a></p>
                </div>
              </noscript>
              <iframe
                src="https://maps.google.com/maps?q=92+Forrest+Street,+Jersey+City,+NJ+07304&t=&z=15&ie=UTF8&iwloc=&output=embed"
                width="100%"
                height="400"
                style={{ border: 0 }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title="NextGearAuto Location - 92 Forrest Street, Jersey City, NJ"
                className="aspect-[16/9] w-full"
              />
            </Card>

            {/* Info Cards */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Card>
                <CardContent className="p-5">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-purple-100">
                      <MapPin className="h-5 w-5 text-purple-600" aria-hidden="true" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">Address</h3>
                      <address className="mt-1 text-sm text-gray-500 not-italic">
                        {CONTACT_INFO.address}<br />
                        {CONTACT_INFO.city}, {CONTACT_INFO.state} {CONTACT_INFO.zip}
                      </address>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-5">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-purple-100">
                      <Phone className="h-5 w-5 text-purple-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">Phone</h3>
                      <p className="mt-1 text-sm text-gray-500">{CONTACT_INFO.phone}</p>
                      <p className="text-xs text-gray-500 mt-0.5">Call or text anytime during business hours</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-5">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-purple-100">
                      <Mail className="h-5 w-5 text-purple-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">Email</h3>
                      <p className="mt-1 text-sm text-gray-500">{CONTACT_INFO.email}</p>
                      <p className="text-xs text-gray-500 mt-0.5">We respond within 24 hours</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-5">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-purple-100">
                      <Clock className="h-5 w-5 text-purple-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">Business Hours</h3>
                      <div className="mt-1 space-y-0.5 text-sm text-gray-500">
                        <p>Mon–Fri: {CONTACT_INFO.hours.weekday}</p>
                        <p>Saturday: {CONTACT_INFO.hours.saturday}</p>
                        <p>Sunday: {CONTACT_INFO.hours.sunday}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Directions */}
            <Card>
              <CardContent className="p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-3">Getting Here</h2>
                <div className="space-y-3 text-sm text-gray-600">
                  <div className="flex items-start gap-2">
                    <Navigation className="h-4 w-4 mt-0.5 text-purple-500 shrink-0" />
                    <p><strong>From Manhattan:</strong> Take the Holland Tunnel to NJ-139 W. Merge onto US-1/9 S, then turn right onto Forrest Street. We are on the left.</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <Navigation className="h-4 w-4 mt-0.5 text-purple-500 shrink-0" />
                    <p><strong>From Newark Airport (EWR):</strong> Take US-1/9 N toward Jersey City. Exit at Forrest Street. About 20 minutes depending on traffic.</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <Car className="h-4 w-4 mt-0.5 text-purple-500 shrink-0" />
                    <p><strong>Parking:</strong> Free customer parking available on-site. Look for the NextGearAuto sign.</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Contact Form */}
          <div>
            <Card className="sticky top-24">
              <CardContent className="p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-1">Send Us a Message</h2>
                <p className="text-sm text-gray-500 mb-6">Have a question? We would love to hear from you.</p>
                <ContactForm />
              </CardContent>
            </Card>
          </div>
        </div>
      </PageContainer>
    </>
  );
}
