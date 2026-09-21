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
  assert.match(src, /pt-\[env\(safe-area-inset-top,0px\)\]/);
  assert.doesNotMatch(src, /pwa-safe-top/);
});

test("panel layout shell does not double-apply safe-area top padding", () => {
  const src = read("src/components/layout/layout-shell.tsx");
  assert.doesNotMatch(src, /pwa-safe-top/);
});

test("mobile overlays scroll internally and lock the page", () => {
  const overlay = read("src/components/staff/staff-overlay.tsx");
  assert.match(overlay, /useLockBodyScroll/);
  assert.match(read("src/app/admin/bookings/hooks/use-booking-detail-panel.ts"), /useLockBodyScroll/);
  assert.match(overlay, /fixed inset-0 flex overflow-hidden/);
  assert.match(overlay, /hidden lg:block flex-1/);
  assert.match(overlay, /StaffPanelHeader/);

  const modal = read("src/components/ui/modal.tsx");
  assert.match(modal, /nga-overlay-scroll/);
  assert.match(modal, /overflow-y-auto overscroll-contain/);
  assert.match(modal, /nga-overlay-close/);
  assert.match(modal, /role="dialog"/);
  assert.match(modal, /useLockBodyScroll/);
  assert.match(modal, /tier === "staff" \? STAFF_OVERLAY_Z/);

  const sheet = read("src/components/ui/sheet.tsx");
  assert.match(sheet, /useLockBodyScroll\(tier === "staff"\)/);
  assert.match(sheet, /tier === "staff" \? STAFF_OVERLAY_Z/);

  assert.match(overlay, /StaffInlineOverlay/);
  assert.match(read("src/components/admin/vehicle-image-manager.tsx"), /StaffInlineOverlay/);
  assert.match(read("src/components/admin/insurance-card-manager.tsx"), /StaffInlineOverlay/);
  assert.match(read("src/app/admin/bookings/components/InPersonAgreementSign.tsx"), /useLockBodyScroll\(true\)/);
  assert.match(read("src/app/admin/bookings/components/BookingDetailPanel.tsx"), /StaffPortal/);
  assert.match(read("src/components/staff/staff-portal.tsx"), /createPortal/);

  const tabs = read("src/components/staff/staff-bottom-tab-bar.tsx");
  assert.match(tabs, /useLockBodyScroll/);
  assert.match(tabs, /nga-overlay-scroll/);
  assert.match(tabs, /role="dialog"/);
});

test("globals keep staff-panel scroll and dark-mode contrast tokens", () => {
  const css = read("src/app/globals.css");
  assert.match(css, /html\.nga-staff-panel:has\(\.nga-staff-panel-root\)/);
  assert.match(css, /html\.admin-dark/);
  assert.match(css, /\.nga-overlay-scroll/);
  assert.match(css, /\.admin-dark \.text-gray-300 \{ color: #cbd5e1/);
  assert.match(css, /\.admin-dark \.bg-white\\\/85/);
  assert.match(css, /\.admin-dark \.nga-panel-header h1/);
  assert.match(css, /html\.nga-staff-panel \.nga-staff-scroll \.page-hero/);
  assert.match(css, /scroll-padding-bottom: calc\(env\(safe-area-inset-bottom, 0px\) \+ 6rem\)/);
});

test("mobile messages conversation avoids forced min-height", () => {
  const messages = read("src/app/admin/messages/shared-messages-page.tsx");
  assert.match(messages, /max-lg:min-h-0/);
});
