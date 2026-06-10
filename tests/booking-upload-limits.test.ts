import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  BOOKING_UPLOAD_ALLOWED_MIME_TYPES,
  BOOKING_UPLOAD_DOC_TYPES,
  BOOKING_UPLOAD_MAX_BYTES,
} from "@/lib/bookings/upload-limits";

const root = process.cwd();

test("upload limits are stable contract for mobile and API", () => {
  assert.equal(BOOKING_UPLOAD_MAX_BYTES, 5 * 1024 * 1024);
  assert.deepEqual([...BOOKING_UPLOAD_DOC_TYPES], ["id_document", "insurance_proof"]);
  assert.ok(BOOKING_UPLOAD_ALLOWED_MIME_TYPES.includes("application/pdf"));
});

test("vehicle admin upload disallows SVG", () => {
  const source = fs.readFileSync(
    path.join(root, "src/app/api/admin/vehicles/upload/route.ts"),
    "utf8"
  );
  assert.ok(!source.includes("image/svg+xml"));
  assert.ok(source.includes("validateImageOrPdfMagicBytes"));
});

test("maintenance and profile uploads validate magic bytes", () => {
  for (const rel of [
    "src/app/api/admin/maintenance/upload/route.ts",
    "src/app/api/admin/profile-picture/route.ts",
    "src/app/api/upload-temp/route.ts",
  ]) {
    const source = fs.readFileSync(path.join(root, rel), "utf8");
    assert.ok(source.includes("validateImageOrPdfMagicBytes"), `${rel} must validate magic bytes`);
  }
});
