"use client";

import React, { useCallback, useEffect, useId, useRef, useState } from "react";
import { Loader2, MapPin, Plus, Search } from "lucide-react";
import { adminFetch } from "@/lib/utils/admin-fetch";
import { logger } from "@/lib/utils/logger";
import type { Location } from "@/lib/types";
import type { AddressResult } from "@/components/address-autocomplete";

type AddressSuggestion = {
  formatted: string;
  result: AddressResult;
};

type Props = {
  label: string;
  locations: Location[];
  value: string;
  onChange: (locationId: string) => void;
  onLocationsChange?: (locations: Location[]) => void;
  /** When true, typing also queries Google geocode for address recommendations. */
  enableAddressSearch?: boolean;
  placeholder?: string;
  disabled?: boolean;
};

function locationLabel(loc: Location): string {
  const surcharge = loc.surcharge > 0 ? ` (+$${loc.surcharge.toFixed(2)})` : "";
  const def = loc.is_default ? " (Default)" : "";
  return `${loc.name}${surcharge}${def}`;
}

function locationSubtitle(loc: Location): string {
  return [loc.address, loc.city, loc.state, loc.zip].filter(Boolean).join(", ");
}

function matchesQuery(loc: Location, q: string): boolean {
  const hay = `${loc.name} ${loc.address} ${loc.city} ${loc.state} ${loc.zip}`.toLowerCase();
  return hay.includes(q);
}

async function fetchAddressSuggestions(query: string): Promise<AddressSuggestion[]> {
  try {
    const res = await adminFetch(`/api/admin/geocode?address=${encodeURIComponent(query)}`);
    const json = await res.json();
    if (!json.success || !Array.isArray(json.results)) return [];
    return json.results.map(
      (r: {
        formatted_address?: string;
        address?: string;
        city?: string;
        state?: string;
        zip?: string;
        lat?: number;
        lng?: number;
      }) => ({
        formatted:
          r.formatted_address ||
          [r.address, r.city, r.state, r.zip].filter(Boolean).join(", "),
        result: {
          address: r.address || "",
          city: r.city || "",
          state: r.state || "",
          zip: r.zip || "",
          lat: r.lat ?? 0,
          lng: r.lng ?? 0,
        },
      }),
    );
  } catch (error) {
    logger.warn("Location address search failed:", error);
    return [];
  }
}

function findExistingByAddress(
  locations: Location[],
  suggestion: AddressSuggestion,
): Location | undefined {
  const street = suggestion.result.address.trim().toLowerCase();
  const formatted = suggestion.formatted.trim().toLowerCase();
  return locations.find((loc) => {
    const locStreet = (loc.address || "").trim().toLowerCase();
    const locFull = locationSubtitle(loc).trim().toLowerCase();
    return (
      (street && locStreet === street) ||
      (formatted && (locFull === formatted || loc.name.trim().toLowerCase() === formatted))
    );
  });
}

