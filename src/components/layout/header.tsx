"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Menu, X, Phone, Car, User, LogOut, Shield } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { NAV_ITEMS, CONTACT_INFO } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/context/auth-context";
import { getUserRoles } from "@/lib/auth/user-roles";

export function Header() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading, logout } = useAuth();
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  const panelLinks = (() => {
    const roles = getUserRoles(user);
    const links: { href: string; label: string; staff: boolean }[] = [];
    if (roles.includes("admin")) links.push({ href: "/admin", label: "Admin", staff: true });
    if (roles.includes("manager")) links.push({ href: "/manager", label: "Manager", staff: true });
    if (roles.includes("owner")) links.push({ href: "/owner", label: "Owner", staff: true });
    if (links.length === 0) {
      links.push({
        href: "/account",
        label: (user?.name || "Account").split(" ")[0],
        staff: false,
      });
    }
    return links;
  })();

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

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

  useEffect(() => {
    if (!isMobileMenuOpen && menuButtonRef.current) {
      menuButtonRef.current.focus();
    }
  }, [isMobileMenuOpen]);

  return (
    <header className="site-header">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:bg-purple-600 focus:text-white focus:px-4 focus:py-2 focus:rounded-md"
      >
        Skip to main content
      </a>
      <div className="site-header-ribbon">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-1.5 text-xs sm:px-6 lg:px-8">
          <a
            href={`tel:${CONTACT_INFO.phone.replace(/[^\d+]/g, "")}`}
            className="flex items-center gap-2"
          >
            <Phone className="h-3 w-3" />
            <span>{CONTACT_INFO.phone}</span>
          </a>
          <div className="hidden sm:block text-purple-100/90">
            {CONTACT_INFO.hours.weekday} Mon-Fri
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <Link href="/" className="site-logo flex items-center gap-2">
            <Car className="h-8 w-8 text-purple-600 flex-shrink-0 drop-shadow-sm" />
            <span className="text-xl font-bold">
              Next<span className="site-logo-accent">Gear</span>Auto
            </span>
          </Link>

          <nav className="hidden md:flex md:items-center md:gap-1">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "nav-link rounded-lg px-3 py-2 text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-purple-500/40",
                  pathname === item.href && "nav-link--active"
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <Link href="/booking" className="hidden sm:block">
              <Button size="sm">Book Now</Button>
            </Link>
            {!authLoading &&
              (isAuthenticated && user ? (
                <div className="hidden sm:flex items-center gap-2">
                  {panelLinks.map((panelLink) => (
                    <Link key={panelLink.href} href={panelLink.href}>
                      <Button variant="outline" size="sm">
                        {panelLink.staff ? (
                          <Shield className="h-3.5 w-3.5 mr-1" />
                        ) : (
                          <User className="h-3.5 w-3.5 mr-1" />
                        )}{" "}
                        {panelLink.label}
                      </Button>
                    </Link>
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      setLoggingOut(true);
                      await logout();
                      router.push("/");
                    }}
                    disabled={loggingOut}
                    aria-label="Sign out"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ) : (
                <Link href="/login" className="hidden sm:block">
                  <Button variant="outline" size="sm">
                    Sign In
                  </Button>
                </Link>
              ))}
            <button
              ref={menuButtonRef}
              className="site-header-icon-btn rounded-lg p-3 md:hidden"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label="Toggle menu"
              aria-expanded={isMobileMenuOpen}
            >
              {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 z-30 md:hidden bg-purple-950/20 backdrop-blur-[2px]"
          onClick={() => setIsMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      {isMobileMenuOpen && (
        <div className="relative z-40 site-header-mobile-menu md:hidden mobile-menu-enter">
          <div className="space-y-2 px-4 py-3">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "nav-link block rounded-lg px-3 py-3 text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-purple-500/40",
                  pathname === item.href && "nav-link--active"
                )}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {item.label}
              </Link>
            ))}
            <div className="flex gap-2 pt-3 border-t border-purple-100/80">
              <Link href="/booking" className="flex-1" onClick={() => setIsMobileMenuOpen(false)}>
                <Button className="w-full" size="sm">
                  Book Now
                </Button>
              </Link>
              {!authLoading &&
                (isAuthenticated && user ? (
                  <>
                    {panelLinks.map((panelLink) => (
                      <Link
                        key={panelLink.href}
                        href={panelLink.href}
                        className="flex-1"
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        <Button variant="outline" className="w-full" size="sm">
                          {panelLink.staff ? (
                            <Shield className="h-3.5 w-3.5 mr-1" />
                          ) : (
                            <User className="h-3.5 w-3.5 mr-1" />
                          )}{" "}
                          {panelLink.label}
                        </Button>
                      </Link>
                    ))}
                  </>
                ) : (
                  <Link href="/login" className="flex-1" onClick={() => setIsMobileMenuOpen(false)}>
                    <Button variant="outline" className="w-full" size="sm">
                      Sign In
                    </Button>
                  </Link>
                ))}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
