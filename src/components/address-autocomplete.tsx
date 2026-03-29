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

/* ────────────────────────────────────────────
   Google Maps script loader (shared singleton)
   ──────────────────────────────────────────── */
let mapsLoadPromise: Promise<void> | null = null;

function loadGoogleMaps(): Promise<void> {
  if (mapsLoadPromise) return mapsLoadPromise;
  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY;
  if (!key) return Promise.reject(new Error("No Google Maps API key"));

  if (typeof google !== "undefined" && google.maps) {
    return Promise.resolve();
  }

  mapsLoadPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector(
      'script[src*="maps.googleapis.com"]'
    );
    if (existing) {
      if (typeof google !== "undefined" && google.maps) {
        resolve();
        return;
      }
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${key}&libraries=places&v=weekly`;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Google Maps"));
    document.head.appendChild(script);
  });

  return mapsLoadPromise;
}

/* ────────────────────────────────────────
   Suggestion type from the new Places API
   ──────────────────────────────────────── */
interface Suggestion {
  placeId: string;
  text: string;
  secondary: string;
}

/* ────────────────────────────────────────
   Extract address components from a Place
   ──────────────────────────────────────── */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractAddressFromPlace(place: any): AddressResult {
  const comps = place.addressComponents || [];
  let streetNumber = "";
  let route = "";
  let city = "";
  let state = "";
  let zip = "";

  for (const c of comps) {
    const types: string[] = c.types || [];
    const long = c.longText || c.long_name || "";
    const short = c.shortText || c.short_name || "";
    if (types.includes("street_number")) streetNumber = long;
    else if (types.includes("route")) route = long;
    else if (types.includes("locality")) city = long;
    else if (types.includes("sublocality_level_1") && !city) city = long;
    else if (types.includes("administrative_area_level_1")) state = short;
    else if (types.includes("postal_code")) zip = long;
  }

  const address = [streetNumber, route].filter(Boolean).join(" ");
  let lat = 0;
  let lng = 0;
  if (place.location) {
    lat =
      typeof place.location.lat === "function"
        ? place.location.lat()
        : place.location.lat ?? 0;
    lng =
      typeof place.location.lng === "function"
        ? place.location.lng()
        : place.location.lng ?? 0;
  }

  return {
    address: address || place.formattedAddress || "",
    city,
    state,
    zip,
    lat,
    lng,
    name: place.displayName?.text || place.displayName || place.name || undefined,
  };
}

/* ═══════════════════════════════════════════
   AddressAutocomplete component
   ═══════════════════════════════════════════ */
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
  const [ready, setReady] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sessionTokenRef = useRef<unknown>(null);

  // Load Google Maps on mount
  useEffect(() => {
    let cancelled = false;
    loadGoogleMaps()
      .then(() => {
        if (!cancelled) setReady(true);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  // Close dropdown when clicking outside
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

  // Fetch suggestions using the new AutocompleteSuggestion API
  const fetchSuggestions = useCallback(
    async (input: string) => {
      if (!ready || input.length < 3) {
        setSuggestions([]);
        setShowDropdown(false);
        return;
      }

      try {
        // Ensure we have the places library
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const placesLib = (await (google.maps as any).importLibrary(
          "places"
        )) as any;

        // Create session token for grouping requests (reduces cost)
        if (!sessionTokenRef.current && placesLib.AutocompleteSessionToken) {
          sessionTokenRef.current = new placesLib.AutocompleteSessionToken();
        }

        const request: Record<string, unknown> = {
          input,
          includedRegionCodes: ["us"],
          language: "en",
        };
        if (sessionTokenRef.current) {
          request.sessionToken = sessionTokenRef.current;
        }

        const { suggestions: results } =
          await placesLib.AutocompleteSuggestion.fetchAutocompleteSuggestions(
            request
          );

        if (!results || results.length === 0) {
          setSuggestions([]);
          setShowDropdown(false);
          return;
        }

        const mapped: Suggestion[] = results
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .filter((s: any) => s.placePrediction)
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .map((s: any) => ({
            placeId: s.placePrediction.placeId,
            text: s.placePrediction.text?.text || "",
            secondary: s.placePrediction.structuredFormat?.secondaryText?.text || "",
          }));

        setSuggestions(mapped);
        setActiveIndex(-1);
        setShowDropdown(mapped.length > 0);
      } catch (err) {
        // Fallback: try legacy AutocompleteService if new API isn't available
        try {
          await fetchSuggestionsLegacy(input);
        } catch {
          console.warn("Address autocomplete unavailable:", err);
          setSuggestions([]);
        }
      }
    },
    [ready]
  );

  // Legacy fallback using AutocompleteService (for keys where the old API is still enabled)
  const fetchSuggestionsLegacy = useCallback(
    async (input: string) => {
      const service = new google.maps.places.AutocompleteService();
      const results = await new Promise<google.maps.places.AutocompletePrediction[]>(
        (resolve, reject) => {
          service.getPlacePredictions(
            {
              input,
              types: ["address"],
              componentRestrictions: { country: "us" },
            },
            (predictions, status) => {
              if (
                status === google.maps.places.PlacesServiceStatus.OK &&
                predictions
              ) {
                resolve(predictions);
              } else {
                reject(new Error(status));
              }
            }
          );
        }
      );

      const mapped: Suggestion[] = results.map((p) => ({
        placeId: p.place_id,
        text: p.structured_formatting?.main_text || p.description,
        secondary: p.structured_formatting?.secondary_text || "",
      }));

      setSuggestions(mapped);
      setActiveIndex(-1);
      setShowDropdown(mapped.length > 0);
    },
    []
  );

  // Select a suggestion and fetch full place details
  const handleSelect = useCallback(
    async (suggestion: Suggestion) => {
      setShowDropdown(false);
      onChange(suggestion.text + (suggestion.secondary ? ", " + suggestion.secondary : ""));

      if (!onSelect) return;

      try {
        // Try new Place API first
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const placesLib = (await (google.maps as any).importLibrary(
          "places"
        )) as any;

        if (placesLib.Place) {
          const placeReq: Record<string, unknown> = {
            id: suggestion.placeId,
          };
          const place = new placesLib.Place(placeReq);
          await place.fetchFields({
            fields: [
              "addressComponents",
              "formattedAddress",
              "location",
              "displayName",
            ],
          });
          const result = extractAddressFromPlace(place);
          onSelect(result);
          onChange(result.address || suggestion.text);
          // Reset session token after selection
          sessionTokenRef.current = null;
          return;
        }
      } catch {
        // Fall through to legacy
      }

      // Legacy fallback: PlacesService.getDetails
      try {
        const dummyDiv = document.createElement("div");
        const service = new google.maps.places.PlacesService(dummyDiv);
        service.getDetails(
          {
            placeId: suggestion.placeId,
            fields: [
              "address_components",
              "formatted_address",
              "geometry",
              "name",
            ],
          },
          (place, status) => {
            if (
              status === google.maps.places.PlacesServiceStatus.OK &&
              place
            ) {
              const comps = place.address_components || [];
              let streetNumber = "";
              let route = "";
              let city = "";
              let state = "";
              let zip = "";
              for (const c of comps) {
                if (c.types.includes("street_number"))
                  streetNumber = c.long_name;
                else if (c.types.includes("route")) route = c.long_name;
                else if (c.types.includes("locality")) city = c.long_name;
                else if (
                  c.types.includes("sublocality_level_1") &&
                  !city
                )
                  city = c.long_name;
                else if (c.types.includes("administrative_area_level_1"))
                  state = c.short_name;
                else if (c.types.includes("postal_code"))
                  zip = c.long_name;
              }
              const address = [streetNumber, route].filter(Boolean).join(" ");
              onSelect({
                address: address || place.formatted_address || "",
                city,
                state,
                zip,
                lat: place.geometry?.location?.lat() ?? 0,
                lng: place.geometry?.location?.lng() ?? 0,
                name: place.name || undefined,
              });
              onChange(address || place.formatted_address || suggestion.text);
            }
          }
        );
      } catch (err) {
        console.warn("Failed to fetch place details:", err);
      }
    },
    [onChange, onSelect]
  );

  // Handle input change with debounce
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    onChange(val);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchSuggestions(val);
    }, 300);
  };

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showDropdown || suggestions.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((prev) =>
        prev < suggestions.length - 1 ? prev + 1 : 0
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((prev) =>
        prev > 0 ? prev - 1 : suggestions.length - 1
      );
    } else if (e.key === "Enter" && activeIndex >= 0) {
      e.preventDefault();
      handleSelect(suggestions[activeIndex]);
    } else if (e.key === "Escape") {
      setShowDropdown(false);
    }
  };

  // If no API key, render plain input
  if (!process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY) {
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
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onFocus={() => {
          if (suggestions.length > 0) setShowDropdown(true);
        }}
        placeholder={ready ? placeholder : "Loading..."}
        autoComplete="off"
        className={`w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent ${className || ""}`}
      />

      {showDropdown && suggestions.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto"
        >
          {suggestions.map((s, i) => (
            <button
              key={s.placeId}
              type="button"
              className={`w-full text-left px-3 py-2 text-sm hover:bg-purple-50 transition-colors ${
                i === activeIndex ? "bg-purple-50" : ""
              } ${i > 0 ? "border-t border-gray-100" : ""}`}
              onMouseDown={(e) => {
                e.preventDefault(); // Prevent input blur before click
                handleSelect(s);
              }}
              onMouseEnter={() => setActiveIndex(i)}
            >
              <span className="font-medium text-gray-900">{s.text}</span>
              {s.secondary && (
                <span className="text-gray-500 ml-1 text-xs">
                  {s.secondary}
                </span>
              )}
            </button>
          ))}
          <div className="px-3 py-1 text-[10px] text-gray-400 border-t border-gray-100">
            Powered by Google
          </div>
        </div>
      )}
    </div>
  );
}
