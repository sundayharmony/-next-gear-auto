import { NextRequest, NextResponse } from "next/server";
import { getAuthFromRequest } from "@/lib/auth/jwt";
import { logger } from "@/lib/utils/logger";

/**
 * Server-side geocoding proxy.
 * Calls the Google Geocoding API from the server so the API key is not
 * subject to browser HTTP-referrer restrictions.
 *
 * GET /api/admin/geocode?address=...   → forward geocode (address → lat/lng)
 * GET /api/admin/geocode?lat=...&lng=... → reverse geocode (lat/lng → address)
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthFromRequest(request);
    if (!auth || auth.role !== "admin") {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const key = process.env.GOOGLE_MAPS_SERVER_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY;
    if (!key) {
      return NextResponse.json(
        { success: false, message: "Google Maps API key not configured" },
        { status: 500 }
      );
    }

    const { searchParams } = request.nextUrl;
    const address = searchParams.get("address");
    const lat = searchParams.get("lat");
    const lng = searchParams.get("lng");

    let url: string;

    if (address) {
      // Forward geocode
      url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&components=country:US&key=${key}`;
    } else if (lat && lng) {
      // Validate numeric
      const latNum = parseFloat(lat);
      const lngNum = parseFloat(lng);
      if (isNaN(latNum) || isNaN(lngNum) || latNum < -90 || latNum > 90 || lngNum < -180 || lngNum > 180) {
        return NextResponse.json(
          { success: false, message: "Invalid lat/lng values" },
          { status: 400 }
        );
      }
      // Reverse geocode
      url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latNum},${lngNum}&key=${key}`;
    } else {
      return NextResponse.json(
        { success: false, message: "Provide either 'address' or 'lat' & 'lng' query params" },
        { status: 400 }
      );
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    const res = await fetch(url, { cache: "no-store", signal: controller.signal });
    clearTimeout(timeout);
    if (!res.ok) {
      logger.error("Geocoding API HTTP error:", res.status);
      return NextResponse.json(
        { success: false, message: `Geocoding API returned HTTP ${res.status}` },
        { status: 502 }
      );
    }

    const data = await res.json();

    if (data.status === "REQUEST_DENIED") {
      logger.error("Geocoding API denied:", data.error_message);
      return NextResponse.json(
        { success: false, message: "Geocoding API request denied. Check that the Geocoding API is enabled in Google Cloud Console." },
        { status: 403 }
      );
    }

    if (data.status === "ZERO_RESULTS" || !data.results?.length) {
      return NextResponse.json({ success: true, results: [] });
    }

    // Parse and return clean results
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const results = data.results.slice(0, 5).map((r: any) => {
      const comps: any[] = r.address_components || [];
      let streetNumber = "", route = "", city = "", state = "", zip = "";
      for (const c of comps) {
        const types: string[] = c.types || [];
        if (types.includes("street_number")) streetNumber = c.long_name;
        else if (types.includes("route")) route = c.long_name;
        else if (types.includes("locality")) city = c.long_name;
        else if (types.includes("sublocality_level_1") && !city) city = c.long_name;
        else if (types.includes("administrative_area_level_1")) state = c.short_name;
        else if (types.includes("postal_code")) zip = c.long_name;
      }
      const loc = r.geometry?.location;
      return {
        formatted_address: r.formatted_address || "",
        address: [streetNumber, route].filter(Boolean).join(" "),
        city,
        state,
        zip,
        lat: loc?.lat ?? 0,
        lng: loc?.lng ?? 0,
      };
    });

    return NextResponse.json({ success: true, results });
  } catch (err) {
    logger.error("Geocode API error:", err);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}
