import test from "node:test";
import assert from "node:assert/strict";
import {
  BOOKING_UPLOAD_ALLOWED_MIME_TYPES,
  BOOKING_UPLOAD_DOC_TYPES,
  BOOKING_UPLOAD_MAX_BYTES,
} from "@/lib/bookings/upload-limits";

test("upload limits are stable contract for mobile and API", () => {
  assert.equal(BOOKING_UPLOAD_MAX_BYTES, 5 * 1024 * 1024);
  assert.deepEqual([...BOOKING_UPLOAD_DOC_TYPES], ["id_document", "insurance_proof"]);
  assert.ok(BOOKING_UPLOAD_ALLOWED_MIME_TYPES.includes("application/pdf"));
});
