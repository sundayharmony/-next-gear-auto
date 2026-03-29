import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/auth/admin-check";
import { parseTuroEmail } from "@/lib/utils/turo-email-parser";

/**
 * POST /api/admin/blocked-dates/parse-email
 * Parse a Turo booking confirmation email and return extracted dates.
 * Body: { emailText: string }
 *
 * Does NOT create blocked dates — just returns parsed data.
 * The admin confirms and then calls POST /api/admin/blocked-dates to create.
 */
export async function POST(req: NextRequest) {
  const auth = await verifyAdmin(req);
  if (!auth.authorized) return auth.response;

  try {
    const body = await req.json();
    const { emailText } = body;

    if (!emailText || typeof emailText !== "string" || emailText.trim().length < 10) {
      return NextResponse.json(
        { success: false, error: "Please paste the email content (at least 10 characters)" },
        { status: 400 }
      );
    }

    if (emailText.length > 50000) {
      return NextResponse.json(
        { success: false, error: "Email text too long (max 50,000 characters)" },
        { status: 400 }
      );
    }

    const result = parseTuroEmail(emailText);

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch {
    return NextResponse.json(
      { success: false, error: "Failed to parse email" },
      { status: 500 }
    );
  }
}
