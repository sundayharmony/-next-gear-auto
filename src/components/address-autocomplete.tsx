"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { Input } from "@/components/ui/input";

interface AddressResult {
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
  onSelect: (result: AddressResult) => void;
  placeholder?: string;
  className?: string;
}

// Load Places library once
let placesLoaded = false;
let placesLoadPromise: Promise<void> | null = null;

function loadPlaces(): Promise<void> {
  if (placesLoaded) return Promise.resolve();
  if (placesLoadPromise) return placesLoadPromise;

  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY;
  if (!key) return Promise.reject(new Error("No API key"));

  placesLoadPromise = new Promise((resolve, reject) => {
    // Check if already loaded by LocationMap or other component
    if (typeof google !== "undefined" && google.maps?.places) {
      placesLoaded = true;
      resolve();
      return;
    }

    // Check if script tag exists but hasn't loaded yet
    const existing = document.querySelector(
      'script[src*="maps.googleapis.com"]'
    );
    if (existing) {
      existing.addEventListener("load", () => {
        placesLoaded = true;
        resolve();
      });
      existing.addEventListener("error", () => reject(new Error("Failed")));
      // If it's already loaded
      if (typeof google !== "undefined" && google.maps) {
        placesLoaded = true;
        resolve();
      }
      return;
    }

    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${key}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      placesLoaded = true;
      resolve();
    };
    script.onerror = () => reject(new Error("Failed to load Google Maps"));
    document.head.appendChild(script);
  });

  return placesLoadPromise;
}

function extractAddressComponents(
  place: google.maps.places.PlaceResult
): AddressResult {
  const components = place.address_components || [];
  let streetNumber = "";
  let route = "";
  let city = "";
  let state = "";
  let zip = "";

  for (const comp of components) {
    const types = comp.types;
    if (types.includes("street_number")) streetNumber = comp.long_name;
    else if (types.includes("route")) route = comp.long_name;
    else if (types.includes("locality")) city = comp.long_name;
    else if (types.includes("sublocality_level_1") && !city)
      city = comp.long_name;
    else if (types.includes("administrative_area_level_1"))
      state = comp.short_name;
    else if (types.includes("postal_code")) zip = comp.long_name;
  }

  const address = [streetNumber, route].filter(Boolean).join(" ");
  const loc = place.geometry?.location;

  return {
    address: address || place.formatted_address || "",
    city,
    state,
    zip,
    lat: loc?.lat() ?? 0,
    lng: loc?.lng() ?? 0,
    name: place.name,
  };
}

export function AddressAutocomplete({
  value,
  onChange,
  onSelect,
  placeholder = "Start typing an address...",
  className,
}: AddressAutocompleteProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadPlaces()
      .then(() => {
        if (!cancelled) setReady(true);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const initAutocomplete = useCallback(() => {
    if (!ready || !inputRef.current || autocompleteRef.current) return;

    const ac = new google.maps.places.Autocomplete(inputRef.current, {
      types: ["address"],
      componentRestrictions: { country: "us" },
      fields: [
        "address_components",
        "formatted_address",
        "geometry",
        "name",
      ],
    });

    ac.addListener("place_changed", () => {
      const place = ac.getPlace();
      if (!place.geometry) return;

      const result = extractAddressComponents(place);
      onSelect(result);
    });

    autocompleteRef.current = ac;
  }, [ready, onSelect]);

  useEffect(() => {
    initAutocomplete();
  }, [initAutocomplete]);

  // If Places API isn't available, just render a plain input
  if (!process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY) {
    return (
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={className}
      />
    );
  }

  return (
    <input
      ref={inputRef}
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={ready ? placeholder : "Loading..."}
      className={`w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent ${className || ""}`}
    />
  );
}
