"use client";

import type { RefObject } from "react";
import { User } from "lucide-react";
import { Input } from "@/components/ui/input";
import type { CustomerOption } from "../types";

export function CreateBookingCustomerSearch({
  searchValue,
  searchingCustomers,
  filteredCustomers,
  showDropdown,
  dropdownRef,
  searchInputRef,
  onSearchChange,
  onFocus,
  onSelect,
}: {
  searchValue: string;
  searchingCustomers: boolean;
  filteredCustomers: CustomerOption[];
  showDropdown: boolean;
  dropdownRef: RefObject<HTMLDivElement | null>;
  searchInputRef: RefObject<HTMLInputElement | null>;
  onSearchChange: (value: string) => void;
  onFocus: () => void;
  onSelect: (customer: CustomerOption) => void;
}) {
  return (
    <div ref={dropdownRef} className="relative">
      <div className="relative">
        <Input
          ref={searchInputRef}
          type="text"
          placeholder="Search existing customers by name or email..."
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
          onFocus={onFocus}
          className="pl-9 focus-visible:outline-2 focus-visible:outline-purple-600"
        />
        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
      </div>
      {showDropdown ? (
        <div className="nga-overlay-scroll absolute top-full left-0 right-0 mt-1 max-h-64 overflow-y-auto overscroll-contain rounded-lg border bg-white shadow-xl z-50">
          {searchingCustomers && filteredCustomers.length === 0 ? (
            <div className="px-4 py-3 text-sm text-gray-500 text-center">Searching customers...</div>
          ) : null}
          {!searchingCustomers &&
          filteredCustomers.length === 0 &&
          searchValue.trim().length >= 2 ? (
            <div className="px-4 py-3 text-sm text-gray-500 text-center">
              No customers found for &ldquo;{searchValue}&rdquo;
            </div>
          ) : null}
          {filteredCustomers.map((customer) => {
            const isFromBooking = customer.id.startsWith("booking:");
            return (
              <button
                key={customer.id}
                type="button"
                onClick={() => onSelect(customer)}
                className="w-full text-left px-4 py-2.5 hover:bg-purple-50 transition-colors flex items-center gap-3 border-b border-gray-50 last:border-0"
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                    isFromBooking ? "bg-amber-100 text-amber-600" : "bg-purple-100 text-purple-600"
                  }`}
                >
                  {customer.name?.charAt(0)?.toUpperCase() || "?"}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-sm text-gray-900 truncate">{customer.name}</div>
                  <div className="text-xs text-gray-500 truncate">{customer.email}</div>
                </div>
                {isFromBooking ? (
                  <span className="text-[10px] text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded shrink-0">
                    Past booking
                  </span>
                ) : null}
              </button>
            );
          })}
          {filteredCustomers.length >= 8 ? (
            <div className="px-4 py-2 text-xs text-gray-400 bg-gray-50 border-t text-center">
              {searchingCustomers ? "Searching for more..." : "Type more to narrow results..."}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
