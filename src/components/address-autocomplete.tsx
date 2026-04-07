"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { MapPin, Search, X, Check } from "lucide-react";
import { adminFetch } from "@/lib/utils/admin-fetch";
import { logger } from "@/lib/utils/logger";

/* ── Types ────────────────────────────────────────── */

export interface AddressResult {
  address: string;
  city: string;
  state: string;
  zip: string;
  lat: number;
  lng: number;
  name?: string;
}

interface Props {
  value: string;
  onChange: (value: string) => void;
  onSelect?: (result: AddressResult) => void;
  placeholder?: string;
  className?: string;
}

/* ── Google Maps loader (shared singleton) ────────── */

let loadPromise: Promise<void> | null = null;

function ensureGoogleMaps(): Promise<void> {
  if (typeof google !== "undefined" && google.maps) return Promise.resolve();
  if (loadPromise) return loadPromise;

  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY;
  if (!key) return Promise.reject(new Error("Missing NEXT_PUBLIC_GOOGLE_MAPS_KEY"));

  loadPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector('script[src*="maps.googleapis.com"]');
    if (existing) {
      if (typeof google !== "undefined" && google.maps) return resolve();
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => {
        loadPromise = null;
        reject(new Error("Script failed"));
      }, { once: true });
      return;
    }
    const s = document.createElement("script");
    s.src = `https://maps.googleapis.com/maps/api/js?key=${key}&libraries=marker&v=weekly`;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => {
      loadPromise = null;
      reject(new Error("Script failed"));
    };
    document.head.appendChild(s);
  });
  return loadPromise;
}

/* ── Server-side geocoding ────────────────────────── */

