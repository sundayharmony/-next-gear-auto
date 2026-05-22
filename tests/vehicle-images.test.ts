import test from "node:test";
import assert from "node:assert/strict";
import {
  dedupeVehicleImageUrls,
  diffRemovedImageUrls,
  isAllowedVehicleImageUrl,
  isLegacyStaticVehicleImageUrl,
  parseVehicleImageStoragePath,
  validateVehicleImagesInput,
  MAX_VEHICLE_IMAGES,
} from "@/lib/admin/vehicle-images";

const SUPABASE_URL =
  "https://example.supabase.co/storage/v1/object/public/vehicle-images/abc-123/photo.jpg";

test("parseVehicleImageStoragePath extracts bucket path", () => {
  assert.equal(parseVehicleImageStoragePath(SUPABASE_URL), "abc-123/photo.jpg");
});

test("isAllowedVehicleImageUrl accepts Supabase public URLs", () => {
  assert.equal(isAllowedVehicleImageUrl(SUPABASE_URL), true);
});

test("isAllowedVehicleImageUrl accepts legacy static paths", () => {
  assert.equal(isAllowedVehicleImageUrl("/images/vehicles/corolla.svg"), true);
  assert.equal(isLegacyStaticVehicleImageUrl("/images/vehicles/corolla.svg"), true);
});

test("isAllowedVehicleImageUrl rejects arbitrary URLs", () => {
  assert.equal(isAllowedVehicleImageUrl("https://evil.com/photo.jpg"), false);
});

test("dedupeVehicleImageUrls preserves first occurrence", () => {
  assert.deepEqual(
    dedupeVehicleImageUrls([SUPABASE_URL, SUPABASE_URL, "/images/vehicles/a.svg"]),
    [SUPABASE_URL, "/images/vehicles/a.svg"]
  );
});

test("diffRemovedImageUrls lists URLs dropped from the array", () => {
  const prev = [SUPABASE_URL, "/images/vehicles/a.svg"];
  const next = ["/images/vehicles/a.svg"];
  assert.deepEqual(diffRemovedImageUrls(prev, next), [SUPABASE_URL]);
});

test("validateVehicleImagesInput rejects duplicates and over max", () => {
  const many = Array.from({ length: MAX_VEHICLE_IMAGES + 1 }, (_, i) =>
    `/images/vehicles/car-${i}.svg`
  );
  const over = validateVehicleImagesInput(many);
  assert.equal(over.ok, false);

  const dup = validateVehicleImagesInput([SUPABASE_URL, SUPABASE_URL]);
  assert.equal(dup.ok, false);
});

test("validateVehicleImagesInput accepts a valid ordered list", () => {
  const result = validateVehicleImagesInput([
    "/images/vehicles/primary.svg",
    SUPABASE_URL,
  ]);
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.images.length, 2);
    assert.equal(result.images[0], "/images/vehicles/primary.svg");
  }
});
