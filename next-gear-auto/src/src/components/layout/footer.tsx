import React from "react";
import Link from "next/link";
import { Car, Phone, Mail, MapPin } from "lucide-react";
import { CONTACT_INFO, SITE_NAME, NAV_ITEMS } from "@/lib/constants";

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-gray-200 bg-gray-900 text-gray-300">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          {/* Brand */}
          <div className="md:col-span-1">
            <Link href="/" className="flex items-center gap-2">
              <Car className="h-7 w-7 text-purple-400" />
              <span className="text-lg font-bold text-white">
                Next<span className="text-purple-400">Gear</span>Auto
              </span>
            </Link>
            <p className="mt-3 text-sm leading-relaxed text-gray-400">
              Premium car rentals at competitive prices. Your journey starts here.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-white">Quick Links</h3>
            <ul className="space-y-2">
              {NAV_ITEMS.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className="text-sm text-gray-400 transition-colors hover:text-purple-400">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Services */}
          <div>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-white">Services</h3>
            <ul className="space-y-2 text-sm text-gray-400">
              <li>Economy Rentals</li>
              <li>Sedan Rentals</li>
              <li>SUV Rentals</li>
              <li>Truck Rentals</li>
              <li>Long-Term Rentals</li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-white">Contact Us</h3>
            <ul className="space-y-3 text-sm">
              <li className="flex items-start gap-2">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-purple-400" />
                <span>{CONTACT_INFO.address}<br />{CONTACT_INFO.city}, {CONTACT_INFO.state} {CONTACT_INFO.zip}</span>
              </li>
              <li className="flex items-center gap-2">
                <Phone className="h-4 w-4 shrink-0 text-purple-400" />
                <span>{CONTACT_INFO.phone}</span>
              </li>
              <li className="flex items-center gap-2">
                <Mail className="h-4 w-4 shrink-0 text-purple-400" />
                <span>{CONTACT_INFO.email}</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="mt-10 border-t border-gray-800 pt-6 text-center text-xs text-gray-500">
          <p>&copy; {currentYear} {SITE_NAME}. All rights reserved.</p>
          <div className="mt-2 flex justify-center gap-4">
            <Link href="/faq" className="hover:text-purple-400">Privacy Policy</Link>
            <Link href="/faq" className="hover:text-purple-400">Terms of Service</Link>
            <Link href="/faq" className="hover:text-purple-400">Rental Agreement</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
