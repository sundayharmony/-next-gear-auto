"use client";
import React from "react";
import Link from "next/link";
import { Shield, Mail, Phone, MapPin, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageContainer } from "@/components/layout/page-container";

export const metadata = {
  title: "Privacy Policy",
  description: "NextGearAuto privacy policy - how we collect, use, and protect your personal information.",
};

export default function PrivacyPage() {
  return (
    <>
      {/* Hero */}
      <section className="bg-gradient-to-br from-purple-900 to-gray-900 py-16 text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-start gap-4">
            <Shield className="h-12 w-12 text-purple-400 flex-shrink-0 mt-1" />
            <div>
              <h1 className="text-4xl font-bold sm:text-5xl">Privacy Policy</h1>
              <p className="mt-3 text-lg text-purple-200">
                Your privacy is important to us. Learn how NextGearAuto collects, uses, and protects your information.
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
                This Privacy Policy applies to NextGearAuto and our website at rentnextgearauto.com.
              </p>
            </CardContent>
          </Card>

          {/* Introduction */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Introduction</h2>
            <p className="text-gray-600 leading-relaxed">
              NextGearAuto ("we," "us," "our," or "Company") is committed to protecting your privacy and ensuring you have a positive experience on our website and when renting from us. This Privacy Policy explains how we collect, use, disclose, and otherwise process personal information in connection with our car rental services.
            </p>
          </section>

          {/* Information We Collect */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">1. Information We Collect</h2>
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Personal Identification Information</h3>
                <p className="text-gray-600 leading-relaxed">
                  When you make a reservation or contact us, we collect information such as your name, email address, phone number, residential address, and date of birth. This information is necessary to process your rental and communicate with you.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Driver's License & Identification</h3>
                <p className="text-gray-600 leading-relaxed">
                  To rent a vehicle, we require a valid driver's license. During the booking process, you upload a photo of your driver's license for verification purposes. We verify that your license is valid and that you meet our age and eligibility requirements.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Payment Information</h3>
                <p className="text-gray-600 leading-relaxed">
                  We collect credit or debit card information to process your rental payment and hold a damage deposit. Payment processing is handled by secure third-party payment processors. We do not store full credit card numbers on our systems.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Rental Information</h3>
                <p className="text-gray-600 leading-relaxed">
                  We collect details about your rental including vehicle selection, rental dates, pickup and return times, mileage, fuel level, vehicle condition, and any damages or incidents that occur during your rental period.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Additional Drivers</h3>
                <p className="text-gray-600 leading-relaxed">
                  If you add additional drivers to your rental agreement, we collect their name, license information, and contact details for verification and liability purposes.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Website Usage Information</h3>
                <p className="text-gray-600 leading-relaxed">
                  We automatically collect certain information about how you interact with our website, including IP address, browser type, pages visited, time spent on each page, and referring website. This helps us improve our website and services.
                </p>
              </div>
            </div>
          </section>

          {/* How We Use Information */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">2. How We Use Your Information</h2>
            <div className="space-y-3">
              <div className="flex gap-3">
                <div className="h-6 w-6 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-purple-600 text-sm font-semibold">✓</span>
                </div>
                <div>
                  <p className="text-gray-600"><strong>Booking Management:</strong> To process your rental reservation, confirm bookings, and communicate rental details.</p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="h-6 w-6 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-purple-600 text-sm font-semibold">✓</span>
                </div>
                <div>
                  <p className="text-gray-600"><strong>Customer Communication:</strong> To send you confirmation emails, rental agreements, receipts, and updates about your reservation.</p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="h-6 w-6 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-purple-600 text-sm font-semibold">✓</span>
                </div>
                <div>
                  <p className="text-gray-600"><strong>Payment Processing:</strong> To process deposits, rental payments, and damage claims.</p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="h-6 w-6 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-purple-600 text-sm font-semibold">✓</span>
                </div>
                <div>
                  <p className="text-gray-600"><strong>Verification & Compliance:</strong> To verify your identity, eligibility to rent, and comply with applicable laws and regulations.</p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="h-6 w-6 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-purple-600 text-sm font-semibold">✓</span>
                </div>
                <div>
                  <p className="text-gray-600"><strong>Fraud Prevention:</strong> To detect and prevent fraudulent activities and unauthorized access to your account.</p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="h-6 w-6 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-purple-600 text-sm font-semibold">✓</span>
                </div>
                <div>
                  <p className="text-gray-600"><strong>Service Improvement:</strong> To analyze website usage and customer feedback to improve our services and user experience.</p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="h-6 w-6 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-purple-600 text-sm font-semibold">✓</span>
                </div>
                <div>
                  <p className="text-gray-600"><strong>Marketing Communications:</strong> To send you promotional offers and updates about our services (only if you've opted in).</p>
                </div>
              </div>
            </div>
          </section>

          {/* Data Sharing */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">3. Information Sharing & Disclosure</h2>
            <p className="text-gray-600 leading-relaxed mb-4">
              We respect your privacy and do not sell your personal information. However, we may share your information in the following circumstances:
            </p>

            <div className="space-y-3">
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Payment Processors</h3>
                <p className="text-gray-600 leading-relaxed">
                  We share payment information with secure third-party payment processors to process your rental payments and damage deposits.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Insurance Partners</h3>
                <p className="text-gray-600 leading-relaxed">
                  If you purchase optional insurance coverage, we share necessary rental and driver information with our insurance partners to process claims.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Service Providers</h3>
                <p className="text-gray-600 leading-relaxed">
                  We may share information with trusted service providers who assist us with vehicle maintenance, roadside assistance, and customer support.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Legal Compliance</h3>
                <p className="text-gray-600 leading-relaxed">
                  We may disclose your information if required by law, regulation, court order, or government authority, or if we believe disclosure is necessary to protect our rights or your safety.
                </p>
              </div>
            </div>
          </section>

          {/* Data Security */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">4. Data Security</h2>
            <p className="text-gray-600 leading-relaxed mb-4">
              We take the security of your personal information seriously and implement industry-standard safeguards to protect it from unauthorized access, alteration, and disclosure.
            </p>
            <ul className="space-y-2 text-gray-600">
              <li className="flex gap-2">
                <span className="text-purple-600 font-bold">•</span>
                <span>SSL/TLS encryption for data transmission over our website</span>
              </li>
              <li className="flex gap-2">
                <span className="text-purple-600 font-bold">•</span>
                <span>Secure storage of sensitive information with access restrictions</span>
              </li>
              <li className="flex gap-2">
                <span className="text-purple-600 font-bold">•</span>
                <span>Regular security audits and updates</span>
              </li>
              <li className="flex gap-2">
                <span className="text-purple-600 font-bold">•</span>
                <span>Staff training on data protection and privacy practices</span>
              </li>
            </ul>
            <p className="text-gray-600 leading-relaxed mt-4">
              While we implement strong security measures, no system is completely secure. If you suspect unauthorized access to your account, please contact us immediately.
            </p>
          </section>

          {/* Cookies & Tracking */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">5. Cookies & Tracking Technologies</h2>
            <p className="text-gray-600 leading-relaxed mb-4">
              Our website uses cookies and similar tracking technologies to enhance your experience and analyze website usage.
            </p>
            <div className="space-y-3">
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Essential Cookies</h3>
                <p className="text-gray-600 leading-relaxed">
                  These cookies are necessary for basic website functionality, including maintaining your session and processing bookings.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Analytics Cookies</h3>
                <p className="text-gray-600 leading-relaxed">
                  We use analytics cookies to understand how visitors interact with our website, including which pages are visited and time spent on each page.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Marketing Cookies</h3>
                <p className="text-gray-600 leading-relaxed">
                  With your consent, we may use cookies to track your interests and deliver targeted marketing messages.
                </p>
              </div>
            </div>
            <p className="text-gray-600 leading-relaxed mt-4">
              You can control cookie settings through your browser preferences. Disabling certain cookies may affect website functionality.
            </p>
          </section>

          {/* Your Rights */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">6. Your Privacy Rights</h2>
            <p className="text-gray-600 leading-relaxed mb-4">
              As a resident of New Jersey, you have certain rights regarding your personal information:
            </p>

            <div className="space-y-4 bg-purple-50 p-6 rounded-lg border border-purple-200">
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Right to Access</h3>
                <p className="text-gray-600 leading-relaxed">
                  You have the right to request and access the personal information we hold about you.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Right to Correction</h3>
                <p className="text-gray-600 leading-relaxed">
                  You may request that we correct or update inaccurate personal information.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Right to Deletion</h3>
                <p className="text-gray-600 leading-relaxed">
                  You may request that we delete your personal information, subject to legal retention requirements.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Right to Opt-Out</h3>
                <p className="text-gray-600 leading-relaxed">
                  You may opt out of marketing communications and certain data processing activities at any time.
                </p>
              </div>
            </div>

            <p className="text-gray-600 leading-relaxed mt-4">
              To exercise any of these rights, please contact us using the information provided at the end of this policy.
            </p>
          </section>

          {/* Data Retention */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">7. Data Retention</h2>
            <p className="text-gray-600 leading-relaxed">
              We retain your personal information for as long as necessary to fulfill the purposes outlined in this policy or as required by law. For rental agreements and payment records, we typically retain information for at least 3 years to comply with insurance and legal requirements. You may request deletion of your information at any time, subject to applicable legal obligations.
            </p>
          </section>

          {/* Third-Party Links */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">8. Third-Party Links</h2>
            <p className="text-gray-600 leading-relaxed">
              Our website may contain links to third-party websites. We are not responsible for the privacy practices of these external sites. We encourage you to review the privacy policies of any third-party services before providing your information.
            </p>
          </section>

          {/* Children's Privacy */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">9. Children's Privacy</h2>
            <p className="text-gray-600 leading-relaxed">
              Our services are not intended for individuals under the age of 18. We do not knowingly collect personal information from children. If we become aware that we have collected information from a child, we will take steps to delete such information promptly.
            </p>
          </section>

          {/* Policy Changes */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">10. Changes to This Privacy Policy</h2>
            <p className="text-gray-600 leading-relaxed">
              We may update this Privacy Policy from time to time to reflect changes in our practices or applicable laws. We will notify you of significant changes by updating the "Last Updated" date and, when appropriate, by providing additional notice. Your continued use of our website and services following the posting of changes constitutes your acceptance of the updated policy.
            </p>
          </section>

          {/* Contact Information */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">11. Contact Us</h2>
            <p className="text-gray-600 leading-relaxed mb-6">
              If you have questions about this Privacy Policy, your personal information, or our privacy practices, please contact us:
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
                <h3 className="text-xl font-bold text-gray-900">Have More Questions?</h3>
                <p className="mt-2 text-gray-600">Our team is here to help and address any privacy concerns.</p>
                <div className="mt-6 flex justify-center gap-4">
                  <Link href="/fleet">
                    <Button>Browse Our Fleet <ArrowRight className="h-4 w-4" /></Button>
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
