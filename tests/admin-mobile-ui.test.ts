import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function read(rel: string) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

test("staff theme applies admin-dark on the document for portaled overlays", () => {
  const src = read("src/lib/context/theme-context.tsx");
  assert.match(src, /document\.documentElement/);
  assert.match(src, /classList\.add\("nga-staff-panel"\)/);
  assert.match(src, /classList\.toggle\("admin-dark"/);
});

test("staff shell uses a dedicated mobile scroll owner", () => {
  const src = read("src/components/staff/StaffPanelShell.tsx");
  assert.match(src, /nga-staff-panel-root/);
  assert.match(src, /nga-staff-scroll/);
  assert.match(src, /overscroll-y-contain/);
});

test("mobile overlays scroll internally and lock the page", () => {
  const overlay = read("src/components/staff/staff-overlay.tsx");
  assert.match(overlay, /useLockBodyScroll/);
  assert.match(overlay, /max-h-\[min\(92dvh,100%\)\]/);
  assert.match(overlay, /rounded-t-2xl/);

  const modal = read("src/components/ui/modal.tsx");
  assert.match(modal, /nga-overlay-scroll/);
  assert.match(modal, /nga-overlay-close/);
  assert.match(modal, /role="dialog"/);

  const tabs = read("src/components/staff/staff-bottom-tab-bar.tsx");
  assert.match(tabs, /useLockBodyScroll/);
  assert.match(tabs, /nga-overlay-scroll/);
  assert.match(tabs, /role="dialog"/);
});

test("globals keep staff-panel scroll and dark-mode contrast tokens", () => {
  const css = read("src/app/globals.css");
  assert.match(css, /html\.nga-staff-panel/);
  assert.match(css, /html\.admin-dark/);
  assert.match(css, /\.nga-overlay-scroll/);
  assert.match(css, /\.admin-dark \.text-gray-300 \{ color: #cbd5e1/);
});
