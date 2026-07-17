import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { calculatePricing } from "@/lib/utils/price-calculator";
import {
  confirmFreeBooking,
  redeemBookingPromo,
  validateAndApplyPromo,
  type PromoCodeRow,
} from "@/lib/promo-codes/promo-integrity";

const root = process.cwd();
const basePromo: PromoCodeRow = {
  code: "SAVE20",
  discount_type: "percentage",
  discount_value: 20,
  min_booking_amount: 0,
  max_uses: 10,
  used_count: 0,
  expires_at: null,
  description: "Save twenty percent",
  is_active: true,
};

test("checkout promo discount is derived from server promo values", () => {
  const pricing = calculatePricing(24, 100, []);
  const result = validateAndApplyPromo(pricing, basePromo);

  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.pricing.discount?.discountAmount, 22);
  assert.equal(result.pricing.discount?.code, "SAVE20");
});

test("checkout promo rechecks minimum booking amount", () => {
  const pricing = calculatePricing(4, 60, []);
  const result = validateAndApplyPromo(pricing, {
    ...basePromo,
    min_booking_amount: 100,
  });

  assert.deepEqual(result, {
    ok: false,
    message: "Minimum booking amount of $100 required",
  });
});

test("promo redemption delegates to the atomic booking RPC", async () => {
  let calledWith: unknown;
  const supabase = {
    rpc: async (name: "redeem_booking_promo", args: { p_booking_id: string }) => {
      calledWith = { name, args };
      return { error: null };
    },
  };

  await redeemBookingPromo(supabase, "bk123");
  assert.deepEqual(calledWith, {
    name: "redeem_booking_promo",
    args: { p_booking_id: "bk123" },
  });
});

test("free bookings confirm and redeem through one atomic RPC", async () => {
  let calledWith: unknown;
  const supabase = {
    rpc: async (name: "confirm_free_booking", args: { p_booking_id: string }) => {
      calledWith = { name, args };
      return { data: true, error: null };
    },
  };

  await confirmFreeBooking(supabase, "bk-free");
  assert.deepEqual(calledWith, {
    name: "confirm_free_booking",
    args: { p_booking_id: "bk-free" },
  });
});

test("checkout persists only server-derived promo accounting fields", () => {
  const checkout = fs.readFileSync(
    path.join(root, "src/app/api/checkout/route.ts"),
    "utf8",
  );

  assert.match(checkout, /promo_code: appliedPromoCode/);
  assert.match(checkout, /discount_amount: appliedDiscountAmount/);
  assert.doesNotMatch(checkout, /\.eq\("id", promo\.id\)/);
  assert.doesNotMatch(checkout, /discountAmount,\s*\n/);
});

test("redemption SQL increments by promo code and is idempotent per booking", () => {
  const migration = fs.readFileSync(
    path.join(root, "supabase-promo-redemption-integrity.sql"),
    "utf8",
  );

  assert.match(migration, /WHERE code = booking_promo_code/);
  assert.match(migration, /promo_redemption_counted = false/);
  assert.match(migration, /SET used_count = COALESCE\(used_count, 0\) \+ 1/);
  assert.match(migration, /SET promo_redemption_counted = true/);
  assert.match(migration, /PERFORM redeem_booking_promo\(p_booking_id\)/);
});
