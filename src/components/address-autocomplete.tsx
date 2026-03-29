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

/* ────────────────────────────────────────
   Suggestion displayed in the dropdown
   ──────────────────────────────────────── */
interface Suggestion {
  id: string;
  text: string;
  secondary: string;
  // For geocoding results we already have full data; for Places we need a second fetch
  source: "places-new" | "places-legacy" | "geocoding";
  // Pre-resolved data (only for geocoding results)
  resolved?: AddressResult;
}

/* ────────────────────────────────────────
   Extract address parts from geocoding
   ──────────────────────────────────────── */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseGeocodingResult(result: any): AddressResult {
  const comps: any[] = result.address_components || [];
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

  const address = [streetNumber, route].filter(Boolean).join(" ");
  const loc = result.geometry?.location;

  return {
    address: address || result.formatted_address || "",
    city,
    state,
    zip,
    lat: loc?.lat ?? 0,
    lng: loc?.lng ?? 0,
  };
}

/* ════════════════════════════════════════════
   AddressAutocomplete component

   Tries three strategies in order:
   1. Places API (New) — AutocompleteSuggestion
   2. Places API (Legacy) — AutocompleteService
   3. Geocoding API — forward geocode the typed text

   Strategy 3 is the reliable fallback because the
   Geocoding API is almost always enabled when the
   Maps JavaScript API is active.
   ════════════════════════════════════════════ */
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

  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Track which strategy works so we skip failed ones on subsequent keystrokes
  const strategyRef = useRef<"places-new" | "places-legacy" | "geocoding" | "auto">("auto");

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

  /* ── Strategy 1: Places API (New) ── */
  const tryPlacesNew = useCallback(async (input: string): Promise<Suggestion[] | null> => {
    if (typeof google === "undefined" || !google.maps) return null;
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const placesLib = (await (google.maps as any).importLibrary("places")) as any;
      if (!placesLib.AutocompleteSuggestion) return null;

      const { suggestions: results } =
        await placesLib.AutocompleteSuggestion.fetchAutocompleteSuggestions({
          input,
          includedRegionCodes: ["us"],
          language: "en",
        });

      if (!results?.length) return [];

      return results
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .filter((s: any) => s.placePrediction)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((s: any) => ({
          id: s.placePrediction.placeId,
          text: s.placePrediction.text?.text || "",
          secondary: s.placePrediction.structuredFormat?.secondaryText?.text || "",
          source: "places-new" as const,
        }));
    } catch {
      return null; // signal: try next strategy
    }
  }, []);

  /* ── Strategy 2: Places API (Legacy) ── */
  const tryPlacesLegacy = useCallback(async (input: string): Promise<Suggestion[] | null> => {
    if (typeof google === "undefined" || !google.maps?.places?.AutocompleteService) return null;
    try {
      const service = new google.maps.places.AutocompleteService();
      const predictions = await new Promise<google.maps.places.AutocompletePrediction[] | null>(
        (resolve) => {
          service.getPlacePredictions(
            { input, types: ["address"], componentRestrictions: { country: "us" } },
            (preds, status) => {
              resolve(status === google.maps.places.PlacesServiceStatus.OK ? preds : null);
            }
          );
        }
      );
      if (!predictions) return null;
      return predictions.map((p) => ({
        id: p.place_id,
        text: p.structured_formatting?.main_text || p.description,
        secondary: p.structured_formatting?.secondary_text || "",
        source: "places-legacy" as const,
      }));
    } catch {
      return null;
    }
  }, []);

  /* ── Strategy 3: Geocoding API (always-available fallback) ── */
  const tryGeocoding = useCallback(async (input: string): Promise<Suggestion[] | null> => {
    if (!apiKey) return null;
    try {
      const res = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(input)}&components=country:US&key=${apiKey}`
      );
      if (!res.ok) return null;
      const data = await res.json();
      if (!data.results?.length) return [];

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return data.results.slice(0, 5).map((r: any, i: number) => {
        const parsed = parseGeocodingResult(r);
        return {
          id: `geo-${i}`,
          text: parsed.address || r.formatted_address,
          secondary: [parsed.city, parsed.state, parsed.zip].filter(Boolean).join(", "),
          source: "geocoding" as const,
          resolved: parsed,
        };
      });
    } catch {
      return null;
    }
  }, [apiKey]);

  /* ── Main fetch: try strategies in order ── */
  const fetchSuggestions = useCallback(
    async (input: string) => {
      if (input.length < 3) {
        setSuggestions([]);
        setShowDropdown(false);
        return;
      }

      let results: Suggestion[] | null = null;
      const strategy = strategyRef.current;

      // Try in order, but skip strategies that already failed
      if (strategy === "auto" || strategy === "places-new") {
        results = await tryPlacesNew(input);
        if (results !== null && results.length > 0) {
          strategyRef.current = "places-new";
        } else if (results === null) {
          // Places new not available, try next
          results = null;
        }
      }

      if (results === null && (strategy === "auto" || strategy === "places-legacy")) {
        results = await tryPlacesLegacy(input);
        if (results !== null && results.length > 0) {
          strategyRef.current = "places-legacy";
        } else if (results === null) {
          results = null;
        }
      }

      if (results === null || (results.length === 0 && strategy === "auto")) {
        results = await tryGeocoding(input);
        if (results !== null && results.length > 0) {
          strategyRef.current = "geocoding";
        }
      }

      const final = results || [];
      setSuggestions(final);
      setActiveIndex(-1);
      setShowDropdown(final.length > 0);
    },
    [tryPlacesNew, tryPlacesLegacy, tryGeocoding]
  );

  /* ── Handle selection ── */
  const handleSelect = useCallback(
    async (suggestion: Suggestion) => {
      setShowDropdown(false);
      const displayText = suggestion.text + (suggestion.secondary ? ", " + suggestion.secondary : "");
      onChange(displayText);

      if (!onSelect) return;

      // Geocoding results already have full data
      if (suggestion.source === "geocoding" && suggestion.resolved) {
        onSelect(suggestion.resolved);
        onChange(suggestion.resolved.address || displayText);
        return;
      }

      // For Places results, fetch details
      try {
        // Try new Place class
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const placesLib = (await (google.maps as any).importLibrary("places")) as any;
        if (placesLib.Place) {
          const place = new placesLib.Place({ id: suggestion.id });
          await place.fetchFields({
            fields: ["addressComponents", "formattedAddress", "location", "displayName"],
          });
          const comps = place.addressComponents || [];
          let streetNumber = "", route = "", city = "", state = "", zip = "";
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
          let lat = 0, lng = 0;
          if (place.location) {
            lat = typeof place.location.lat === "function" ? place.location.lat() : place.location.lat ?? 0;
            lng = typeof place.location.lng === "function" ? place.location.lng() : place.location.lng ?? 0;
          }
          const result: AddressResult = {
            address: address || place.formattedAddress || "",
            city, state, zip, lat, lng,
            name: place.displayName?.text || place.displayName || undefined,
          };
          onSelect(result);
          onChange(result.address || displayText);
          return;
        }
      } catch { /* fall through */ }

      // Legacy PlacesService.getDetails fallback
      try {
        const dummyDiv = document.createElement("div");
        const service = new google.maps.places.PlacesService(dummyDiv);
        service.getDetails(
          {
            placeId: suggestion.id,
            fields: ["address_components", "formatted_address", "geometry", "name"],
          },
          (place, status) => {
            if (status === google.maps.places.PlacesServiceStatus.OK && place) {
              const comps = place.address_components || [];
              let streetNumber = "", route = "", city = "", state = "", zip = "";
              for (const c of comps) {
                if (c.types.includes("street_number")) streetNumber = c.long_name;
                else if (c.types.includes("route")) route = c.long_name;
                else if (c.types.includes("locality")) city = c.long_name;
                else if (c.types.includes("sublocality_level_1") && !city) city = c.long_name;
                else if (c.types.includes("administrative_area_level_1")) state = c.short_name;
                else if (c.types.includes("postal_code")) zip = c.long_name;
              }
              const address = [streetNumber, route].filter(Boolean).join(" ");
              onSelect({
                address: address || place.formatted_address || "",
                city, state, zip,
                lat: place.geometry?.location?.lat() ?? 0,
                lng: place.geometry?.location?.lng() ?? 0,
                name: place.name || undefined,
              });
              onChange(address || place.formatted_address || displayText);
            }
          }
        );
      } catch {
        // Last resort: just use the displayed text
      }
    },
    [onChange, onSelect]
  );

  /* ── Input change with debounce ── */
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    onChange(val);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchSuggestions(val);
    }, 350);
  };

  /* ── Keyboard navigation ── */
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showDropdown || suggestions.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
    } else if (e.key === "Enter" && activeIndex >= 0) {
      e.preventDefault();
      handleSelect(suggestions[activeIndex]);
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

      {showDropdown && suggestions.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto"
        >
          {suggestions.map((s, i) => (
            <button
              key={s.id}
              type="button"
              className={`w-full text-left px-3 py-2.5 text-sm hover:bg-purple-50 transition-colors ${
                i === activeIndex ? "bg-purple-50" : ""
              } ${i > 0 ? "border-t border-gray-100" : ""}`}
              onMouseDown={(e) => {
                e.preventDefault();
                handleSelect(s);
              }}
              onMouseEnter={() => setActiveIndex(i)}
            >
              <span className="font-medium text-gray-900">{s.text}</span>
              {s.secondary && (
                <span className="text-gray-500 ml-1.5 text-xs">{s.secondary}</span>
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
