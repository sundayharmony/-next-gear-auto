import { escapeHtml } from "@/lib/utils/validation";
import { getVehicleDisplayName } from "@/lib/types";
import { MARKETING_VEHICLE_MARKER } from "@/lib/email/sanitize-campaign-html";

const COMPANY_ADDRESS = "92 Forrest Street, Jersey City, NJ 07304";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://rentnextgearauto.com";

export interface MarketingVehicle {
  id: string;
  year: number;
  make: string;
  model: string;
  dailyRate: number;
  isAvailable: boolean;
  images?: string[];
  category?: string;
}

function absoluteImageUrl(url: string, siteUrl: string): string | null {
  const trimmed = url.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("https://")) return trimmed;
  if (trimmed.startsWith("http://")) return null;
  if (trimmed.startsWith("/")) return `${siteUrl.replace(/\/$/, "")}${trimmed}`;
  return `${siteUrl.replace(/\/$/, "")}/${trimmed}`;
}

export function buildMarketingVehicleCardsHtml(
  vehicles: MarketingVehicle[],
  siteUrl: string = SITE_URL,
): string {
  if (vehicles.length === 0) return "";

  const cards = vehicles
    .map((v) => {
      const name = getVehicleDisplayName(v);
      const fleetUrl = `${siteUrl.replace(/\/$/, "")}/fleet/${encodeURIComponent(v.id)}`;
      const imageRaw = v.images?.[0];
      const imageUrl = imageRaw ? absoluteImageUrl(imageRaw, siteUrl) : null;
      const availability = v.isAvailable
        ? `<span style="display:inline-block;padding:4px 10px;background:#d1fae5;color:#065f46;font-size:12px;font-weight:600;border-radius:999px;">Available now</span>`
        : `<span style="display:inline-block;padding:4px 10px;background:#fef3c7;color:#92400e;font-size:12px;font-weight:600;border-radius:999px;">Check availability</span>`;

      const imageBlock = imageUrl
        ? `<img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(name)}" width="280" style="display:block;width:100%;max-width:280px;height:160px;object-fit:cover;border-radius:12px 12px 0 0;" />`
        : `<div style="height:160px;background:linear-gradient(135deg,#ede9fe,#ddd6fe);border-radius:12px 12px 0 0;text-align:center;line-height:160px;color:#5b21b6;font-weight:700;">NextGearAuto</div>`;

      return `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px;max-width:320px;">
        <tr>
          <td style="border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;background:#ffffff;">
            ${imageBlock}
            <div style="padding:16px;">
              <p style="margin:0 0 6px;font-size:18px;font-weight:700;color:#111827;">${escapeHtml(name)}</p>
              ${v.category ? `<p style="margin:0 0 8px;font-size:13px;color:#6b7280;text-transform:capitalize;">${escapeHtml(v.category)}</p>` : ""}
              <p style="margin:0 0 10px;font-size:20px;font-weight:800;color:#7c3aed;">$${escapeHtml(String(v.dailyRate))}<span style="font-size:13px;font-weight:500;color:#6b7280;">/day</span></p>
              <p style="margin:0 0 12px;">${availability}</p>
              <a href="${escapeHtml(fleetUrl)}" style="display:inline-block;padding:10px 18px;background:#7c3aed;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;border-radius:8px;">View &amp; Book</a>
            </div>
          </td>
        </tr>
      </table>`;
    })
    .join("");

  return `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:28px 0 8px;">
    <tr>
      <td>
        <h2 style="margin:0 0 16px;font-size:20px;color:#111827;">Featured vehicles</h2>
        ${cards}
      </td>
    </tr>
  </table>`;
}

function wrapMarketingEmail(inner: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06);">
          <tr>
            <td style="background:linear-gradient(135deg,#7c3aed,#5b21b6);padding:32px;text-align:center;">
              <p style="margin:0 0 8px;color:rgba(255,255,255,0.9);font-size:12px;font-weight:600;letter-spacing:2px;text-transform:uppercase;">NextGearAuto</p>
              <p style="margin:0;color:#ffffff;font-size:15px;font-weight:600;">Vehicle availability update</p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;font-size:16px;line-height:1.6;color:#374151;">
              ${inner}
            </td>
          </tr>
          <tr>
            <td style="padding:24px 32px;background:#1f2937;text-align:center;">
              <p style="margin:0 0 8px;color:#ffffff;font-size:15px;font-weight:700;">Next<span style="color:#a78bfa;">Gear</span>Auto</p>
              <p style="margin:0 0 4px;color:#9ca3af;font-size:12px;">${COMPANY_ADDRESS}</p>
              <p style="margin:0 0 12px;color:#9ca3af;font-size:12px;">(551) 429-3472 &bull; contact@rentnextgearauto.com</p>
              <p style="margin:0;color:#6b7280;font-size:11px;">You received this email because you are a NextGearAuto customer.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function buildMarketingCampaignHtml(
  bodyHtml: string,
  vehicles: MarketingVehicle[],
  siteUrl: string = SITE_URL,
): string {
  const vehicleBlock = buildMarketingVehicleCardsHtml(vehicles, siteUrl);
  const bodyWithVehicles = bodyHtml.includes(MARKETING_VEHICLE_MARKER)
    ? bodyHtml.replace(MARKETING_VEHICLE_MARKER, vehicleBlock)
    : bodyHtml + vehicleBlock;

  const cta = `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:24px;">
    <tr>
      <td align="center">
        <a href="${escapeHtml(`${siteUrl.replace(/\/$/, "")}/fleet`)}" style="display:inline-block;padding:14px 28px;background:#7c3aed;color:#ffffff;text-decoration:none;font-size:15px;font-weight:700;border-radius:10px;">Browse full fleet</a>
      </td>
    </tr>
  </table>`;

  return wrapMarketingEmail(bodyWithVehicles + cta);
}