export function LocationCombobox({
  label,
  locations,
  value,
  onChange,
  onLocationsChange,
  enableAddressSearch = true,
  placeholder = "Search saved locations or type an address…",
  disabled = false,
}: Props) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const searchSeq = useRef(0);

  const selected = locations.find((l) => l.id === value) ?? null;
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [highlight, setHighlight] = useState(0);

  const displayValue = open
    ? query
    : selected
      ? locationLabel(selected)
      : "";

  const filteredLocations = (() => {
    const q = query.trim().toLowerCase();
    if (!q) return locations.slice(0, 12);
    return locations.filter((loc) => matchesQuery(loc, q)).slice(0, 12);
  })();

  const optionCount = filteredLocations.length + suggestions.length;

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
        setSuggestions([]);
        setError("");
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  useEffect(() => {
    if (!open || !enableAddressSearch) {
      setSuggestions([]);
      setSearching(false);
      return;
    }

    const q = query.trim();
    if (q.length < 3) {
      setSuggestions([]);
      setSearching(false);
      return;
    }

    const seq = ++searchSeq.current;
    setSearching(true);
    const timer = window.setTimeout(async () => {
      const hits = await fetchAddressSuggestions(q);
      if (seq !== searchSeq.current) return;
      setSuggestions(hits);
      setSearching(false);
    }, 300);

    return () => window.clearTimeout(timer);
  }, [query, open, enableAddressSearch]);

  useEffect(() => {
    setHighlight(0);
  }, [query, filteredLocations.length, suggestions.length]);

  const pickSaved = useCallback(
    (loc: Location) => {
      onChange(loc.id);
      setOpen(false);
      setQuery("");
      setSuggestions([]);
      setError("");
    },
    [onChange],
  );

  const pickSuggestion = useCallback(
    async (suggestion: AddressSuggestion) => {
      const existing = findExistingByAddress(locations, suggestion);
      if (existing) {
        pickSaved(existing);
        return;
      }

      setSaving(true);
      setError("");
      try {
        const name =
          suggestion.result.address ||
          suggestion.formatted.split(",")[0]?.trim() ||
          suggestion.formatted;
        const res = await adminFetch("/api/admin/locations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name,
            address: suggestion.result.address || suggestion.formatted,
            city: suggestion.result.city || "",
            state: suggestion.result.state || "",
            zip: suggestion.result.zip || "",
            lat: suggestion.result.lat || null,
            lng: suggestion.result.lng || null,
            surcharge: 0,
            is_default: false,
          }),
        });
        const json = await res.json();
        if (!res.ok || !json.success || !json.data) {
          setError(json.message || "Could not save location");
          return;
        }
        const created = json.data as Location;
        onLocationsChange?.([created, ...locations.filter((l) => l.id !== created.id)]);
        onChange(created.id);
        setOpen(false);
        setQuery("");
        setSuggestions([]);
      } catch (err) {
        logger.error("Failed to create location from address:", err);
        setError("Could not save location. Try again.");
      } finally {
        setSaving(false);
      }
    },
    [locations, onChange, onLocationsChange, pickSaved],
  );

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open && (e.key === "ArrowDown" || e.key === "Enter")) {
      setOpen(true);
      return;
    }
    if (!open) return;

    if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
      setQuery("");
      setSuggestions([]);
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, Math.max(optionCount - 1, 0)));
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      if (highlight < filteredLocations.length) {
        pickSaved(filteredLocations[highlight]);
        return;
      }
      const suggestion = suggestions[highlight - filteredLocations.length];
      if (suggestion) void pickSuggestion(suggestion);
    }
  };

  return (
    <div ref={rootRef} className="relative">
      <label className="mb-1.5 flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
        <MapPin className="h-3 w-3 text-purple-500" />
        {label}
      </label>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          ref={inputRef}
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          disabled={disabled || saving}
          value={displayValue}
          placeholder={placeholder}
          onFocus={() => {
            setOpen(true);
            setQuery(selected ? selected.name : "");
          }}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            if (value) onChange("");
          }}
          onKeyDown={onKeyDown}
          className="w-full rounded-md border border-gray-200 py-2 pl-9 pr-9 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-60"
        />
        {(searching || saving) && (
          <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-purple-500" />
        )}
      </div>

      {open && (
        <div
          id={listId}
          role="listbox"
          className="absolute z-50 mt-1 max-h-72 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg"
        >
          {filteredLocations.length > 0 && (
            <div className="border-b border-gray-100 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-gray-400">
              Saved locations
            </div>
          )}
          {filteredLocations.map((loc, index) => {
            const active = index === highlight;
            return (
              <button
                key={loc.id}
                type="button"
                role="option"
                aria-selected={value === loc.id}
                className={`flex w-full flex-col gap-0.5 px-3 py-2 text-left text-sm transition-colors ${
                  active || value === loc.id ? "bg-purple-50" : "hover:bg-gray-50"
                }`}
                onMouseEnter={() => setHighlight(index)}
                onClick={() => pickSaved(loc)}
              >
                <span className="font-medium text-gray-900">{locationLabel(loc)}</span>
                <span className="truncate text-xs text-gray-500">{locationSubtitle(loc)}</span>
              </button>
            );
          })}

          {enableAddressSearch && (
            <>
              {(suggestions.length > 0 || searching || query.trim().length >= 3) && (
                <div className="border-b border-t border-gray-100 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                  Recommended addresses
                </div>
              )}
              {suggestions.map((suggestion, i) => {
                const index = filteredLocations.length + i;
                const active = index === highlight;
                const alreadySaved = Boolean(findExistingByAddress(locations, suggestion));
                return (
                  <button
                    key={`${suggestion.formatted}-${i}`}
                    type="button"
                    role="option"
                    aria-selected={false}
                    className={`flex w-full items-start gap-2 px-3 py-2 text-left text-sm transition-colors ${
                      active ? "bg-purple-50" : "hover:bg-gray-50"
                    }`}
                    onMouseEnter={() => setHighlight(index)}
                    onClick={() => void pickSuggestion(suggestion)}
                    disabled={saving}
                  >
                    {alreadySaved ? (
                      <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-purple-500" />
                    ) : (
                      <Plus className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
                    )}
                    <span className="min-w-0">
                      <span className="block font-medium text-gray-900">{suggestion.formatted}</span>
                      <span className="block text-xs text-gray-500">
                        {alreadySaved ? "Use saved location" : "Add as location and use"}
                      </span>
                    </span>
                  </button>
                );
              })}
              {!searching &&
                query.trim().length >= 3 &&
                suggestions.length === 0 &&
                filteredLocations.length === 0 && (
                  <p className="px-3 py-3 text-sm text-gray-500">No matching locations or addresses.</p>
                )}
              {query.trim().length > 0 && query.trim().length < 3 && filteredLocations.length === 0 && (
                <p className="px-3 py-3 text-sm text-gray-500">Keep typing for address suggestions…</p>
              )}
            </>
          )}

          {!enableAddressSearch && filteredLocations.length === 0 && (
            <p className="px-3 py-3 text-sm text-gray-500">No matching saved locations.</p>
          )}
        </div>
      )}

      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
      {selected && !open && (
        <p className="mt-1 truncate text-xs text-gray-500">{locationSubtitle(selected)}</p>
      )}
    </div>
  );
}
