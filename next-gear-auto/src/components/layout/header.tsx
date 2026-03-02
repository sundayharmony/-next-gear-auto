"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Menu, X, Phone, Car, User, LogOut, Shield } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { NAV_ITEMS, CONTACT_INFO } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/context/auth-context";

export function Header() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAuthenticated, logout } = useAuth();

  return (
    <header className="sticky top-0 z-40 w-full border-b border-gray-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
      {/* Top bar */}
      <div className="bg-purple-800 text-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-1.5 text-xs sm:px-6 lg:px-8">
          <a href={`tel:${CONTACT_INFO.phone.replace(/[^\d+]/g, "")}`} className="flex items-center gap-2 hover:text-purple-200 transition-colors">
            <Phone className="h-3 w-3" />
            <span>{CONTACT_INFO.phone}</span>
          </a>
          <div className="hidden sm:block">
            {CONTACT_INFO.hours.weekday} Mon-Fri
          </div>
        </div>
      </div>

      {/* Main nav */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <Car className="h-8 w-8 text-purple-600" />
            <span className="text-xl font-bold text-gray-900">
              Next<span className="text-purple-600">Gear</span>Auto
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex md:items-center md:gap-1">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  pathname === item.href
                    ? "bg-purple-50 text-purple-700"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {/* CTA + Mobile toggle */}
          <div className="flex items-center gap-3">
            <Link href="/booking" className="hidden sm:block">
              <Button size="sm">Book Now</Button>
            </Link>
            {isAuthenticated && user ? (
              <div className="hidden sm:flex items-center gap-2">
                {user.role === "admin" && (
                  <Link href="/admin">
                    <Button variant="outline" size="sm">
                      <Shield className="h-3.5 w-3.5 mr-1" /> Admin
                    </Button>
                  </Link>
                )}
                <Link href="/account">
                  <Button variant="outline" size="sm">
                    <User className="h-3.5 w-3.5 mr-1" /> {user.name.split(" ")[0]}
                  </Button>
                </Link>
                <Button variant="outline" size="sm" onClick={() => { logout(); router.push("/"); }}>
                  <LogOut className="h-3.5 w-3.5" />
                </Button>
              </div>
            ) : (
              <Link href="/login" className="hidden sm:block">
                <Button variant="outline" size="sm">Sign In</Button>
              </Link>
            )}
            <button
              className="rounded-lg p-2 text-gray-600 hover:bg-gray-100 md:hidden"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label="Toggle menu"
            >
              {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {isMobileMenuOpen && (
        <div className="border-t border-gray-200 bg-white md:hidden mobile-menu-enter">
          <div className="space-y-1 px-4 py-3">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "block rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  pathname === item.href
                    ? "bg-purple-50 text-purple-700"
                    : "text-gray-600 hover:bg-gray-50"
                )}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {item.label}
              </Link>
            ))}
            <div className="flex gap-2 pt-3">
              <Link href="/booking" className="flex-1" onClick={() => setIsMobileMenuOpen(false)}>
                <Button className="w-full" size="sm">Book Now</Button>
              </Link>
              {isAuthenticated && user ? (
                <>
                  <Link href="/account" className="flex-1" onClick={() => setIsMobileMenuOpen(false)}>
                    <Button variant="outline" className="w-full" size="sm">
                      <User className="h-3.5 w-3.5 mr-1" /> Account
                    </Button>
                  </Link>
                  {user.role === "admin" && (
                    <Link href="/admin" className="flex-1" onClick={() => setIsMobileMenuOpen(false)}>
                      <Button variant="outline" className="w-full" size="sm">Admin</Button>
                    </Link>
                  )}
                </>
              ) : (
                <Link href="/login" className="flex-1" onClick={() => setIsMobileMenuOpen(false)}>
                  <Button variant="outline" className="w-full" size="sm">Sign In</Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
