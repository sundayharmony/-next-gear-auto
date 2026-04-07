"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Menu, X, Phone, Car, User, LogOut, Shield } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { NAV_ITEMS, CONTACT_INFO } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/context/auth-context";

export function Header() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading, logout } = useAuth();
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  // Close mobile menu when pathname changes (Bug 37)
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  // Lock body scroll when mobile menu is open (Bug 4)
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isMobileMenuOpen]);

  // Restore focus to hamburger button when menu closes
  useEffect(() => {
    if (!isMobileMenuOpen && menuButtonRef.current) {
      menuButtonRef.current.focus();
    }
  }, [isMobileMenuOpen]);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-gray-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:bg-purple-600 focus:text-white focus:px-4 focus:py-2 focus:rounded-md">Skip to main content</a>
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
            <Car className="h-8 w-8 text-purple-600 flex-shrink-0" />
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
                  "rounded-lg px-3 py-2 text-sm font-medium transition-colors focus-visible:text-purple-600 focus-visible:outline-2 focus-visible:outline-purple-600 outline-none",
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
            {!authLoading && (isAuthenticated && user ? (
              <div className="hidden sm:flex items-center gap-2">
                {user.role === "admin" ? (
                  <Link href="/admin">
                    <Button variant="outline" size="sm">
                      <Shield className="h-3.5 w-3.5 mr-1" /> Admin
                    </Button>
                  </Link>
                ) : (
                  <Link href="/account">
                    <Button variant="outline" size="sm">
                      <User className="h-3.5 w-3.5 mr-1" /> {(user.name || "Account").split(" ")[0]}
                    </Button>
                  </Link>
                )}
                <Button variant="outline" size="sm" onClick={async () => { setLoggingOut(true); await logout(); router.push("/"); }} disabled={loggingOut} aria-label="Sign out">
                  <LogOut className="h-3.5 w-3.5" />
                </Button>
              </div>
            ) : (
              <Link href="/login" className="hidden sm:block">
                <Button variant="outline" size="sm">Sign In</Button>
              </Link>
            ))}
            <button
              ref={menuButtonRef}
              className="rounded-lg p-3 text-gray-600 hover:bg-gray-100 md:hidden"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label="Toggle menu"
              aria-expanded={isMobileMenuOpen}
            >
              {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu backdrop */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 z-30 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Mobile menu */}
      {isMobileMenuOpen && (
        <div className="relative z-40 border-t border-gray-200 bg-white md:hidden mobile-menu-enter">
          <div className="space-y-2 px-4 py-3">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "block rounded-lg px-3 py-3 text-sm font-medium transition-colors focus-visible:text-purple-600 focus-visible:outline-2 focus-visible:outline-purple-600 outline-none",
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
              {!authLoading && (isAuthenticated && user ? (
                <>
                  {user.role === "admin" ? (
                    <Link href="/admin" className="flex-1" onClick={() => setIsMobileMenuOpen(false)}>
                      <Button variant="outline" className="w-full" size="sm">
                        <Shield className="h-3.5 w-3.5 mr-1" /> Admin
                      </Button>
                    </Link>
                  ) : (
                    <Link href="/account" className="flex-1" onClick={() => setIsMobileMenuOpen(false)}>
                      <Button variant="outline" className="w-full" size="sm">
                        <User className="h-3.5 w-3.5 mr-1" /> Account
                      </Button>
                    </Link>
                  )}
                </>
              ) : (
                <Link href="/login" className="flex-1" onClick={() => setIsMobileMenuOpen(false)}>
                  <Button variant="outline" className="w-full" size="sm">Sign In</Button>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
