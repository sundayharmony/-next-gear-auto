import { sendAccountPasswordResetEmail, sendPasswordResetLink } from "@/lib/email/mailer";

export interface CustomerPasswordEmailTarget {
  name: string;
  email: string;
  password_hash?: string | null;
}

/** Send set-password or reset-password email based on whether the account has a password. */
export async function sendCustomerPasswordEmail(
  customer: CustomerPasswordEmailTarget
): Promise<{ emailType: "reset" | "set" }> {
  const customerEmail = customer.email.trim().toLowerCase();
  const emailPayload = { customerName: customer.name, customerEmail };
  const hasPassword = Boolean(customer.password_hash);

  if (hasPassword) {
    await sendAccountPasswordResetEmail(emailPayload);
  } else {
    await sendPasswordResetLink(emailPayload);
  }

  return { emailType: hasPassword ? "reset" : "set" };
}
