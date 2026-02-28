import { NextResponse } from "next/server";
import customers from "@/data/customers.json";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, action } = body;

    if (action === "login") {
      const customer = customers.find((c) => c.email === email);
      if (customer) {
        return NextResponse.json({ data: customer, success: true });
      }
      return NextResponse.json({ success: false, message: "Invalid credentials" }, { status: 401 });
    }

    if (action === "signup") {
      const newCustomer = {
        id: "c" + Date.now(),
        name: body.name,
        email: body.email,
        phone: body.phone,
        dob: "",
        driverLicense: null,
        paymentMethods: [],
        bookings: [],
        createdAt: new Date().toISOString(),
        role: "customer",
      };
      return NextResponse.json({ data: newCustomer, success: true }, { status: 201 });
    }

    return NextResponse.json({ success: false, message: "Invalid action" }, { status: 400 });
  } catch {
    return NextResponse.json({ success: false, message: "Invalid request" }, { status: 400 });
  }
}
