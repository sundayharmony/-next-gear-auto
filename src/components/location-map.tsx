"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { escapeHtml } from "@/lib/utils/validation";

interface LocationMapProps {
  locations: Array<{
    id: string;
    name: string;
    address: string;
    city: string;
    state: string;
    lat?: number;
    lng?: number;
    surcharge: number;
    is_default: boolean;
  }>;
  selectedId: string | null;
  onSelect: (id: string) => void;
  className?: string;
}

// Load the Google Maps script once
let mapsLoaded = false;
let mapsLoadPromise: Promise<void> | null = null;

function loadGoogleMaps(): Promise<void> {
  if (mapsLoaded) return Promise.resolve();
  if (mapsLoadPromise) return mapsLoadPromise;

  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY;
  if (!key) return Promise.reject(new Error("Google Maps API key not set"));

  mapsLoadPromise = new Promise((resolve, reject) => {
    // Check if already loaded by AddressAutocomplete or other component
    if (typeof google !== "undefined" && google.maps) {
      mapsLoaded = true;
      resolve();
      return;
    }
    const existing = document.querySelector('script[src*="maps.googleapis.com"]');
    if (existing) {
      existing.addEventListener("load", () => { mapsLoaded = true; resolve(); }, { once: true });
      if (typeof google !== "undefined" && google.maps) { mapsLoaded = true; resolve(); }
      return;
    }
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${key}&libraries=marker&v=weekly`;
    script.async = true;
    script.defer = true;
    script.onload = () => { mapsLoaded = true; resolve(); };
    script.onerror = () => {
      mapsLoadPromise = null;
      reject(new Error("Failed to load Google Maps"));
    };
    document.head.appendChild(script);
  });

  return mapsLoadPromise;
}

export function LocationMap({ locations, selectedId, onSelect, className }: LocationMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([]);
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filter to locations with coordinates and valid ranges
  const mappableLocations = locations.filter(l => l.lat != null && l.lng != null && !isNaN(l.lat) && !isNaN(l.lng) && l.lat >= -90 && l.lat <= 90 && l.lng >= -180 && l.lng <= 180);

  // Initialize map
  useEffect(() => {
    let cancelled = false;

    loadGoogleMaps()
      .then(() => {
        if (cancelled || !mapRef.current) return;

        // Default center: Jersey City
        const center = { lat: 40.7178, lng: -74.0431 };

        const map = new google.maps.Map(mapRef.current, {
          center,
          zoom: 11,
          mapId: "location-map",
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
        });

        mapInstanceRef.current = map;
        infoWindowRef.current = new google.maps.InfoWindow();
        setMapReady(true);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      });

    return () => { cancelled = true; };
  }, []);

  // Update markers when locations or selection changes
  const updateMarkers = useCallback(() => {
    const map = mapInstanceRef.current;
    if (!map || !mapReady) return;

    // Clear existing markers and close any open InfoWindow
    if (infoWindowRef.current) {
      infoWindowRef.current.close();
    }
    markersRef.current.forEach(m => {
      if (m) m.map = null;
    });
    markersRef.current = [];

    if (mappableLocations.length === 0) return;

    const bounds = new google.maps.LatLngBounds();

    mappableLocations.forEach((loc) => {
      const position = { lat: loc.lat!, lng: loc.lng! };
      const isSelected = loc.id === selectedId;

      const pin = document.createElement("div");
      const size = isSelected ? 24 : 18;
      pin.style.cssText = `width:${size}px;height:${size}px;border-radius:50%;background:${isSelected ? "#7c3aed" : "#9ca3af"};border:2px solid ${isSelected ? "#4c1d95" : "#6b7280"};cursor:pointer;transition:transform 0.15s;`;
      pin.title = loc.name;

      const marker = new google.maps.marker.AdvancedMarkerElement({
        position,
        map,
        content: pin,
        zIndex: isSelected ? 10 : 1,
      });

      marker.addListener("click", () => {
        onSelect(loc.id);
        const infoWindow = infoWindowRef.current;
        if (infoWindow) {
          const escapedName = escapeHtml(loc.name);
          const escapedAddress = escapeHtml(loc.address);
          const escapedCity = escapeHtml(loc.city);
          const escapedState = escapeHtml(loc.state);
          infoWindow.setContent(`
            <div style="padding:4px 2px;min-width:160px;">
              <strong style="font-size:14px;color:#111827;">${escapedName}</strong>
              <p style="font-size:12px;color:#6b7280;margin:4px 0 0;">${escapedAddress}, ${escapedCity}, ${escapedState}</p>
              ${loc.surcharge > 0 ? `<p style="font-size:12px;color:#7c3aed;font-weight:600;margin:4px 0 0;">+$${loc.surcharge.toFixed(2)} surcharge</p>` : '<p style="font-size:12px;color:#059669;margin:4px 0 0;">No surcharge</p>'}
              ${loc.is_default ? '<p style="font-size:11px;color:#9333ea;margin:2px 0 0;">★ Default location</p>' : ''}
            </div>
          `);
          infoWindow.open({ anchor: marker, map });
        }
      });

      bounds.extend(position);
      markersRef.current.push(marker);
    });

    // Fit map to show all markers with padding
    if (mappableLocations.length > 1) {
      map.fitBounds(bounds, { top: 40, bottom: 40, left: 40, right: 40 });
    } else if (mappableLocations.length === 1) {
      map.setCenter({ lat: mappableLocations[0].lat!, lng: mappableLocations[0].lng! });
      map.setZoom(14);
    }
  }, [mappableLocations, selectedId, onSelect, mapReady]);

  useEffect(() => {
    updateMarkers();
  }, [updateMarkers]);

  if (error) {
    return (
      <div className={`rounded-lg bg-gray-100 flex items-center justify-center text-sm text-gray-500 ${className || "h-[250px]"}`}>
        Map unavailable
      </div>
    );
  }

  if (mappableLocations.length === 0 && !error) {
    return (
      <div className={`rounded-lg bg-gray-50 border border-dashed border-gray-200 flex items-center justify-center text-sm text-gray-400 ${className || "h-[250px]"}`}>
        No locations with coordinates to display
      </div>
    );
  }

  // Don't render map if no API key
  if (!process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY) {
    return null;
  }

  return (
    <div className={`rounded-xl overflow-hidden border border-gray-200 shadow-sm ${className || "h-[250px]"}`}>
      <div ref={mapRef} className="w-full h-full" />
    </div>
  );
}
