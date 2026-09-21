import test from "node:test";
import assert from "node:assert/strict";
import { isSkippableSchemaError } from "@/lib/utils/supabase-column-errors";

test("isSkippableSchemaError treats PostgREST schema-cache column misses as skippable", () => {
  assert.equal(
    isSkippableSchemaError({
      message: "Could not find the 'blocked_date_id' column of 'expenses' in the schema cache",
    }),
    true
  );
  assert.equal(isSkippableSchemaError({ code: "PGRST204", message: "column not in schema cache" }), true);
  assert.equal(isSkippableSchemaError({ message: "permission denied" }), false);
});
