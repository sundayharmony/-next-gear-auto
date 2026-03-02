import { NextResponse } from "next/server";
import bookings from "@/data/bookings.json";

export async function GET() {
  return NextResponse.json({ data: bookings, success: true });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const newBooking = {
      id: "bk" + Date.now(),
      ...body,
      status: "pending",
      deposit: 50,
      agreement: null,
      createdAt: new Date().toISOString(),
    };
    return NextResponse.json({ data: newBooking, success: true }, { status: 201 });
  } catch {
    return NextResponse.json({ success: false, message: "Invalid request" }, { status: 400 });
  }
}
