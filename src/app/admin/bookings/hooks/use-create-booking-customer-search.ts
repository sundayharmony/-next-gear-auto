"use client";

import { useEffect, useRef, useState } from "react";
import { adminFetch } from "@/lib/utils/admin-fetch";
import type { CustomerOption } from "../types";

export function useCreateBookingCustomerSearch(allCustomers: CustomerOption[]) {
  const [filteredCustomers, setFilteredCustomers] = useState<CustomerOption[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [searchingCustomers, setSearchingCustomers] = useState(false);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSearchChange = (value: string) => {
    setSearchValue(value);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);

    searchTimeoutRef.current = setTimeout(async () => {
      if (!value.trim()) {
        setFilteredCustomers([]);
        setShowDropdown(false);
        return;
      }

      const localFiltered = allCustomers.filter(
        (c) =>
          (c.name || "").toLowerCase().includes(value.toLowerCase()) ||
          (c.email || "").toLowerCase().includes(value.toLowerCase())
      );
      if (localFiltered.length > 0) {
        setFilteredCustomers(localFiltered.slice(0, 8));
        setShowDropdown(true);
      }

      if (value.trim().length < 2) {
        setShowDropdown(true);
        return;
      }

      setSearchingCustomers(true);
      try {
        const [customersRes, bookingsRes] = await Promise.all([
          adminFetch(`/api/admin/customers?search=${encodeURIComponent(value.trim())}&limit=20`),
          adminFetch(`/api/bookings?search=${encodeURIComponent(value.trim())}&limit=30`),
        ]);

        const seen = new Set(localFiltered.map((c) => c.id));
        const seenEmails = new Set(localFiltered.map((c) => c.email?.toLowerCase()));
        const merged = [...localFiltered];

        if (customersRes.ok) {
          const data = await customersRes.json();
          if (data.success && data.data) {
            for (const c of data.data) {
              if (seen.has(c.id)) continue;
              seen.add(c.id);
              seenEmails.add(c.email?.toLowerCase());
              merged.push({
                id: c.id,
                name: c.name,
                email: c.email,
                phone: c.phone || "",
              });
            }
          }
        }

        if (bookingsRes.ok) {
          const bookingsData = await bookingsRes.json();
          if (bookingsData.success && bookingsData.data) {
            for (const b of bookingsData.data) {
              const email = b.customerEmail || b.customer_email;
              const name = b.customerName || b.customer_name;
              const phone = b.customerPhone || b.customer_phone || "";
              if (email && !seenEmails.has(email.toLowerCase())) {
                seenEmails.add(email.toLowerCase());
                merged.push({
                  id: `booking:${b.id}`,
                  name: name || "Unknown",
                  email,
                  phone,
                });
              }
            }
          }
        }

        setFilteredCustomers(merged.slice(0, 8));
      } catch {
        // Keep local results if the server search fails.
      } finally {
        setSearchingCustomers(false);
      }
      setShowDropdown(true);
    }, 300);
  };

  return {
    filteredCustomers,
    showDropdown,
    setShowDropdown,
    searchValue,
    setSearchValue,
    searchingCustomers,
    dropdownRef,
    searchInputRef,
    handleSearchChange,
  };
}
