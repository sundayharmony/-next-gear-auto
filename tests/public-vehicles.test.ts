import test from "node:test";
import assert from "node:assert/strict";
import { mapPublicVehicleRow } from "@/lib/vehicles/public-vehicle-fields";

test("public vehicle JSON omits VIN and license plate", () => {
  const row = mapPublicVehicleRow({
    id: "v1",
    year: 2024,
    make: "Toyota",
    model: "Camry",
    category: "sedan",
    daily_rate: 89,
    images: [],
    is_available: true,
    features: [],
    specs: {},
    mileage: 12000,
    license_plate: "ABC-1234",
    vin: "1HGBH41JXMN109186",
    maintenance_status: "good",
    color: "black",
    description: "Test",
  });

  assert.equal(row.make, "Toyota");
  assert.equal(row.dailyRate, 89);
  assert.ok(!("vin" in row));
  assert.ok(!("licensePlate" in row));
});

test("GET /api/vehicles route source redacts sensitive fields", async () => {
  const fs = await import("node:fs");
  const path = await import("node:path");
  const source = fs.readFileSync(
    path.join(process.cwd(), "src/app/api/vehicles/route.ts"),
    "utf8"
  );
  assert.ok(source.includes("mapPublicVehicleRow"));
  assert.ok(source.includes("PUBLIC_VEHICLE_SELECT"));
  assert.ok(!source.includes("licensePlate:"));
  assert.ok(!source.includes("vin:"));
});
