import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const filePath = path.join(process.cwd(), "src/data/promo-codes.json");

function readCodes() {
  try {
    const raw = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function writeCodes(codes: unknown[]) {
  fs.writeFileSync(filePath, JSON.stringify(codes, null, 2), "utf-8");
}

// GET: List all promo codes
export async function GET() {
  const codes = readCodes();
  return NextResponse.json({ success: true, data: codes });
}

// POST: Create a new promo code
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const codes = readCodes();

    // Check for duplicate code
    if (codes.some((c: { code: string }) => c.code.toUpperCase() === body.code?.toUpperCase())) {
      return NextResponse.json({ success: false, message: "Promo code already exists" }, { status: 409 });
    }

    const newCode = {
      code: body.code.toUpperCase(),
      discountType: body.discountType || "percentage",
      discountValue: body.discountValue || 10,
      minBookingAmount: body.minBookingAmount || 0,
      maxUses: body.maxUses || 100,
      usedCount: 0,
      expiresAt: body.expiresAt || null,
      description: body.description || "",
      isActive: true,
    };

    codes.push(newCode);
    writeCodes(codes);

    return NextResponse.json({ success: true, data: newCode }, { status: 201 });
  } catch {
    return NextResponse.json({ success: false, message: "Invalid request" }, { status: 400 });
  }
}

// PUT: Update a promo code
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const codes = readCodes();
    const index = codes.findIndex((c: { code: string }) => c.code === body.code);

    if (index === -1) {
      return NextResponse.json({ success: false, message: "Promo code not found" }, { status: 404 });
    }

    codes[index] = { ...codes[index], ...body };
    writeCodes(codes);

    return NextResponse.json({ success: true, data: codes[index] });
  } catch {
    return NextResponse.json({ success: false, message: "Invalid request" }, { status: 400 });
  }
}

// DELETE: Remove a promo code
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");

    if (!code) {
      return NextResponse.json({ success: false, message: "Code required" }, { status: 400 });
    }

    const codes = readCodes();
    const filtered = codes.filter((c: { code: string }) => c.code !== code);

    if (filtered.length === codes.length) {
      return NextResponse.json({ success: false, message: "Code not found" }, { status: 404 });
    }

    writeCodes(filtered);
    return NextResponse.json({ success: true, message: "Code deleted" });
  } catch {
    return NextResponse.json({ success: false, message: "Invalid request" }, { status: 400 });
  }
}
