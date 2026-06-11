import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function read(rel: string) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

test("sheet and modal primitives declare dialog semantics", () => {
  for (const rel of ["src/components/ui/sheet.tsx", "src/components/ui/modal.tsx"]) {
    const src = read(rel);
    assert.match(src, /role="dialog"/);
    assert.match(src, /aria-modal="true"/);
  }
});

test("create booking shell uses Sheet primitive", () => {
  const src = read("src/app/admin/bookings/components/create-booking-shell.tsx");
  assert.match(src, /from "@\/components\/ui\/sheet"/);
  assert.match(src, /SheetContent/);
});

test("staff bottom tab More sheet uses dialog role", () => {
  const src = read("src/components/staff/staff-bottom-tab-bar.tsx");
  assert.match(src, /role="dialog"/);
  assert.match(src, /aria-labelledby/);
});