async function forwardGeocode(query: string): Promise<Array<{ formatted: string; result: AddressResult }>> {
  try {
    const res = await adminFetch(`/api/admin/geocode?address=${encodeURIComponent(query)}`);
    const json = await res.json();
    if (!json.success || !json.results?.length) return [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return json.results.map((r: any) => ({
      formatted: r.formatted_address || [r.address, r.city, r.state, r.zip].filter(Boolean).join(", "),
      result: { address: r.address || "", city: r.city || "", state: r.state || "", zip: r.zip || "", lat: r.lat ?? 0, lng: r.lng ?? 0 } as AddressResult,
    }));
  } catch (e) { logger.warn("Forward geocode failed:", e); return []; }
}

async function reverseGeocode(lat: number, lng: number): Promise<{ formatted: string; result: AddressResult } | null> {
  try {
    const res = await adminFetch(`/api/admin/geocode?lat=${lat}&lng=${lng}`);
    const json = await res.json();
    if (!json.success || !json.results?.[0]) return null;
    const r = json.results[0];
    const result: AddressResult = { address: r.address || "", city: r.city || "", state: r.state || "", zip: r.zip || "", lat: r.lat ?? lat, lng: r.lng ?? lng };
    return { formatted: r.formatted_address || [result.address, result.city, result.state, result.zip].filter(Boolean).join(", "), result };
  } catch (e) { logger.warn("Reverse geocode failed:", e); return null; }
}

/* ── Component ────────────────────────────────────── */

export function AddressAutocomplete({ value, onChange, onSelect, placeholder = "Search for an address...", className }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState<Array<{ formatted: string; result: AddressResult }>>([]);
  const [picked, setPicked] = useState<{ formatted: string; result: AddressResult } | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [err, setErr] = useState("");

  const containerRef = useRef<HTMLDivElement>(null);
  const mapObjRef = useRef<google.maps.Map | null>(null);
  const markerObjRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(null);
  const listenerRef = useRef<google.maps.MapsEventListener | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const searchCounterRef = useRef(0);

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY;

  /* ── Init map when modal opens ── */
  useEffect(() => {
    if (!open || !apiKey) return;
    let dead = false;

    ensureGoogleMaps()
      .then(() => new Promise<void>((r) => requestAnimationFrame(() => r())))
      .then(() => {
        if (dead) return;
        const el = containerRef.current;
        if (!el || typeof google === "undefined" || !google.maps) return;

        const map = new google.maps.Map(el, {
          center: { lat: 40.7178, lng: -74.0431 },
          zoom: 12,
          mapId: "address-picker",
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
        });

        listenerRef.current = map.addListener("click", async (e: google.maps.MapMouseEvent) => {
          if (!e.latLng) return;
          const lat = e.latLng.lat();
          const lng = e.latLng.lng();
          placeMarker(map, lat, lng);
          const hit = await reverseGeocode(lat, lng);
          if (hit) { setPicked(hit); setResults([]); }
        });

        mapObjRef.current = map;
        setMapReady(true);
        setTimeout(() => inputRef.current?.focus(), 150);
      })
      .catch(() => { if (!dead) setErr("Could not load Google Maps"); });

    return () => {
      dead = true;
      if (listenerRef.current && typeof google !== "undefined" && google.maps) {
        google.maps.event.removeListener(listenerRef.current);
        listenerRef.current = null;
      }
      if (markerObjRef.current) { markerObjRef.current.map = null; markerObjRef.current = null; }
      mapObjRef.current = null;
      setMapReady(false);
    };
  }, [open, apiKey]);

  /* ── Escape key handler ── */
  useEffect(() => {
    if (!open) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        close();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  /* ── Helpers ── */

  function placeMarker(map: google.maps.Map, lat: number, lng: number) {
    if (markerObjRef.current) markerObjRef.current.map = null;
    const pin = document.createElement("div");
    pin.style.cssText = "width:24px;height:24px;border-radius:50%;background:#7c3aed;border:2px solid #4c1d95;";
    markerObjRef.current = new google.maps.marker.AdvancedMarkerElement({
      position: { lat, lng },
      map,
      content: pin,
    });
  }

  function flyTo(item: { formatted: string; result: AddressResult }) {
    setPicked(item);
    const map = mapObjRef.current;
    if (!map || !item.result.lat || !item.result.lng) return;
    map.panTo({ lat: item.result.lat, lng: item.result.lng });
    map.setZoom(16);
    placeMarker(map, item.result.lat, item.result.lng);
  }

  const doSearch = useCallback(async () => {
    if (!query.trim()) return;
    setBusy(true);
    setErr("");
    setPicked(null);

    // Increment counter to track this search
    searchCounterRef.current++;
    const currentSearchId = searchCounterRef.current;

    const hits = await forwardGeocode(query);

    // Discard results if a newer search has been started
    if (currentSearchId !== searchCounterRef.current) return;

    if (hits.length === 0) { setErr("No addresses found. Try a more specific search."); setResults([]); }
    else { setResults(hits); flyTo(hits[0]); }
    setBusy(false);
  }, [query]);

  function confirm() {
    if (!picked) return;
    onChange(picked.result.address || picked.formatted);
    onSelect?.(picked.result);
    close();
  }

  function close() {
    setOpen(false);
    setQuery("");
    setResults([]);
    setPicked(null);
    setErr("");
  }

  /* ── Fallback: no API key ── */
  if (!apiKey) {
    return (
      <input type="text" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className={`w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent ${className || ""}`} />
    );
  }

  /* ── Render ── */
  return (
    <>
      {/* Input + Map button */}
      <div className="flex gap-2">
        <input type="text" value={value} onChange={(e) => onChange(e.target.value)} placeholder="Enter address or search on map →"
          className={`flex-1 rounded-md border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent ${className || ""}`} />
        <button type="button" onClick={() => setOpen(true)} title="Pick on map"
          className="px-3 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors flex items-center gap-1.5 text-sm font-medium shrink-0">
          <MapPin className="w-4 h-4" /> Map
        </button>
      </div>

      {/* Modal */}
      {open && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4" onClick={(e) => { if (e.target === e.currentTarget) close(); }}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl flex flex-col" style={{ maxHeight: "85vh" }}>

            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b bg-gray-50 rounded-t-xl">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-purple-600" /> Find Address on Map
              </h3>
              <button type="button" onClick={close} className="p-1 rounded hover:bg-gray-200 text-gray-500">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Search */}
            <div className="px-4 py-3 border-b">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input ref={inputRef} type="text" value={query} onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); doSearch(); } }}
                    placeholder="Search address, city, or zip..." className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent" />
                </div>
                <button type="button" onClick={doSearch} disabled={busy || !query.trim()}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium">
                  {busy ? "Searching..." : "Search"}
                </button>
              </div>
              {err && <p className="text-xs text-red-600 mt-2">{err}</p>}
              {results.length > 1 && (
                <div className="mt-2 max-h-32 overflow-y-auto border border-gray-200 rounded-lg divide-y divide-gray-100">
                  {results.map((item, i) => (
                    <button key={i} type="button" onClick={() => flyTo(item)}
                      className={`w-full text-left px-3 py-2 text-xs hover:bg-purple-50 transition-colors ${picked?.formatted === item.formatted ? "bg-purple-50 font-medium" : ""}`}>
                      {item.formatted}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Map */}
            <div style={{ height: 400, position: "relative" }}>
              <div ref={containerRef} style={{ width: "100%", height: "100%" }} />
              {!mapReady && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
                  <div className="flex items-center gap-2 text-gray-500 text-sm">
                    <div className="w-5 h-5 border-2 border-purple-300 border-t-purple-600 rounded-full animate-spin" />
                    Loading map...
                  </div>
                </div>
              )}
              {mapReady && !picked && results.length === 0 && (
                <div className="absolute bottom-3 left-3 right-3 bg-white/90 backdrop-blur rounded-lg px-3 py-2 text-xs text-gray-600 text-center shadow">
                  Search for an address above, or click anywhere on the map to pick a location
                </div>
              )}
            </div>

            {/* Selection bar */}
            {picked && (
              <div className="px-4 py-3 border-t bg-purple-50 flex items-center gap-3 rounded-b-xl">
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-purple-600 font-medium">Selected Address</p>
                  <p className="text-sm font-semibold text-gray-900 truncate">{picked.result.address || picked.formatted}</p>
                  <p className="text-xs text-gray-500">
                    {[picked.result.city, picked.result.state, picked.result.zip].filter(Boolean).join(", ")}
                    {picked.result.lat ? ` · ${picked.result.lat.toFixed(4)}, ${picked.result.lng.toFixed(4)}` : ""}
                  </p>
                </div>
                <button type="button" onClick={confirm}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm font-medium flex items-center gap-1.5 shrink-0">
                  <Check className="w-4 h-4" /> Use This
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
