import test from "node:test";
import assert from "node:assert/strict";
import {
  MARKETING_VEHICLE_MARKER,
  sanitizeCampaignHtml,
} from "@/lib/email/sanitize-campaign-html";
import { buildMarketingCampaignHtml } from "@/lib/email/marketing-templates";

test("sanitizeCampaignHtml allows basic formatting tags", () => {
  const out = sanitizeCampaignHtml(
    '<p>Hello</p><a href="https://example.com/fleet">Fleet</a>'
  );
  assert.match(out, /<p>Hello<\/p>/);
  assert.match(out, /href="https:\/\/example\.com\/fleet"/);
});

test("sanitizeCampaignHtml strips script tags", () => {
  const out = sanitizeCampaignHtml('<p>Hi</p><script>alert(1)</script>');
  assert.ok(!out.includes("script"));
  assert.ok(!out.includes("alert"));
  assert.match(out, /<p>Hi<\/p>/);
});

test("sanitizeCampaignHtml strips HTML comments including vehicle marker", () => {
  const out = sanitizeCampaignHtml(`<p>Body</p>${MARKETING_VEHICLE_MARKER}`);
  assert.ok(!out.includes("NGA_VEHICLES"));
  assert.match(out, /<p>Body<\/p>/);
});

test("buildMarketingCampaignHtml appends vehicles when marker was stripped", () => {
  const sanitized = sanitizeCampaignHtml(
    `<p>Hi there,</p><p>Update.</p>${MARKETING_VEHICLE_MARKER}`
  );
  const html = buildMarketingCampaignHtml(sanitized, [
    {
      id: "v1",
      year: 2020,
      make: "Toyota",
      model: "Camry",
      dailyRate: 50,
      isAvailable: true,
      images: [],
    },
  ]);
  assert.match(html, /Featured vehicles/);
  assert.match(html, /Toyota Camry/);
});
