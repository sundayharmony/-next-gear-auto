"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { MapPin, Search, X, Check } from "lucide-react";
import { adminFetch } from "@/lib/utils/admin-fetch";

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
   Google Maps script loader (for the map only)
   ──────────────────────────────────────── */
let mapsLoadPromise: Promise<void> | null = null;

function loadGoogleMaps(): Promise<void> {
  if (mapsLoadPromise) return mapsLoadPromise;
  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY;
  if (!key) return Promise.reject(new Error("No Google Maps key"));

  if (typeof google !== "undefined" && google.maps) return Promise.resolve();

  mapsLoadPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector('script[src*="maps.googleapis.com"]');
    if (existing) {
      if (typeof google !== "undefined" && google.maps) { resolve(); return; }
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(), { once: true });
      return;
    }
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${key}&libraries=marker&v=weekly`;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Google Maps"));
    document.head.appendChild(script);
  });
  return mapsLoadPromise;
}

/* ────────────────────────────────────────
   Server-side geocoding helpers
   Uses /api/admin/geocode to avoid browser
   referrer restrictions on the API key
   ──────────────────────────────────────── */
async function geocodeAddress(query: string): Promise<AddressResult[]> {
  try {
    const res = await adminFetch(`/api/admin/geocode?address=${encodeURIComponent(query)}`);
    const data = await res.json();
    if (data.success && data.results?.length) {
      return data.results.map((r: any) => ({
        address: r.address || r.formatted_address || "",
        city: r.city || "",
        state: r.state || "",
        zip: r.zip || "",
        lat: r.lat || 0,
        lng: r.lng || 0,
        formatted_address: r.formatted_address || "",
      }));
    }
    return [];
  } catch {
    return [];
  }
}

async function reverseGeocode(lat: number, lng: number): Promise<AddressResult | null> {
  try {
    const res = await adminFetch(`/api/admin/geocode?lat=${lat}&lng=${lng}`);
    const data = await res.json();
    if (data.success && data.results?.[0]) {
      const r = data.results[0];
      return {
        address: r.address || r.formatted_address || "",
        city: r.city || "",
        state: r.state || "",
        zip: r.zip || "",
        lat: r.lat || lat,
        lng: r.lng || lng,
      };
    }
    return null;
  } catch {
    return null;
  }
}

/* ═══════════════════════════════════════════════════
   Map Location Picker Component

   Opens an interactive Google Map modal with a search
   bar. Geocoding runs server-side via /api/admin/geocode.
   User can search or click on map to pick a location.
   ═══════════════════════════════════════════════════ */
export function AddressAutocomplete({
  value,
  onChange,
  onSelect,
  placeholder = "Search for an address...",
  className,
}: AddressAutocompleteProps) {
  const [showMap, setShowMap] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<Array<{ formatted: string; result: AddressResult }>>([]);
  const [selectedResult, setSelectedResult] = useState<{ formatted: string; result: AddressResult } | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [error, setError] = useState("");

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);
  const clickListenerRef = useRef<google.maps.MapsEventListener | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchAbortRef = useRef<AbortController | null>(null);

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY;

  // Initialize map when modal opens
  useEffect(() => {
    if (!showMap || !apiKey) return;
    let cancelled = false;

    loadGoogleMaps()
      .then(() => {
        // Wait for React to flush the modal DOM before accessing the ref
        return new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      })
      .then(() => {
        if (cancelled || !mapContainerRef.current || typeof google === "undefined" || !google.maps) return;

        // Force the container to have a measurable size before init
        const container = mapContainerRef.current;
        if (container.offsetHeight < 10) {
          container.style.height = "400px";
        }

        const map = new google.maps.Map(container, {
          center: { lat: 40.7128, lng: -74.006 },
          zoom: 12,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
          styles: [
            { featureType: "poi", stylers: [{ visibility: "off" }] },
            { featureType: "transit", stylers: [{ visibility: "simplified" }] },
          ],
        });

        // Clean up previous listener if any
        if (clickListenerRef.current) {
          google.maps.event.removeListener(clickListenerRef.current);
        }

        // Click on map to drop pin + reverse geocode via server
        clickListenerRef.current = map.addListener("click", async (e: google.maps.MapMouseEvent) => {
          if (!e.latLng) return;
          const lat = e.latLng.lat();
          const lng = e.latLng.lng();

          // Place marker immediately
          if (markerRef.current) markerRef.current.setMap(null);
          markerRef.current = new google.maps.Marker({
            position: { lat, lng },
            map,
            icon: {
              path: google.maps.SymbolPath.CIRCLE,
              scale: 12,
              fillColor: "#7c3aed",
              fillOpacity: 1,
              strokeColor: "#4c1d95",
              strokeWeight: 2,
            },
          });

          // Reverse geocode via server-side API
          const result = await reverseGeocode(lat, lng);
          if (result) {
            setSelectedResult({
              formatted: [result.address, result.city, result.state, result.zip].filter(Boolean).join(", "),
              result,
            });
            setSearchResults([]);
          }
        });

        mapRef.current = map;
        setMapReady(true);

        // Focus search input
        setTimeout(() => searchInputRef.current?.focus(), 200);
      })
      .catch(() => {
        if (!cancelled) setError("Could not load Google Maps");
      });

    return () => {
      cancelled = true;
      if (clickListenerRef.current) {
        google.maps.event.removeListener(clickListenerRef.current);
        clickListenerRef.current = null;
      }
    };
  }, [showMap, apiKey]);

  // Search using server-side geocoding
  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    setError("");
    setSelectedResult(null);

    const results = await geocodeAddress(searchQuery);

    if (results.length === 0) {
      setError("No addresses found. Try a more specific search.");
      setSearchResults([]);
      setSearching(false);
      return;
    }

    const mapped = results.map((r: any) => ({
      formatted: r.formatted_address || [r.address, r.city, r.state, r.zip].filter(Boolean).join(", "),
      result: r as AddressResult,
    }));

    setSearchResults(mapped);

    // Auto-select first result and move map
    if (mapped[0]) {
      selectOnMap(mapped[0]);
    }

    setSearching(false);
  }, [searchQuery]);

  // Place a result on the map
  const selectOnMap = (item: { formatted: string; result: AddressResult }) => {
    setSelectedResult(item);
    const map = mapRef.current;
    if (!map || !item.result.lat || !item.result.lng) return;

    const pos = { lat: item.result.lat, lng: item.result.lng };
    map.panTo(pos);
    map.setZoom(16);

    if (markerRef.current) markerRef.current.setMap(null);
    markerRef.current = new google.maps.Marker({
      position: pos,
      map,
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 12,
        fillColor: "#7c3aed",
        fillOpacity: 1,
        strokeColor: "#4c1d95",
        strokeWeight: 2,
      },
      animation: google.maps.Animation.DROP,
    });
  };

  // Confirm selection
  const handleConfirm = () => {
    if (!selectedResult) return;
    onChange(selectedResult.result.address || selectedResult.formatted);
    if (onSelect) onSelect(selectedResult.result);
    setShowMap(false);
    setSearchQuery("");
    setSearchResults([]);
    setSelectedResult(null);
  };

  // Close modal — clean up map resources
  const handleClose = () => {
    if (searchAbortRef.current) searchAbortRef.current.abort();
    if (markerRef.current) { markerRef.current.setMap(null); markerRef.current = null; }
    if (clickListenerRef.current) {
      google.maps.event.removeListener(clickListenerRef.current);
      clickListenerRef.current = null;
    }
    mapRef.current = null;
    setShowMap(false);
    setMapReady(false);
    setSearchQuery("");
    setSearchResults([]);
    setSelectedResult(null);
    setError("");
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
    <>
      {/* Address input with map button */}
      <div className="flex gap-2">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Enter address or search on map →"
          className={`flex-1 rounded-md border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent ${className || ""}`}
        />
        <button
          type="button"
          onClick={() => setShowMap(true)}
          className="px-3 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors flex items-center gap-1.5 text-sm font-medium shrink-0"
          title="Search address on Google Maps"
        >
          <MapPin className="w-4 h-4" />
          Map
        </button>
      </div>

      {/* Map Modal */}
      {showMap && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col" style={{ maxHeight: "85vh" }}>
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b bg-gray-50">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-purple-600" />
                Find Address on Map
              </h3>
              <button
                type="button"
                onClick={handleClose}
                className="p-1 rounded hover:bg-gray-200 text-gray-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Search bar */}
            <div className="px-4 py-3 border-b">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleSearch();
                      }
                    }}
                    placeholder="Search address, city, or zip..."
                    className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleSearch}
                  disabled={searching || !searchQuery.trim()}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                >
                  {searching ? "Searching..." : "Search"}
                </button>
              </div>

              {/* Error */}
              {error && (
                <p className="text-xs text-red-600 mt-2">{error}</p>
              )}

              {/* Search results list */}
              {searchResults.length > 1 && (
                <div className="mt-2 max-h-32 overflow-y-auto border border-gray-200 rounded-lg divide-y divide-gray-100">
                  {searchResults.map((item, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => selectOnMap(item)}
                      className={`w-full text-left px-3 py-2 text-xs hover:bg-purple-50 transition-colors ${
                        selectedResult?.formatted === item.formatted ? "bg-purple-50 font-medium" : ""
                      }`}
                    >
                      {item.formatted}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Map — explicit height so Google Maps renders properly */}
            <div style={{ height: "400px", position: "relative" }}>
              <div
                ref={mapContainerRef}
                style={{ width: "100%", height: "100%" }}
              />
              {!mapReady && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
                  <div className="flex items-center gap-2 text-gray-500 text-sm">
                    <div className="w-5 h-5 border-2 border-purple-300 border-t-purple-600 rounded-full animate-spin" />
                    Loading map...
                  </div>
                </div>
              )}
              {/* Tip overlay */}
              {mapReady && !selectedResult && searchResults.length === 0 && (
                <div className="absolute bottom-3 left-3 right-3 bg-white/90 backdrop-blur rounded-lg px-3 py-2 text-xs text-gray-600 text-center shadow">
                  Search for an address above, or click anywhere on the map to pick a location
                </div>
              )}
            </div>

            {/* Selected address + confirm */}
            {selectedResult && (
              <div className="px-4 py-3 border-t bg-purple-50 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-purple-600 font-medium">Selected Address</p>
                  <p className="text-sm font-semibold text-gray-900 truncate">
                    {selectedResult.result.address || selectedResult.formatted}
                  </p>
                  <p className="text-xs text-gray-500">
                    {[selectedResult.result.city, selectedResult.result.state, selectedResult.result.zip].filter(Boolean).join(", ")}
                    {selectedResult.result.lat ? ` · ${selectedResult.result.lat.toFixed(4)}, ${selectedResult.result.lng.toFixed(4)}` : ""}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleConfirm}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm font-medium flex items-center gap-1.5 shrink-0"
                >
                  <Check className="w-4 h-4" />
                  Use This
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
