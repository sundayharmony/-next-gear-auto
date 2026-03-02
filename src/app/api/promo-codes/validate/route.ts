import { NextRequest, NextResponse } from "next/server";
import promoCodes from "@/data/promo-codes.json";

export async function POST(req: NextRequest) {
  try {
    const { code, bookingAmount } = await req.json();

    if (!code) {
      return NextResponse.json(
        { success: false, error: "Promo code is required" },
        { status: 400 }
      );
    }

    const promo = promoCodes.find(
      (p) => p.code.toUpperCase() === code.toUpperCase()
    );

    if (!promo) {
      return NextResponse.json(
        { success: false, error: "Invalid promo code" },
        { status: 404 }
      );
    }

    // Check expiry
    if (new Date(promo.expiryDate) < new Date()) {
      return NextResponse.json(
        { success: false, error: "This promo code has expired" },
        { status: 400 }
      );
    }

    // Check usage limit
    if (promo.usedCount >= promo.maxUses) {
      return NextResponse.json(
        { success: false, error: "This promo code has reached its usage limit" },
        { status: 400 }
      );
    }

    // Check minimum booking amount
    if (bookingAmount && bookingAmount < promo.minBookingAmount) {
      return NextResponse.json(
        {
          success: false,
          error: `Minimum booking amount of $${promo.minBookingAmount} required for this code`,
        },
        { status: 400 }
      );
    }

    // Calculate discount
    let discountAmount = 0;
    if (promo.discountType === "percentage") {
      discountAmount = bookingAmount
        ? Math.round(bookingAmount * (promo.discountValue / 100) * 100) / 100
        : 0;
    } else {
      discountAmount = promo.discountValue;
    }

    return NextResponse.json({
      success: true,
      data: {
        code: promo.code,
        discountType: promo.discountType,
        discountValue: promo.discountValue,
        discountAmount,
        description: promo.description,
      },
    });
  } catch (err) {
    console.error("Promo validation error:", err);
    return NextResponse.json(
      { success: false, error: "Failed to validate promo code" },
      { status: 500 }
    );
  }
}
