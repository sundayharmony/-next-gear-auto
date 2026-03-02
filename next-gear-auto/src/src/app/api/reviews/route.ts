import { NextResponse } from "next/server";
import reviews from "@/data/reviews.json";

export async function GET() {
  return NextResponse.json({ data: reviews, success: true });
}
