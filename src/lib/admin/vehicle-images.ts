import type { SupabaseClient } from "@supabase/supabase-js";

export const VEHICLE_IMAGES_BUCKET = "vehicle-images";
export const MAX_VEHICLE_IMAGES = 20;

const STORAGE_PUBLIC_MARKER = `/storage/v1/object/public/${VEHICLE_IMAGES_BUCKET}/`;

/** Legacy static paths served from the app. */
const LEGACY_STATIC_PREFIX = "/images/vehicles/";

export function isValidVehicleId(id: unknown): id is string {
  if (typeof id !== "string") return false;
  const trimmed = id.trim();
  if (!trimmed) return false;
  return /^[A-Za-z0-9_-]{1,80}$/.test(trimmed);
}

export function parseVehicleImageStoragePath(url: string): string | null {
  const idx = url.indexOf(STORAGE_PUBLIC_MARKER);
  if (idx === -1) return null;
  const path = url.substring(idx + STORAGE_PUBLIC_MARKER.length).split("?")[0];
  return path || null;
}

export function isLegacyStaticVehicleImageUrl(url: string): boolean {
  return (
    typeof url === "string" &&
    url.startsWith(LEGACY_STATIC_PREFIX) &&
    !url.includes("..")
  );
}

export function isAllowedVehicleImageUrl(url: unknown): url is string {
  if (typeof url !== "string" || !url.trim()) return false;
  const trimmed = url.trim();
  if (isLegacyStaticVehicleImageUrl(trimmed)) return true;
  const path = parseVehicleImageStoragePath(trimmed);
  if (!path) return false;
  if (path.includes("..")) return false;
  return true;
}

/** Dedupe while preserving first occurrence order. */
export function dedupeVehicleImageUrls(urls: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of urls) {
    const url = raw.trim();
    if (!url || seen.has(url)) continue;
    seen.add(url);
    out.push(url);
  }
  return out;
}

export function diffRemovedImageUrls(prev: string[], next: string[]): string[] {
  const nextSet = new Set(next);
  return prev.filter((url) => !nextSet.has(url));
}

export function validateVehicleImagesInput(
  images: unknown
): { ok: true; images: string[] } | { ok: false; message: string } {
  if (!Array.isArray(images)) {
    return { ok: false, message: "images must be an array" };
  }
  if (images.length > MAX_VEHICLE_IMAGES) {
    return {
      ok: false,
      message: `Maximum ${MAX_VEHICLE_IMAGES} images allowed`,
    };
  }
  const deduped = dedupeVehicleImageUrls(
    images.filter((x): x is string => typeof x === "string")
  );
  if (deduped.length !== images.length) {
    return { ok: false, message: "Duplicate image URLs are not allowed" };
  }
  for (const url of deduped) {
    if (!isAllowedVehicleImageUrl(url)) {
      return { ok: false, message: "Invalid image URL" };
    }
  }
  return { ok: true, images: deduped };
}

export function storagePathsFromImageUrls(urls: string[]): string[] {
  return urls
    .map((url) => parseVehicleImageStoragePath(url))
    .filter((p): p is string => Boolean(p));
}

/** Copy temp/ bucket objects into {vehicleId}/ and return updated public URLs. */
export async function migrateTempImagesForVehicle(
  supabase: SupabaseClient,
  vehicleId: string,
  images: string[]
): Promise<string[]> {
  const migrated: string[] = [];

  for (const url of images) {
    const path = parseVehicleImageStoragePath(url);
    if (!path?.startsWith("temp/")) {
      migrated.push(url);
      continue;
    }

    const ext = path.includes(".") ? path.split(".").pop() : "jpg";
    const dest = `${vehicleId}/${crypto.randomUUID()}.${ext}`;
    const { error: copyError } = await supabase.storage
      .from(VEHICLE_IMAGES_BUCKET)
      .copy(path, dest);

    if (copyError) {
      migrated.push(url);
      continue;
    }

    const { data: urlData } = supabase.storage
      .from(VEHICLE_IMAGES_BUCKET)
      .getPublicUrl(dest);
    migrated.push(urlData.publicUrl);

    await supabase.storage.from(VEHICLE_IMAGES_BUCKET).remove([path]);
  }

  return migrated;
}
