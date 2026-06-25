import type { SupabaseClient } from "@supabase/supabase-js";
import { logger } from "@/lib/utils/logger";
import { escapeHtml, stripHtmlAngleBrackets } from "@/lib/utils/validation";

type ServiceSupabase = SupabaseClient;

export interface CheckoutCustomerDetails {
  name: string;
  email: string;
  phone: string;
  dob?: string;
}

export interface ResolvedCheckoutCustomer {
  customerId: string;
  name: string;
  email: string;
  phone: string;
  dob: string;
  matchedExisting: boolean;
  needsPassword: boolean;
}

export type ResolveCheckoutCustomerResult =
  | { ok: true; customer: ResolvedCheckoutCustomer }
  | { ok: false; status: number; message: string };

export interface CheckoutAuthContext {
  sub: string;
  email?: string;
  role?: string;
}

function sanitizeCheckoutName(raw: string): string {
  return escapeHtml(stripHtmlAngleBrackets(raw || "").trim()).slice(0, 100);
}

function normalizeEmail(email: string): string {
  return email.toLowerCase().trim();
}

/** Prefer saved profile fields; fall back to checkout form only when saved value is empty. */
export function mergeSavedCustomerProfile(
  saved: { name?: string | null; phone?: string | null; dob?: string | null },
  entered: CheckoutCustomerDetails
): { name: string; phone: string; dob: string } {
  const enteredName = sanitizeCheckoutName(entered.name);
  const savedName = sanitizeCheckoutName(saved.name || "");
  return {
    name: savedName || enteredName,
    phone: (saved.phone || entered.phone || "").slice(0, 20),
    dob: (saved.dob || entered.dob || "").slice(0, 20),
  };
}

async function loadCustomerById(
  supabase: ServiceSupabase,
  customerId: string
): Promise<ResolvedCheckoutCustomer | null> {
  const { data } = await supabase
    .from("customers")
    .select("id, name, email, phone, dob, password_hash")
    .eq("id", customerId)
    .maybeSingle();

  if (!data?.id || !data.email) return null;

  const profile = mergeSavedCustomerProfile(data, {
    name: data.name || "",
    email: data.email,
    phone: data.phone || "",
    dob: data.dob || "",
  });

  return {
    customerId: data.id,
    name: profile.name,
    email: normalizeEmail(data.email),
    phone: profile.phone,
    dob: profile.dob,
    matchedExisting: true,
    needsPassword: !data.password_hash,
  };
}

/**
 * Resolve the customer record for public checkout.
 * Guests with a matching email reuse the saved profile instead of form overrides.
 */
export async function resolveCheckoutCustomer(
  supabase: ServiceSupabase,
  details: CheckoutCustomerDetails,
  auth?: CheckoutAuthContext | null
): Promise<ResolveCheckoutCustomerResult> {
  const email = normalizeEmail(details.email);
  const enteredName = sanitizeCheckoutName(details.name);

  if (!enteredName) {
    return { ok: false, status: 400, message: "Customer name cannot be empty" };
  }

  if (auth?.sub && (auth.role === "customer" || auth.role === "owner")) {
    const signedIn = await loadCustomerById(supabase, auth.sub);
    if (signedIn) {
      return { ok: true, customer: signedIn };
    }
  }

  const { data: existing } = await supabase
    .from("customers")
    .select("id, name, email, phone, dob, password_hash")
    .eq("email", email)
    .maybeSingle();

  if (existing?.id) {
    const profile = mergeSavedCustomerProfile(existing, details);
    return {
      ok: true,
      customer: {
        customerId: existing.id,
        name: profile.name || enteredName,
        email: existing.email ? normalizeEmail(existing.email) : email,
        phone: profile.phone,
        dob: profile.dob,
        matchedExisting: true,
        needsPassword: !existing.password_hash,
      },
    };
  }

  const newId = "c_" + crypto.randomUUID();
  const insertPayload = {
    id: newId,
    name: enteredName,
    email,
    phone: (details.phone || "").slice(0, 20),
    dob: (details.dob || "").slice(0, 20),
    role: "customer",
  };

  const { data: newCustomer, error: insertError } = await supabase
    .from("customers")
    .insert(insertPayload)
    .select("id, name, email, phone, dob, password_hash")
    .maybeSingle();

  if (newCustomer?.id) {
    return {
      ok: true,
      customer: {
        customerId: newCustomer.id,
        name: sanitizeCheckoutName(newCustomer.name || enteredName) || enteredName,
        email: normalizeEmail(newCustomer.email || email),
        phone: (newCustomer.phone || "").slice(0, 20),
        dob: newCustomer.dob || "",
        matchedExisting: false,
        needsPassword: true,
      },
    };
  }

  if (insertError?.code === "23505") {
    const { data: raced } = await supabase
      .from("customers")
      .select("id, name, email, phone, dob, password_hash")
      .eq("email", email)
      .maybeSingle();

    if (raced?.id) {
      const profile = mergeSavedCustomerProfile(raced, details);
      return {
        ok: true,
        customer: {
          customerId: raced.id,
          name: profile.name || enteredName,
          email: normalizeEmail(raced.email || email),
          phone: profile.phone,
          dob: profile.dob,
          matchedExisting: true,
          needsPassword: !raced.password_hash,
        },
      };
    }
  }

  logger.error("Failed to resolve checkout customer", { email, insertError });
  return {
    ok: false,
    status: 500,
    message: "Failed to create or retrieve customer record",
  };
}
