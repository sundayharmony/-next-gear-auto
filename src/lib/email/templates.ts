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
}

const baseStyle = `
  body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5; }
  .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; }
  .header { background: linear-gradient(135deg, #7C3AED, #5B21B6); padding: 32px 24px; text-align: center; }
  .header h1 { color: #ffffff; margin: 0; font-size: 24px; }
  .header p { color: #DDD6FE; margin: 8px 0 0; font-size: 14px; }
  .body { padding: 32px 24px; }
  .detail-row { display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #f0f0f0; }
  .detail-label { color: #6B7280; font-size: 14px; }
  .detail-value { color: #111827; font-size: 14px; font-weight: 600; }
  .highlight { background: #F3F0FF; border-radius: 8px; padding: 16px; margin: 16px 0; }
  .footer { background: #F9FAFB; padding: 24px; text-align: center; border-top: 1px solid #E5E7EB; }
  .footer p { color: #9CA3AF; font-size: 12px; margin: 4px 0; }
  .btn { display: inline-block; background: #7C3AED; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; font-size: 14px; }
`;

function wrapEmail(content: string): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><style>${baseStyle}</style></head>
<body style="background-color: #f5f5f5; padding: 24px;">
  <div class="container" style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden;">
    ${content}
  </div>
</body>
</html>`;
}

export function bookingConfirmationTemplate(data: EmailData): string {
  return wrapEmail(`
    <div style="background: linear-gradient(135deg, #7C3AED, #5B21B6); padding: 32px 24px; text-align: center;">
      <h1 style="color: #ffffff; margin: 0; font-size: 24px;">Booking Confirmed!</h1>
      <p style="color: #DDD6FE; margin: 8px 0 0; font-size: 14px;">Your reservation is all set</p>
    </div>
    <div style="padding: 32px 24px;">
      <p style="color: #374151; font-size: 16px;">Hi ${data.customerName},</p>
      <p style="color: #6B7280; font-size: 14px; line-height: 1.6;">
        Your booking has been confirmed and your payment of $${data.totalPrice.toFixed(2)} has been received. Here are your booking details:
      </p>

      <div style="background: #F3F0FF; border-radius: 8px; padding: 20px; margin: 20px 0;">
        <p style="margin: 0 0 4px; color: #6B7280; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Booking ID</p>
        <p style="margin: 0; color: #7C3AED; font-size: 20px; font-weight: 700; font-family: monospace;">${data.bookingId}</p>
      </div>

      <table style="width: 100%; border-collapse: collapse;">
        <tr><td style="padding: 12px 0; border-bottom: 1px solid #f0f0f0; color: #6B7280; font-size: 14px;">Vehicle</td><td style="padding: 12px 0; border-bottom: 1px solid #f0f0f0; color: #111827; font-size: 14px; font-weight: 600; text-align: right;">${data.vehicleName}</td></tr>
        <tr><td colspan="2"><div style="background: linear-gradient(135deg, #EDE9FE, #F3E8FF); border-radius: 8px; padding: 16px; margin: 16px 0; border-left: 4px solid #7C3AED;"><p style="margin: 0 0 8px; color: #6B7280; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">Pick-up</p><p style="margin: 0; color: #111827; font-size: 16px; font-weight: 600;">${data.pickupDate}</p>${data.pickupTime ? `<p style="margin: 4px 0 0; color: #7C3AED; font-size: 20px; font-weight: 700;">${data.pickupTime}</p>` : ''}</div></td></tr>
        <tr><td colspan="2"><div style="background: linear-gradient(135deg, #FEF3C7, #FEF08A); border-radius: 8px; padding: 16px; margin: 16px 0; border-left: 4px solid #F59E0B;"><p style="margin: 0 0 8px; color: #6B7280; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">Return</p><p style="margin: 0; color: #111827; font-size: 16px; font-weight: 600;">${data.returnDate}</p>${data.returnTime ? `<p style="margin: 4px 0 0; color: #F59E0B; font-size: 20px; font-weight: 700;">${data.returnTime}</p>` : ''}</div></td></tr>
        <tr><td style="padding: 12px 0; color: #6B7280; font-size: 14px;">Total Paid</td><td style="padding: 12px 0; color: #10B981; font-size: 18px; font-weight: 700; text-align: right;">$${data.totalPrice.toFixed(2)}</td></tr>
      </table>

      <p style="color: #6B7280; font-size: 14px; line-height: 1.6; margin-top: 24px;">
        ${data.totalPrice > 0 ? 'Your rental has been paid in full. Please bring a valid driver\'s license and the credit card used for payment at pickup.' : 'Your complimentary rental is confirmed! Please bring a valid driver\'s license at pickup.'}
      </p>

      ${data.needsPassword ? `
      <div style="background: linear-gradient(135deg, #DBEAFE, #EFF6FF); border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid #3B82F6;">
        <p style="margin: 0 0 8px; color: #1E40AF; font-size: 14px; font-weight: 600;">Create Your Account</p>
        <p style="margin: 0 0 16px; color: #6B7280; font-size: 13px; line-height: 1.5;">Set up a password to manage your bookings, view rental history, and speed up future reservations.</p>
        <a href="https://rentnextgearauto.com/set-password?email=${encodeURIComponent(data.customerEmail)}" style="display: inline-block; background: #3B82F6; color: #ffffff; text-decoration: none; padding: 10px 20px; border-radius: 6px; font-weight: 600; font-size: 13px;">Set Up My Password</a>
      </div>
      ` : ''}

      <div style="text-align: center; margin: 24px 0;">
        <a href="https://rentnextgearauto.com/booking/agreement/${data.bookingId}" style="display: inline-block; background: #7C3AED; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; font-size: 14px; margin-right: 8px;">Sign Rental Agreement</a>
        <a href="https://rentnextgearauto.com/account" style="display: inline-block; background: #ffffff; color: #7C3AED; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; font-size: 14px; border: 2px solid #7C3AED;">View My Bookings</a>
      </div>
    </div>
    <div style="background: #F9FAFB; padding: 24px; text-align: center; border-top: 1px solid #E5E7EB;">
      <p style="color: #6B7280; font-size: 13px; margin: 0 0 4px;">Need help? Contact us at (551) 429-3472</p>
      <p style="color: #9CA3AF; font-size: 12px; margin: 0;">NextGearAuto | 92 Forrest Street, Jersey City, NJ 07304</p>
    </div>
  `);
}

export function adminNewBookingTemplate(data: EmailData): string {
  return wrapEmail(`
    <div style="background: linear-gradient(135deg, #059669, #047857); padding: 32px 24px; text-align: center;">
      <h1 style="color: #ffffff; margin: 0; font-size: 24px;">New Booking Received</h1>
      <p style="color: #A7F3D0; margin: 8px 0 0; font-size: 14px;">A customer just booked a vehicle</p>
    </div>
    <div style="padding: 32px 24px;">
      <div style="background: #ECFDF5; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
        <p style="margin: 0 0 4px; color: #6B7280; font-size: 12px; text-transform: uppercase;">Booking ID</p>
        <p style="margin: 0; color: #059669; font-size: 18px; font-weight: 700; font-family: monospace;">${data.bookingId}</p>
      </div>
      <table style="width: 100%; border-collapse: collapse;">
        <tr><td style="padding: 10px 0; border-bottom: 1px solid #f0f0f0; color: #6B7280; font-size: 14px;">Customer</td><td style="padding: 10px 0; border-bottom: 1px solid #f0f0f0; color: #111827; font-size: 14px; font-weight: 600; text-align: right;">${data.customerName}</td></tr>
        <tr><td style="padding: 10px 0; border-bottom: 1px solid #f0f0f0; color: #6B7280; font-size: 14px;">Email</td><td style="padding: 10px 0; border-bottom: 1px solid #f0f0f0; color: #111827; font-size: 14px; text-align: right;">${data.customerEmail}</td></tr>
        <tr><td style="padding: 10px 0; border-bottom: 1px solid #f0f0f0; color: #6B7280; font-size: 14px;">Vehicle</td><td style="padding: 10px 0; border-bottom: 1px solid #f0f0f0; color: #111827; font-size: 14px; font-weight: 600; text-align: right;">${data.vehicleName}</td></tr>
        <tr><td colspan="2"><div style="background: linear-gradient(135deg, #D1FAE5, #ECFDF5); border-radius: 8px; padding: 16px; margin: 16px 0; border: 1px solid #A7F3D0;"><p style="margin: 0 0 8px; color: #6B7280; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">Pick-up: ${data.pickupDate}${data.pickupTime ? ` at ${data.pickupTime}` : ''}</p><p style="margin: 0 0 8px; color: #6B7280; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">Return: ${data.returnDate}${data.returnTime ? ` at ${data.returnTime}` : ''}</p>${data.pickupTime || data.returnTime ? `<p style="margin: 8px 0 0; color: #059669; font-size: 18px; font-weight: 700;">${data.pickupTime || ''} → ${data.returnTime || ''}</p>` : ''}</div></td></tr>
        <tr><td style="padding: 10px 0; color: #6B7280; font-size: 14px;">Total Paid</td><td style="padding: 10px 0; color: #10B981; font-size: 16px; font-weight: 700; text-align: right;">$${data.totalPrice.toFixed(2)}</td></tr>
      </table>
      <div style="text-align: center; margin: 24px 0;">
        <a href="https://rentnextgearauto.com/admin/bookings" style="display: inline-block; background: #059669; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; font-size: 14px;">View in Admin Dashboard</a>
      </div>
    </div>
    <div style="background: #F9FAFB; padding: 16px; text-align: center; border-top: 1px solid #E5E7EB;">
      <p style="color: #9CA3AF; font-size: 12px; margin: 0;">NextGearAuto Admin Notification</p>
    </div>
  `);
}

export function cancellationTemplate(data: EmailData): string {
  return wrapEmail(`
    <div style="background: linear-gradient(135deg, #DC2626, #B91C1C); padding: 32px 24px; text-align: center;">
      <h1 style="color: #ffffff; margin: 0; font-size: 24px;">Booking Cancelled</h1>
    </div>
    <div style="padding: 32px 24px;">
      <p style="color: #374151; font-size: 16px;">Hi ${data.customerName},</p>
      <p style="color: #6B7280; font-size: 14px; line-height: 1.6;">Your booking <strong>${data.bookingId}</strong> for the ${data.vehicleName} has been cancelled.</p>
      <div style="background: #FEE2E2; border-radius: 8px; padding: 16px; margin: 16px 0; border-left: 4px solid #DC2626;"><p style="margin: 0 0 8px; color: #6B7280; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">Original Dates</p><p style="margin: 0; color: #111827; font-size: 16px; font-weight: 600;">${data.pickupDate} to ${data.returnDate}</p>${data.pickupTime || data.returnTime ? `<p style="margin: 4px 0 0; color: #DC2626; font-size: 18px; font-weight: 700;">${data.pickupTime || 'TBD'} → ${data.returnTime || 'TBD'}</p>` : ''}</div>
      <p style="color: #6B7280; font-size: 14px;">If you have questions about refunds or need further assistance, please contact us.</p>
      <div style="text-align: center; margin: 24px 0;">
        <a href="mailto:contact@rentnextgearauto.com" style="display: inline-block; background: #7C3AED; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; font-size: 14px;">Contact Us</a>
      </div>
    </div>
    <div style="background: #F9FAFB; padding: 16px; text-align: center; border-top: 1px solid #E5E7EB;">
      <p style="color: #9CA3AF; font-size: 12px; margin: 0;">NextGearAuto | (551) 429-3472</p>
    </div>
  `);
}

export function pickupReminderTemplate(data: EmailData): string {
  return wrapEmail(`
    <div style="background: linear-gradient(135deg, #7C3AED, #5B21B6); padding: 32px 24px; text-align: center;">
      <h1 style="color: #ffffff; margin: 0; font-size: 24px;">Your Pickup is Tomorrow!</h1>
      <p style="color: #DDD6FE; margin: 8px 0 0; font-size: 14px;">Get ready for your trip</p>
    </div>
    <div style="padding: 32px 24px;">
      <p style="color: #374151; font-size: 16px;">Hi ${data.customerName},</p>
      <p style="color: #6B7280; font-size: 14px; line-height: 1.6;">
        Just a reminder that your <strong>${data.vehicleName}</strong> is ready for pickup tomorrow.
      </p>
      <div style="background: linear-gradient(135deg, #EDE9FE, #F3E8FF); border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid #7C3AED;"><p style="margin: 0 0 8px; color: #6B7280; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">Pick-up Date & Time</p><p style="margin: 0; color: #111827; font-size: 16px; font-weight: 600;">${data.pickupDate}</p>${data.pickupTime ? `<p style="margin: 4px 0 0; color: #7C3AED; font-size: 20px; font-weight: 700;">${data.pickupTime}</p>` : ''}</div>
      <div style="background: #F3F0FF; border-radius: 8px; padding: 20px; margin: 20px 0;">
        <p style="margin: 0 0 8px; color: #5B21B6; font-weight: 600; font-size: 14px;">Please bring:</p>
        <ul style="margin: 0; padding-left: 20px; color: #6B7280; font-size: 14px; line-height: 1.8;">
          <li>Valid driver's license</li>
          <li>Credit card used for payment</li>
          <li>Booking ID: <strong style="color: #7C3AED;">${data.bookingId}</strong></li>
        </ul>
      </div>
      <p style="color: #6B7280; font-size: 14px;">
        <strong>Location:</strong> 92 Forrest Street, Jersey City, NJ 07304<br>
        <strong>Hours:</strong> Mon-Fri 8AM-6PM | Sat 9AM-5PM | Sun 10AM-4PM
      </p>
    </div>
    <div style="background: #F9FAFB; padding: 16px; text-align: center; border-top: 1px solid #E5E7EB;">
      <p style="color: #9CA3AF; font-size: 12px; margin: 0;">NextGearAuto | (551) 429-3472</p>
    </div>
  `);
}

export function returnReminderTemplate(data: EmailData): string {
  return wrapEmail(`
    <div style="background: linear-gradient(135deg, #F59E0B, #D97706); padding: 32px 24px; text-align: center;">
      <h1 style="color: #ffffff; margin: 0; font-size: 24px;">Return Reminder</h1>
      <p style="color: #FEF3C7; margin: 8px 0 0; font-size: 14px;">Your rental return is today</p>
    </div>
    <div style="padding: 32px 24px;">
      <p style="color: #374151; font-size: 16px;">Hi ${data.customerName},</p>
      <p style="color: #6B7280; font-size: 14px; line-height: 1.6;">
        This is a friendly reminder that your <strong>${data.vehicleName}</strong> (Booking ${data.bookingId}) is due for return today.
      </p>
      <div style="background: linear-gradient(135deg, #FEF3C7, #FEF08A); border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid #F59E0B;"><p style="margin: 0 0 8px; color: #6B7280; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">Return Date & Time</p><p style="margin: 0; color: #111827; font-size: 16px; font-weight: 600;">${data.returnDate}</p>${data.returnTime ? `<p style="margin: 4px 0 0; color: #F59E0B; font-size: 20px; font-weight: 700;">${data.returnTime}</p>` : ''}</div>
      <div style="background: #FFFBEB; border-radius: 8px; padding: 20px; margin: 20px 0; border: 1px solid #FDE68A;">
        <p style="margin: 0; color: #92400E; font-size: 14px;">Please return the vehicle with the same fuel level as pickup to avoid fuel charges.</p>
      </div>
      <p style="color: #6B7280; font-size: 14px;">
        <strong>Return Location:</strong> 92 Forrest Street, Jersey City, NJ 07304
      </p>
    </div>
    <div style="background: #F9FAFB; padding: 16px; text-align: center; border-top: 1px solid #E5E7EB;">
      <p style="color: #9CA3AF; font-size: 12px; margin: 0;">NextGearAuto | (551) 429-3472</p>
    </div>
  `);
}
