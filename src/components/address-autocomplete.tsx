"use client";

import React from "react";
import { Input } from "@/components/ui/input";

interface AddressAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onSelect?: (result: AddressResult) => void;
  placeholder?: string;
  className?: string;
}

export interface AddressResult {
  address: string;
  city: string;
  state: string;
  zip: string;
  lat: number;
  lng: number;
  name?: string;
}

/**
 * Address input component.
 *
 * The legacy google.maps.places.Autocomplete widget is no longer available for
 * newly-created API keys (Google now requires PlaceAutocompleteElement which
 * renders its own shadow-DOM input and is difficult to integrate with React
 * controlled forms). Instead we use a plain styled input. Coordinate lookup is
 * handled separately via the Geocoding API ("Auto-detect from address" button
 * in the admin locations page).
 */
export function AddressAutocomplete({
  value,
  onChange,
  placeholder = "Enter full address...",
  className,
}: AddressAutocompleteProps) {
  return (
    <Input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={className}
    />
  );
}
