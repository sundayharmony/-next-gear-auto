import test from "node:test";
import assert from "node:assert/strict";
import {
  generateLocalBusinessSchema,
  generateOrganizationSchema,
} from "@/lib/utils/schema-generators";
import { getCanonicalSiteUrl, SITE_URL } from "@/lib/constants";

test("organization schema includes Instagram sameAs", () => {
  const schema = generateOrganizationSchema();
  assert.equal(schema.url, SITE_URL);
  assert.ok(Array.isArray(schema.sameAs));
  assert.ok(schema.sameAs.some((url) => url.includes("instagram.com")));
});

test("local business schema omits aggregateRating without reviews", () => {
  const schema = generateLocalBusinessSchema();
  assert.equal(schema.aggregateRating, undefined);
});

test("local business schema includes aggregateRating when provided", () => {
  const schema = generateLocalBusinessSchema({
    ratingValue: 4.75,
    reviewCount: 12,
  });
  assert.deepEqual(schema.aggregateRating, {
    "@type": "AggregateRating",
    ratingValue: 4.8,
    reviewCount: "12",
    bestRating: "5",
    worstRating: "1",
  });
});

test("getCanonicalSiteUrl prefers production www host outside localhost", () => {
  assert.equal(getCanonicalSiteUrl(), SITE_URL);
});
