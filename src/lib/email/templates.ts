import { escapeHtml } from "@/lib/utils/validation";

const COMPANY_ADDRESS = "92 Forrest Street, Jersey City, NJ 07304";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://rentnextgearauto.com";

interface EmailData {
  bookingId: string;
  customerName: string;
  customerEmail: string;
  vehicleName: string;
  pickupDate: string;
  returnDate: string;
  pickupTime?: string;
  returnTime?: string;
  totalPrice: number;
  deposit: number;
  needsPassword?: boolean;
  pickupLocationName?: string;
  returnLocationName?: string;
}

/** Sanitize CSS color values to prevent injection */
function safeCssColor(value: string): string {
  // Allow hex colors, named colors, rgb/rgba/hsl, and linear-gradient
  // Preserve commas for rgb/rgba functions
  const safe = value.replace(/[^a-zA-Z0-9#(),.\s%-]/g, "");
  return safe;
}

/** Format "2026-03-06" → "Fri, Mar 6, 2026" */
export function fmtDate(dateStr: string): string {
  const date = new Date(dateStr + (dateStr.includes("T") ? "" : "T00:00:00"));
  if (isNaN(date.getTime())) {
    // Return "Invalid Date" string to indicate a problem
    return "Invalid Date";
  }
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/** Format "10:00" → "10:00 AM", "14:30" → "2:30 PM" */
export function fmtTime(timeStr: string | undefined | null): string {
  if (!timeStr) return "";
  const [h, m] = timeStr.split(":").map(Number);
  if (isNaN(h) || isNaN(m) || h < 0 || h > 23 || m < 0 || m > 59) return timeStr;
  const ampm = h >= 12 ? "PM" : "AM";
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${ampm}`;
}

function wrapEmail(content: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->
</head>
<body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; -webkit-font-smoothing: antialiased;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6;">
    <tr>
      <td align="center" style="padding: 40px 16px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.06);">
          ${content}
          <!-- Footer -->
          <tr>
            <td style="padding: 24px 32px; background: #1f2937; text-align: center;">
              <p style="margin: 0 0 8px; color: #ffffff; font-size: 15px; font-weight: 700; letter-spacing: 0.5px;">Next<span style="color: #a78bfa;">Gear</span>Auto</p>
              <p style="margin: 0 0 4px; color: #9ca3af; font-size: 12px;">${COMPANY_ADDRESS}</p>
              <p style="margin: 0 0 12px; color: #9ca3af; font-size: 12px;">(551) 429-3472 &bull; contact@rentnextgearauto.com</p>
              <p style="margin: 0; color: #6b7280; font-size: 11px;">Mon-Fri 8:00 AM - 6:00 PM</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/* ─── Shared components ─── */

function headerBlock(title: string, subtitle: string, bgColor = '#7C3AED', bgEnd = '#5B21B6'): string {
  return `
  <tr>
    <td style="background: linear-gradient(135deg, ${safeCssColor(bgColor)}, ${safeCssColor(bgEnd)}); padding: 40px 32px; text-align: center;">
      <p style="margin: 0 0 12px; color: rgba(255,255,255,0.9); font-size: 13px; font-weight: 600; letter-spacing: 2px; text-transform: uppercase;">NextGearAuto</p>
      <h1 style="margin: 0 0 8px; color: #ffffff; font-size: 26px; font-weight: 800; line-height: 1.2;">${escapeHtml(title)}</h1>
      <p style="margin: 0; color: rgba(255,255,255,0.75); font-size: 14px;">${escapeHtml(subtitle)}</p>
    </td>
  </tr>`;
}

function bookingIdBlock(id: string, color = '#7C3AED', bg = '#F5F3FF'): string {
  return `
  <tr>
    <td style="padding: 0 32px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 24px 0;">
        <tr>
          <td style="background: ${safeCssColor(bg)}; border-radius: 12px; padding: 16px 20px; border: 1px solid ${safeCssColor(color)}20;">
            <p style="margin: 0 0 2px; color: #6b7280; font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 600;">Booking ID</p>
            <p style="margin: 0; color: ${safeCssColor(color)}; font-size: 18px; font-weight: 700; font-family: 'SF Mono', 'Fira Code', monospace; letter-spacing: 0.5px;">${id}</p>
          </td>
        </tr>
      </table>
    </td>
  </tr>`;
}

function detailRow(label: string, value: string, bold = false): string {
  return `<tr>
    <td style="padding: 12px 0; border-bottom: 1px solid #f3f4f6; color: #6b7280; font-size: 14px;">${escapeHtml(label)}</td>
    <td style="padding: 12px 0; border-bottom: 1px solid #f3f4f6; color: #111827; font-size: 14px; font-weight: ${bold ? '700' : '600'}; text-align: right;">${escapeHtml(value)}</td>
  </tr>`;
}

function dateTimeBlock(label: string, date: string, time: string | undefined, accentColor: string, bgGradient: string): string {
  const formattedDate = fmtDate(date);
  const formattedTime = fmtTime(time);
  return `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 12px 0;">
    <tr>
      <td style="background: ${safeCssColor(bgGradient)}; border-radius: 12px; padding: 20px; border-left: 4px solid ${safeCssColor(accentColor)};">
        <p style="margin: 0 0 10px; color: #6b7280; font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 700;">${label}</p>
        <p style="margin: 0; color: #111827; font-size: 20px; font-weight: 700; line-height: 1.3;">${formattedDate}</p>
        ${formattedTime ? `<p style="margin: 6px 0 0; color: ${safeCssColor(accentColor)}; font-size: 22px; font-weight: 800;">${formattedTime}</p>` : ''}
      </td>
    </tr>
  </table>`;
}

function ctaButton(text: string, url: string, color = '#7C3AED'): string {
  return `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 28px 0 8px;">
    <tr>
      <td align="center">
        <a href="${escapeHtml(url)}" style="display: inline-block; background: ${safeCssColor(color)}; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 10px; font-weight: 700; font-size: 15px; letter-spacing: 0.3px;">${text}</a>
      </td>
    </tr>
  </table>`;
}

function outlineButton(text: string, url: string, color = '#7C3AED'): string {
  return `<a href="${escapeHtml(url)}" style="display: inline-block; background: #ffffff; color: ${safeCssColor(color)}; text-decoration: none; padding: 12px 24px; border-radius: 10px; font-weight: 700; font-size: 14px; border: 2px solid ${safeCssColor(color)}; margin-left: 8px;">${text}</a>`;
}

function infoBox(title: string, text: string, color: string, bg: string): string {
  return `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 20px 0;">
    <tr>
      <td style="background: ${safeCssColor(bg)}; border-radius: 12px; padding: 20px; border-left: 4px solid ${safeCssColor(color)};">
        <p style="margin: 0 0 6px; color: ${safeCssColor(color)}; font-size: 14px; font-weight: 700;">${title}</p>
        <p style="margin: 0; color: #4b5563; font-size: 13px; line-height: 1.6;">${text}</p>
      </td>
    </tr>
  </table>`;
}

/* ─── Templates ─── */

/* Shared helper for booking pending/confirmation emails */
function bookingEmailTemplate(
  data: {
    customerName: string;
    bookingId: string;
    vehicleName: string;
    pickupDate: string;
    returnDate: string;
    pickupTime?: string;
    returnTime?: string;
    totalPrice: number;
    deposit: number;
    customerEmail?: string;
    needsPassword?: boolean;
    passwordToken?: string;
    pickupLocationName?: string;
    returnLocationName?: string;
  },
  opts: {
    subject: string;
    heading: string;
    headingColor?: string;
    message: string;
    showConfirmationLink?: boolean;
    confirmationUrl?: string;
    showAccountLink?: boolean;
    accountUrl?: string;
    accountLinkText?: string;
    bottomNote: string;
  }
): { subject: string; html: string } {
  const html = wrapEmail(`
    <tr>
      <td style="padding: 40px 32px 24px; text-align: center;">
        <p style="margin: 0 0 6px; color: #6b7280; font-size: 12px; font-weight: 600; letter-spacing: 2px; text-transform: uppercase;">NextGearAuto</p>
        <h1 style="margin: 0 0 8px; color: #111827; font-size: 24px; font-weight: 700;">${opts.heading}</h1>
      </td>
    </tr>
    <tr>
      <td style="padding: 0 32px;">
        <p style="margin: 0 0 20px; color: #4b5563; font-size: 15px; line-height: 1.6; text-align: center;">Hi ${escapeHtml(data.customerName)}, ${opts.message}</p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: #f9fafb; border-radius: 12px; padding: 0; margin: 0 0 20px;">
          <tr>
            <td style="padding: 20px 24px;">
              <p style="margin: 0 0 4px; color: #9ca3af; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">Booking ID</p>
              <p style="margin: 0 0 16px; color: #111827; font-size: 14px; font-weight: 600; font-family: monospace;">${data.bookingId}</p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                ${detailRow('Vehicle', escapeHtml(data.vehicleName), true)}
                ${detailRow('Pick-up', `${fmtDate(data.pickupDate)}${data.pickupTime ? ' at ' + fmtTime(data.pickupTime) : ''}`)}
                ${detailRow('Return', `${fmtDate(data.returnDate)}${data.returnTime ? ' at ' + fmtTime(data.returnTime) : ''}`)}
                ${data.pickupLocationName ? `${detailRow('Pickup Location', escapeHtml(data.pickupLocationName) + (data.returnLocationName && data.returnLocationName !== data.pickupLocationName ? `<br/><span style="color:#6b7280;font-weight:400;">Return: ${escapeHtml(data.returnLocationName)}</span>` : ''))}` : ''}
                ${detailRow('Total', '$' + (data.totalPrice ?? 0).toFixed(2), true)}
              </table>
            </td>
          </tr>
        </table>
        <p style="margin: 0 0 24px; color: #6b7280; font-size: 13px; line-height: 1.6; text-align: center;">${opts.bottomNote}</p>
        ${data.needsPassword ? `
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 0 0 16px;">
          <tr>
            <td style="background: #f0f9ff; border-radius: 10px; padding: 16px 20px; text-align: center;">
              <p style="margin: 0 0 8px; color: #1e40af; font-size: 14px; font-weight: 600;">Create Your Account</p>
              <p style="margin: 0 0 12px; color: #4b5563; font-size: 13px;">Set up a password to manage your bookings and speed up future reservations.</p>
              <a href="${SITE_URL}/set-password?email=${encodeURIComponent(data.customerEmail || '')}${data.passwordToken ? '&token=' + encodeURIComponent(data.passwordToken) : ''}" style="display: inline-block; background: #1e40af; color: #ffffff; text-decoration: none; padding: 10px 24px; border-radius: 8px; font-weight: 600; font-size: 13px;">Set Up My Password</a>
            </td>
          </tr>
        </table>` : ''}
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 0 0 8px;">
          ${opts.showConfirmationLink ? `<tr>
            <td align="center" style="padding: 0 0 8px;">
              <a href="${opts.confirmationUrl}" style="display: inline-block; background: #111827; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 10px; font-weight: 600; font-size: 15px;">${opts.accountLinkText || 'View My Booking'}</a>
            </td>
          </tr>` : ''}
          <tr>
            <td align="center"${opts.showConfirmationLink ? ' style="padding: 0 0 8px;"' : ''}>
              <a href="${opts.accountUrl}" style="display: inline-block; background: #111827; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 10px; font-weight: 600; font-size: 15px;">${opts.accountLinkText ? 'View Bookings' : 'View My Booking'}</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  `);
  return { subject: opts.subject, html };
}

export function bookingPendingTemplate(data: EmailData): string {
  if (!data || !data.customerName || !data.bookingId) {
    throw new Error("Invalid email data: missing required fields");
  }
  const result = bookingEmailTemplate(
    data,
    {
      subject: 'Booking Received',
      heading: 'Booking Received',
      message: "we've received your reservation. Here are your details:",
      showConfirmationLink: false,
      accountUrl: `${SITE_URL}/account`,
      accountLinkText: 'View My Booking',
      bottomNote: "You'll receive a confirmation once your payment is verified. Please bring a valid driver's license at pickup.",
    }
  );
  return result.html;
}

export function bookingConfirmationTemplate(data: EmailData): string {
  if (!data || !data.customerName || !data.bookingId) {
    throw new Error("Invalid email data: missing required fields");
  }
  const paymentText = data.totalPrice > 0 ? ` and your payment of <strong>$${(data.totalPrice ?? 0).toFixed(2)}</strong> has been received` : '';
  const bottomNote = data.totalPrice > 0 ? "Please bring a valid driver's license at pickup." : "Your complimentary rental is confirmed. Please bring a valid driver's license at pickup.";

  const result = bookingEmailTemplate(
    data,
    {
      subject: 'Booking Confirmed',
      heading: 'Booking Confirmed',
      message: `your reservation is confirmed${paymentText}.`,
      showConfirmationLink: true,
      confirmationUrl: `${SITE_URL}/booking/agreement/${data.bookingId}`,
      accountUrl: `${SITE_URL}/account`,
      accountLinkText: 'Sign Rental Agreement',
      bottomNote,
    }
  );
  return result.html;
}

export function adminNewBookingTemplate(data: EmailData): string {
  if (!data || !data.customerName || !data.bookingId) {
    throw new Error("Invalid email data: missing required fields");
  }
  return wrapEmail(`
    ${headerBlock('New Booking Received', 'A customer just booked a vehicle', '#059669', '#047857')}
    ${bookingIdBlock(data.bookingId, '#059669', '#ecfdf5')}
    <tr>
      <td style="padding: 0 32px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          ${detailRow('Customer', escapeHtml(data.customerName), true)}
          ${detailRow('Email', escapeHtml(data.customerEmail))}
          ${detailRow('Vehicle', escapeHtml(data.vehicleName), true)}
        </table>
        ${dateTimeBlock('Pick-up', data.pickupDate, data.pickupTime, '#059669', 'linear-gradient(135deg, #ecfdf5, #d1fae5)')}
        ${dateTimeBlock('Return', data.returnDate, data.returnTime, '#d97706', 'linear-gradient(135deg, #fffbeb, #fef3c7)')}
        ${data.pickupLocationName ? `
<tr>
  <td style="padding:8px 12px;color:#6b7280;font-size:14px;">Pickup Location</td>
  <td style="padding:8px 12px;font-weight:600;color:#111827;font-size:14px;">${escapeHtml(data.pickupLocationName)}${data.returnLocationName && data.returnLocationName !== data.pickupLocationName ? `<br/><span style="color:#6b7280;font-weight:400;">Return: ${escapeHtml(data.returnLocationName)}</span>` : ''}</td>
</tr>` : ''}
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="padding: 16px 0; color: #6b7280; font-size: 14px;">Total Paid</td>
            <td style="padding: 16px 0; color: #10b981; font-size: 22px; font-weight: 800; text-align: right;">$${(data.totalPrice ?? 0).toFixed(2)}</td>
          </tr>
        </table>
        ${ctaButton('View in Admin Dashboard', `${SITE_URL}/admin/bookings`, '#059669')}
      </td>
    </tr>
  `);
}

export function cancellationTemplate(data: EmailData): string {
  if (!data || !data.customerName || !data.bookingId) {
    throw new Error("Invalid email data: missing required fields");
  }
  return wrapEmail(`
    ${headerBlock('Booking Cancelled', 'Your reservation has been cancelled', '#DC2626', '#B91C1C')}
    <tr>
      <td style="padding: 32px 32px 0;">
        <p style="margin: 0 0 6px; color: #111827; font-size: 18px; font-weight: 600;">Hi ${escapeHtml(data.customerName)},</p>
        <p style="margin: 0; color: #6b7280; font-size: 14px; line-height: 1.7;">Your booking <strong style="color: #111827;">${escapeHtml(data.bookingId)}</strong> for the <strong>${escapeHtml(data.vehicleName)}</strong> has been cancelled.</p>
      </td>
    </tr>
    <tr>
      <td style="padding: 20px 32px 0;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="background: #fef2f2; border-radius: 12px; padding: 20px; border-left: 4px solid #dc2626;">
              <p style="margin: 0 0 10px; color: #6b7280; font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 700;">Original Dates</p>
              <p style="margin: 0; color: #111827; font-size: 18px; font-weight: 700;">${fmtDate(data.pickupDate)} &rarr; ${fmtDate(data.returnDate)}</p>
              ${data.pickupTime || data.returnTime ? `<p style="margin: 6px 0 0; color: #dc2626; font-size: 18px; font-weight: 700;">${fmtTime(data.pickupTime) || 'TBD'} &rarr; ${fmtTime(data.returnTime) || 'TBD'}</p>` : ''}
            </td>
          </tr>
        </table>
        <p style="margin: 20px 0 0; color: #6b7280; font-size: 13px; line-height: 1.6;">If you have questions about refunds or need further assistance, please don't hesitate to contact us.</p>
        ${ctaButton('Contact Us', 'mailto:contact@rentnextgearauto.com')}
      </td>
    </tr>
  `);
}

/* Shared helper for pickup/return reminder emails */
function reminderTemplate(
  data: {
    customerName: string;
    vehicleName: string;
    pickupDate: string;
    returnDate: string;
    pickupTime?: string;
    returnTime?: string;
    bookingId: string;
  },
  opts: { type: 'pickup' | 'return' }
): { subject: string; html: string } {
  const isPickup = opts.type === 'pickup';
  const headerTitle = isPickup ? "Your Pickup is Tomorrow!" : 'Return Reminder';
  const headerSubtitle = isPickup ? 'Get ready for your trip' : 'Your rental return is today';
  const headerBgColor = isPickup ? '#7C3AED' : '#f59e0b';
  const headerBgEnd = isPickup ? '#5B21B6' : '#d97706';
  const dateLabel = isPickup ? 'Pick-up Date & Time' : 'Return Date & Time';
  const dateValue = isPickup ? data.pickupDate : data.returnDate;
  const timeValue = isPickup ? data.pickupTime : data.returnTime;
  const accentColor = isPickup ? '#7C3AED' : '#f59e0b';
  const bgGradient = isPickup
    ? 'linear-gradient(135deg, #f5f3ff, #ede9fe)'
    : 'linear-gradient(135deg, #fffbeb, #fef3c7)';

  const message = isPickup
    ? `Just a reminder that your <strong style="color: #111827;">${escapeHtml(data.vehicleName)}</strong> is ready for pickup tomorrow.`
    : `This is a friendly reminder that your <strong style="color: #111827;">${escapeHtml(data.vehicleName)}</strong> (Booking ${escapeHtml(data.bookingId)}) is due for return today.`;

  const html = wrapEmail(`
    ${headerBlock(headerTitle, headerSubtitle, headerBgColor, headerBgEnd)}
    <tr>
      <td style="padding: 32px 32px 0;">
        <p style="margin: 0 0 6px; color: #111827; font-size: 18px; font-weight: 600;">Hi ${escapeHtml(data.customerName)},</p>
        <p style="margin: 0; color: #6b7280; font-size: 14px; line-height: 1.7;">${message}</p>
      </td>
    </tr>
    <tr>
      <td style="padding: 20px 32px 0;">
        ${dateTimeBlock(dateLabel, dateValue, timeValue, accentColor, bgGradient)}
        ${isPickup
          ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 20px 0;">
          <tr>
            <td style="background: #f5f3ff; border-radius: 12px; padding: 20px;">
              <p style="margin: 0 0 12px; color: #5b21b6; font-weight: 700; font-size: 14px;">Please bring:</p>
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr><td style="padding: 4px 0; color: #4b5563; font-size: 14px;">&bull;&nbsp; Valid driver's license</td></tr>
                <tr><td style="padding: 4px 0; color: #4b5563; font-size: 14px;">&bull;&nbsp; Credit card used for payment</td></tr>
                <tr><td style="padding: 4px 0; color: #4b5563; font-size: 14px;">&bull;&nbsp; Booking ID: <strong style="color: #7C3AED;">${data.bookingId}</strong></td></tr>
              </table>
            </td>
          </tr>
        </table>`
          : `${infoBox('Before You Return', 'Please return the vehicle with the same fuel level as pickup to avoid fuel charges. Ensure the vehicle is clean inside and out.', '#92400e', '#fffbeb')}`
        }
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 16px 0;">
          <tr>
            <td style="background: #f9fafb; border-radius: 12px; padding: 16px 20px; border: 1px solid #e5e7eb;">
              <p style="margin: 0 0 4px; color: #111827; font-size: 14px; font-weight: 700;">${isPickup ? 'Pick-up Location' : 'Return Location'}</p>
              <p style="margin: 0; color: #6b7280; font-size: 13px;">${COMPANY_ADDRESS}</p>
              ${isPickup ? '<p style="margin: 6px 0 0; color: #6b7280; font-size: 12px;">Mon-Fri 8AM-6PM &bull; Sat 9AM-5PM &bull; Sun 10AM-4PM</p>' : ''}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  `);
  return { subject: isPickup ? 'Your Pickup is Tomorrow!' : 'Return Reminder', html };
}

export function pickupReminderTemplate(data: EmailData): string {
  if (!data || !data.customerName || !data.vehicleName || !data.bookingId) {
    throw new Error("Invalid email data: missing required fields");
  }
  const result = reminderTemplate(
    {
      customerName: data.customerName,
      vehicleName: data.vehicleName,
      pickupDate: data.pickupDate,
      returnDate: data.returnDate,
      pickupTime: data.pickupTime,
      returnTime: data.returnTime,
      bookingId: data.bookingId,
    },
    { type: 'pickup' }
  );
  return result.html;
}

export function returnReminderTemplate(data: EmailData): string {
  if (!data || !data.customerName || !data.vehicleName || !data.bookingId) {
    throw new Error("Invalid email data: missing required fields");
  }
  const result = reminderTemplate(
    {
      customerName: data.customerName,
      vehicleName: data.vehicleName,
      pickupDate: data.pickupDate,
      returnDate: data.returnDate,
      pickupTime: data.pickupTime,
      returnTime: data.returnTime,
      bookingId: data.bookingId,
    },
    { type: 'return' }
  );
  return result.html;
}

export function bookingSignAgreementTemplate(data: EmailData): string {
  if (!data || !data.customerName || !data.bookingId) {
    throw new Error("Invalid email data: missing required fields");
  }
  return wrapEmail(`
    <tr>
      <td style="padding: 40px 32px 24px; text-align: center;">
        <p style="margin: 0 0 6px; color: #6b7280; font-size: 12px; font-weight: 600; letter-spacing: 2px; text-transform: uppercase;">NextGearAuto</p>
        <h1 style="margin: 0 0 8px; color: #111827; font-size: 24px; font-weight: 700;">Your Booking Details</h1>
      </td>
    </tr>
    <tr>
      <td style="padding: 0 32px;">
        <p style="margin: 0 0 20px; color: #4b5563; font-size: 15px; line-height: 1.6; text-align: center;">Hi ${escapeHtml(data.customerName)}, please review your details and sign the rental agreement before pickup.</p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: #f9fafb; border-radius: 12px; padding: 0; margin: 0 0 20px;">
          <tr>
            <td style="padding: 20px 24px;">
              <p style="margin: 0 0 4px; color: #9ca3af; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">Booking ID</p>
              <p style="margin: 0 0 16px; color: #111827; font-size: 14px; font-weight: 600; font-family: monospace;">${data.bookingId}</p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                ${detailRow('Vehicle', escapeHtml(data.vehicleName), true)}
                ${detailRow('Pick-up', `${fmtDate(data.pickupDate)}${data.pickupTime ? ' at ' + fmtTime(data.pickupTime) : ''}`)}
                ${detailRow('Return', `${fmtDate(data.returnDate)}${data.returnTime ? ' at ' + fmtTime(data.returnTime) : ''}`)}
                ${detailRow('Total', '$' + (data.totalPrice ?? 0).toFixed(2), true)}
                ${data.deposit > 0 ? detailRow('Deposit Paid', '$' + (data.deposit ?? 0).toFixed(2)) : ''}
              </table>
            </td>
          </tr>
        </table>
        <p style="margin: 0 0 24px; color: #6b7280; font-size: 13px; line-height: 1.6; text-align: center;">Pick-up at ${COMPANY_ADDRESS}.<br>Please bring a valid driver's license and the credit card used for payment.</p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 0 0 8px;">
          <tr>
            <td align="center" style="padding: 0 0 8px;">
              <a href="${SITE_URL}/booking/agreement/${data.bookingId}" style="display: inline-block; background: #111827; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 10px; font-weight: 600; font-size: 15px;">Sign Rental Agreement</a>
            </td>
          </tr>
          <tr>
            <td align="center">
              <a href="${SITE_URL}/account" style="color: #6b7280; text-decoration: underline; font-size: 13px;">View Bookings</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  `);
}

export function passwordResetTemplate(data: { customerName: string; customerEmail: string; token?: string }): string {
  if (!data || !data.customerName || !data.customerEmail) {
    throw new Error("Invalid email data: missing required fields");
  }
  const encodedEmail = encodeURIComponent(data.customerEmail);
  const tokenParam = data.token ? `&token=${encodeURIComponent(data.token)}` : "";
  return wrapEmail(`
    <tr>
      <td style="padding: 40px 32px 24px; text-align: center;">
        <p style="margin: 0 0 6px; color: #6b7280; font-size: 12px; font-weight: 600; letter-spacing: 2px; text-transform: uppercase;">NextGearAuto</p>
        <h1 style="margin: 0 0 8px; color: #111827; font-size: 24px; font-weight: 700;">Set Your Password</h1>
      </td>
    </tr>
    <tr>
      <td style="padding: 0 32px;">
        <p style="margin: 0 0 20px; color: #4b5563; font-size: 15px; line-height: 1.6; text-align: center;">Hi ${escapeHtml(data.customerName)}, use the button below to set up your password for your NextGearAuto account.</p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 0 0 20px;">
          <tr>
            <td align="center">
              <a href="${SITE_URL}/set-password?email=${encodedEmail}${tokenParam}" style="display: inline-block; background: #111827; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 10px; font-weight: 600; font-size: 15px;">Set My Password</a>
            </td>
          </tr>
        </table>
        <p style="margin: 0 0 24px; color: #6b7280; font-size: 13px; line-height: 1.6; text-align: center;">This link expires in 48 hours. If you didn't request this, you can safely ignore this email.</p>
      </td>
    </tr>
  `);
}
