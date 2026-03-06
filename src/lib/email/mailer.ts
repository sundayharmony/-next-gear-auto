import nodemailer from "nodemailer";
import {
  bookingConfirmationTemplate,
  bookingPendingTemplate,
  adminNewBookingTemplate,
  cancellationTemplate,
  pickupReminderTemplate,
  returnReminderTemplate,
} from "./templates";

// Create reusable transporter
function getTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.hostinger.com",
    port: parseInt(process.env.SMTP_PORT || "465"),
    secure: true, // port 465 = SSL
    auth: {
      user: process.env.SMTP_USER || "contact@rentnextgearauto.com",
      pass: process.env.SMTP_PASS,
    },
  });
}

interface BookingEmailData {
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

export async function sendBookingConfirmation(data: BookingEmailData) {
  try {
    const transporter = getTransporter();
    await transporter.sendMail({
      from: `"NextGearAuto" <${process.env.SMTP_USER || "contact@rentnextgearauto.com"}>`,
      to: data.customerEmail,
      subject: `Booking Confirmed - ${data.bookingId}`,
      html: bookingConfirmationTemplate(data),
    });
    console.log("Confirmation email sent to:", data.customerEmail);
  } catch (error) {
    console.error("Failed to send confirmation email:", error);
    throw error;
  }
}

export async function sendBookingPendingEmail(data: BookingEmailData) {
  try {
    const transporter = getTransporter();
    await transporter.sendMail({
      from: `"NextGearAuto" <${process.env.SMTP_USER || "contact@rentnextgearauto.com"}>`,
      to: data.customerEmail,
      subject: `Booking Received - ${data.bookingId}`,
      html: bookingPendingTemplate(data),
    });
    console.log("Pending booking email sent to:", data.customerEmail);
  } catch (error) {
    console.error("Failed to send pending booking email:", error);
    throw error;
  }
}

export async function sendAdminNewBooking(data: BookingEmailData) {
  try {
    const transporter = getTransporter();
    await transporter.sendMail({
      from: `"NextGearAuto System" <${process.env.SMTP_USER || "contact@rentnextgearauto.com"}>`,
      to: process.env.ADMIN_EMAIL || "contact@rentnextgearauto.com",
      subject: `New Booking: ${data.bookingId} - ${data.vehicleName}`,
      html: adminNewBookingTemplate(data),
    });
    console.log("Admin notification sent for booking:", data.bookingId);
  } catch (error) {
    console.error("Failed to send admin notification:", error);
    throw error;
  }
}

export async function sendCancellationEmail(data: BookingEmailData) {
  try {
    const transporter = getTransporter();
    // Send to customer
    await transporter.sendMail({
      from: `"NextGearAuto" <${process.env.SMTP_USER || "contact@rentnextgearauto.com"}>`,
      to: data.customerEmail,
      subject: `Booking Cancelled - ${data.bookingId}`,
      html: cancellationTemplate(data),
    });
    // Send to admin
    await transporter.sendMail({
      from: `"NextGearAuto System" <${process.env.SMTP_USER || "contact@rentnextgearauto.com"}>`,
      to: process.env.ADMIN_EMAIL || "contact@rentnextgearauto.com",
      subject: `Booking Cancelled: ${data.bookingId}`,
      html: cancellationTemplate(data),
    });
    console.log("Cancellation emails sent for booking:", data.bookingId);
  } catch (error) {
    console.error("Failed to send cancellation email:", error);
    throw error;
  }
}

export async function sendPickupReminder(data: BookingEmailData) {
  try {
    const transporter = getTransporter();
    await transporter.sendMail({
      from: `"NextGearAuto" <${process.env.SMTP_USER || "contact@rentnextgearauto.com"}>`,
      to: data.customerEmail,
      subject: `Pickup Reminder - Your ${data.vehicleName} is Ready!`,
      html: pickupReminderTemplate(data),
    });
    console.log("Pickup reminder sent to:", data.customerEmail);
  } catch (error) {
    console.error("Failed to send pickup reminder:", error);
    throw error;
  }
}

export async function sendReturnReminder(data: BookingEmailData) {
  try {
    const transporter = getTransporter();
    await transporter.sendMail({
      from: `"NextGearAuto" <${process.env.SMTP_USER || "contact@rentnextgearauto.com"}>`,
      to: data.customerEmail,
      subject: `Return Reminder - ${data.vehicleName} due today`,
      html: returnReminderTemplate(data),
    });
    console.log("Return reminder sent to:", data.customerEmail);
  } catch (error) {
    console.error("Failed to send return reminder:", error);
    throw error;
  }
}
