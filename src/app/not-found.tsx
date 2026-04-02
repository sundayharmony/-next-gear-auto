import React from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { Car, Search, MapPin, ArrowLeft } from "lucide-react";
import { Instagram } from "@/components/icons/instagram";
import { Button } from "@/components/ui/button";
import { SITE_NAME } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Page Not Found - NextGearAuto",
  description: "The page you're looking for doesn't exist. Browse our fleet or book a car instead.",
};

export default function NotFound() {
  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="text-center max-w-lg">
        {/* 404 Graphic */}
        <div className="relative mx-auto mb-8">
          <span className="text-[10rem] font-black leading-none text-purple-100 select-none">
            404
          </span>
          <Car className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-20 w-20 text-purple-500" />
        </div>

        <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">
          Wrong Turn!
        </h1>
        <p className="mt-3 text-gray-500">
          Looks like this road doesn&apos;t lead anywhere. The page you&apos;re looking for
          may have been moved or no longer exists.
        </p>

        {/* Suggested Links */}
        <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Link
            href="/fleet"
            className="flex flex-col items-center gap-2 rounded-xl border border-gray-200 p-4 transition-all hover:border-purple-300 hover:bg-purple-50"
          >
            <Car className="h-6 w-6 text-purple-600" />
            <span className="text-sm font-medium text-gray-700">Browse Fleet</span>
          </Link>
          <Link
            href="/booking"
            className="flex flex-col items-center gap-2 rounded-xl border border-gray-200 p-4 transition-all hover:border-purple-300 hover:bg-purple-50"
          >
            <Search className="h-6 w-6 text-purple-600" />
            <span className="text-sm font-medium text-gray-700">Book a Car</span>
          </Link>
          <Link
            href="/blog"
            className="flex flex-col items-center gap-2 rounded-xl border border-gray-200 p-4 transition-all hover:border-purple-300 hover:bg-purple-50"
          >
            <Instagram className="h-6 w-6 text-purple-600" />
            <span className="text-sm font-medium text-gray-700">Follow Us</span>
          </Link>
        </div>

        {/* Back Home */}
        <div className="mt-8">
          <Link href="/">
            <Button className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Home
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
