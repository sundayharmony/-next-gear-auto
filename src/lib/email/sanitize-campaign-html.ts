import sanitizeHtml from "sanitize-html";

/** Marker inserted in the composer; replaced server-side with vehicle cards. */
export const MARKETING_VEHICLE_MARKER = "<!-- NGA_VEHICLES -->";

const CAMPAIGN_SANITIZE_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
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
  allowedAttributes: {
    a: ["href", "target", "rel"],
  },
  allowedSchemes: ["http", "https", "mailto"],
  allowVulnerableTags: false,
};

export function sanitizeCampaignHtml(html: string): string {
  return sanitizeHtml(html, CAMPAIGN_SANITIZE_OPTIONS);
}
