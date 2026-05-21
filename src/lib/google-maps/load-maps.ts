/**
 * Singleton loader for the Maps JavaScript API (recommended loading=async pattern).
 * @see https://developers.google.com/maps/documentation/javascript/load-maps-js-api
 */

const CALLBACK_NAME = "__ngaGoogleMapsInit";

let loadPromise: Promise<void> | null = null;
let loaded = false;

declare global {
  interface Window {
    [CALLBACK_NAME]?: () => void;
  }
}

export function isGoogleMapsLoaded(): boolean {
  return loaded && typeof google !== "undefined" && Boolean(google.maps);
}

export function loadGoogleMaps(): Promise<void> {
  if (isGoogleMapsLoaded()) return Promise.resolve();
  if (loadPromise) return loadPromise;

  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY;
  if (!key) {
    return Promise.reject(new Error("Google Maps API key not configured"));
  }

  loadPromise = new Promise((resolve, reject) => {
    const finish = () => {
      loaded = true;
      resolve();
    };

    const fail = (message: string) => {
      loadPromise = null;
      reject(new Error(message));
    };

    if (typeof google !== "undefined" && google.maps) {
      finish();
      return;
    }

    const existing = document.querySelector<HTMLScriptElement>('script[src*="maps.googleapis.com/maps/api/js"]');
    if (existing) {
      if (existing.dataset.ngaLoaded === "true") {
        finish();
        return;
      }
      existing.addEventListener("load", () => finish(), { once: true });
      existing.addEventListener("error", () => fail("Failed to load Google Maps"), { once: true });
      return;
    }

    window[CALLBACK_NAME] = () => {
      delete window[CALLBACK_NAME];
      finish();
    };

    const script = document.createElement("script");
    script.async = true;
    script.defer = true;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&libraries=marker&loading=async&callback=${CALLBACK_NAME}`;
    script.onerror = () => {
      delete window[CALLBACK_NAME];
      fail("Failed to load Google Maps");
    };
    document.head.appendChild(script);
  });

  return loadPromise;
}

/** Detect billing/auth failures surfaced as global script errors */
export function isGoogleMapsBillingError(message: string): boolean {
  return /BillingNotEnabled|billing-not-enabled|ApiNotActivatedMapError/i.test(message);
}
