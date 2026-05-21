"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { escapeHtml } from "@/lib/utils/validation";
import { isGoogleMapsBillingError, loadGoogleMaps } from "@/lib/google-maps/load-maps";
import { onAdvancedMarkerClick } from "@/lib/google-maps/marker-events";

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

export function LocationMap({ locations, selectedId, onSelect, className }: LocationMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([]);
  const markerListenersRef = useRef<google.maps.MapsEventListener[]>([]);
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [error, setError] = useState<"missing-key" | "billing" | "load" | null>(null);

  const mappableLocations = locations.filter(
    (l) =>
      l.lat != null &&
      l.lng != null &&
      !isNaN(l.lat) &&
      !isNaN(l.lng) &&
      l.lat >= -90 &&
      l.lat <= 90 &&
      l.lng >= -180 &&
      l.lng <= 180,
  );

  useEffect(() => {
    const onWindowError = (event: ErrorEvent) => {
      const msg = event.message || String(event.error ?? "");
      if (isGoogleMapsBillingError(msg)) setError("billing");
    };
    window.addEventListener("error", onWindowError);
    return () => window.removeEventListener("error", onWindowError);
  }, []);

  useEffect(() => {
    let cancelled = false;

    if (!process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY) {
      setError("missing-key");
      return;
    }

    loadGoogleMaps()
      .then(() => {
        if (cancelled || !mapRef.current) return;

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
      .catch(() => {
        if (!cancelled) setError("load");
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const updateMarkers = useCallback(() => {
    const map = mapInstanceRef.current;
    if (!map || !mapReady) return;

    if (infoWindowRef.current) infoWindowRef.current.close();

    markerListenersRef.current.forEach((l) => l.remove());
    markerListenersRef.current = [];

    markersRef.current.forEach((m) => {
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

      const listener = onAdvancedMarkerClick(marker, () => {
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
      markerListenersRef.current.push(listener);

      bounds.extend(position);
      markersRef.current.push(marker);
    });

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

  if (error === "billing") {
    return (
      <div
        className={`rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 ${className || "h-[250px] flex items-center"}`}
      >
        <p className="font-medium">Map preview unavailable</p>
        <p className="mt-1 text-amber-800">
          Google Maps billing is not enabled for this site&apos;s API key. Enable billing in{" "}
          <a
            href="https://console.cloud.google.com/google/maps-apis"
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            Google Cloud Console
          </a>
          . You can still choose a pickup location from the list below.
        </p>
      </div>
    );
  }

  if (error === "load" || error === "missing-key") {
    return (
      <div className={`rounded-lg bg-gray-100 flex items-center justify-center text-sm text-gray-500 ${className || "h-[250px]"}`}>
        Map unavailable
      </div>
    );
  }

  if (mappableLocations.length === 0) {
    return (
      <div
        className={`rounded-lg bg-gray-50 border border-dashed border-gray-200 flex items-center justify-center text-sm text-gray-400 ${className || "h-[250px]"}`}
      >
        No locations with coordinates to display
      </div>
    );
  }

  return (
    <div className={`rounded-xl overflow-hidden border border-gray-200 shadow-sm ${className || "h-[250px]"}`}>
      <div ref={mapRef} className="w-full h-full" />
    </div>
  );
}
