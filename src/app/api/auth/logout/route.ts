import { NextResponse } from "next/server";
import { clearAuthCookies } from "@/lib/auth/jwt";

export async function POST() {
  const response = NextResponse.json({ success: true, message: "Logged out." });
  return clearAuthCookies(response);
}
