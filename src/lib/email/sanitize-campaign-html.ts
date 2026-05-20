import DOMPurify from "isomorphic-dompurify";

/** Marker inserted in the composer; replaced server-side with vehicle cards. */
export const MARKETING_VEHICLE_MARKER = "<!-- NGA_VEHICLES -->";

export function sanitizeCampaignHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      "b",
      "strong",
      "i",
      "em",
      "br",
      "div",
      "p",
      "h2",
      "h3",
      "ul",
      "ol",
      "li",
      "a",
    ],
    ALLOWED_ATTR: ["href", "target", "rel"],
    ALLOW_DATA_ATTR: false,
  });
}
