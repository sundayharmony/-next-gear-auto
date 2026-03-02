import { NextResponse } from "next/server";
import vehicles from "@/data/vehicles.json";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category");

  let filtered = vehicles;
  if (category && category !== "all") {
    filtered = vehicles.filter((v) => v.category === category);
  }

  return NextResponse.json({ data: filtered, success: true });
}
