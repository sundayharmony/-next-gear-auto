"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";

export interface AddressResult {
  address: string;
  city: string;
  state: string;
  zip: string;
  lat: number;
  lng: number;
  name?: string;
}

interface AddressAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onSelect?: (result: AddressResult) => void;
  placeholder?: string;
  className?: string;
}

interface Suggestion {
  id: string;
  mainText: string;
  secondaryText: string;
  result: AddressResult;
}

/* ────────────────────────────────────────
   Parse Google Geocoding API response
   ──────────────────────────────────────── */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseGeocodingResult(r: any): { suggestion: Suggestion; fullAddress: string } {
  const comps: any[] = r.address_components || [];
  let streetNumber = "";
  let route = "";
  let city = "";
  let state = "";
  let zip = "";

  for (const c of comps) {
    const types: string[] = c.types || [];
    if (types.includes("street_number")) streetNumber = c.long_name;
    else if (types.includes("route")) route = c.long_name;
    else if (types.includes("locality")) city = c.long_name;
    else if (types.includes("sublocality_level_1") && !city) city = c.long_name;
    else if (types.includes("administrative_area_level_1")) state = c.short_name;
    else if (types.includes("postal_code")) zip = c.long_name;
  }

  const streetAddress = [streetNumber, route].filter(Boolean).join(" ");
  const loc = r.geometry?.location;
  const secondary = [city, state, zip].filter(Boolean).join(", ");

  return {
    fullAddress: r.formatted_address || "",
    suggestion: {
      id: r.place_id || `geo-${Math.random()}`,
      mainText: streetAddress || r.formatted_address || "",
      secondaryText: secondary,
      result: {
        address: streetAddress || r.formatted_address || "",
        city,
        state,
        zip,
        lat: loc?.lat ?? 0,
        lng: loc?.lng ?? 0,
      },
    },
  };
}

/* ═══════════════════════════════════════════════
   AddressAutocomplete

   Uses the Google Geocoding API for address
   search. This API is reliable, doesn't require
   the Places API, and works with any Maps key.
   ═══════════════════════════════════════════════ */
export function AddressAutocomplete({
  value,
  onChange,
  onSelect,
  placeholder = "Start typing an address...",
  className,
}: AddressAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [loading, setLoading] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY;

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (abortRef.current) abortRef.current.abort();
    };
  }, []);

  /* ── Fetch address suggestions via Geocoding API ── */
  const fetchSuggestions = useCallback(
    async (input: string) => {
      if (!apiKey || input.length < 3) {
        setSuggestions([]);
        setShowDropdown(false);
        return;
      }

      // Abort any in-flight request
      if (abortRef.current) abortRef.current.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setLoading(true);

      try {
        const res = await fetch(
          `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(input)}&components=country:US&key=${apiKey}`,
          { signal: controller.signal }
        );

        if (!res.ok) {
          setSuggestions([]);
          setShowDropdown(false);
          return;
        }

        const data = await res.json();

        if (data.status !== "OK" || !data.results?.length) {
          setSuggestions([]);
          setShowDropdown(false);
          return;
        }

        const mapped = data.results
          .slice(0, 5)
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .map((r: any) => parseGeocodingResult(r).suggestion);

        setSuggestions(mapped);
        setActiveIndex(-1);
        setShowDropdown(mapped.length > 0);
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          setSuggestions([]);
          setShowDropdown(false);
        }
      } finally {
        setLoading(false);
      }
    },
    [apiKey]
  );

  /* ── Handle selection ── */
  const handleSelectSuggestion = useCallback(
    (suggestion: Suggestion) => {
      setShowDropdown(false);
      setSuggestions([]);
      onChange(suggestion.result.address);
      if (onSelect) {
        onSelect(suggestion.result);
      }
    },
    [onChange, onSelect]
  );

  /* ── Input change with debounce ── */
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    onChange(val);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (val.length < 3) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }

    debounceRef.current = setTimeout(() => {
      fetchSuggestions(val);
    }, 300);
  };

  /* ── Keyboard navigation ── */
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showDropdown || suggestions.length === 0) {
      // Allow Enter to submit the form when no dropdown
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (activeIndex >= 0) {
        handleSelectSuggestion(suggestions[activeIndex]);
      }
    } else if (e.key === "Escape") {
      setShowDropdown(false);
    }
  };

  // No API key — plain input
  if (!apiKey) {
    return (
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent ${className || ""}`}
      />
    );
  }

  return (
    <div className="relative">
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (suggestions.length > 0) setShowDropdown(true);
          }}
          placeholder={placeholder}
          autoComplete="off"
          className={`w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent ${className || ""}`}
        />
        {loading && (
          <div className="absolute right-2 top-1/2 -translate-y-1/2">
            <div className="w-4 h-4 border-2 border-purple-300 border-t-purple-600 rounded-full animate-spin" />
          </div>
        )}
      </div>

      {showDropdown && suggestions.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto"
        >
          {suggestions.map((s, i) => (
            <button
              key={s.id}
              type="button"
              className={`w-full text-left px-3 py-2.5 text-sm transition-colors ${
                i === activeIndex ? "bg-purple-50" : "hover:bg-gray-50"
              } ${i > 0 ? "border-t border-gray-100" : ""}`}
              onMouseDown={(e) => {
                e.preventDefault();
                handleSelectSuggestion(s);
              }}
              onMouseEnter={() => setActiveIndex(i)}
            >
              <div className="font-medium text-gray-900">{s.mainText}</div>
              {s.secondaryText && (
                <div className="text-gray-500 text-xs mt-0.5">{s.secondaryText}</div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
