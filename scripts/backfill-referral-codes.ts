import { getServiceSupabase } from "@/lib/db/supabase";
import { ensureReferralCodeForCustomer } from "@/lib/referrals/referral-codes";

async function main() {
  const supabase = getServiceSupabase();
  const { data: customers, error } = await supabase
    .from("customers")
    .select("id, email, name")
    .not("password_hash", "is", null)
    .eq("role", "customer");

  if (error) {
    console.error("Failed to load customers:", error.message);
    process.exit(1);
  }

  let created = 0;
  let existing = 0;
  let failed = 0;

  for (const customer of customers ?? []) {
    const before = await supabase
      .from("promo_codes")
      .select("code")
      .eq("owner_customer_id", customer.id)
      .eq("promo_type", "referral")
      .maybeSingle();

    const code = await ensureReferralCodeForCustomer(supabase, customer.id);
    if (!code) {
      failed += 1;
      console.error(`Failed for ${customer.email ?? customer.id}`);
      continue;
    }

    if (before.data?.code) {
      existing += 1;
      console.log(`Exists: ${customer.email ?? customer.id} -> ${before.data.code}`);
    } else {
      created += 1;
      console.log(`Created: ${customer.email ?? customer.id} -> ${code}`);
    }
  }

  console.log(
    JSON.stringify(
      {
        total: customers?.length ?? 0,
        created,
        existing,
        failed,
      },
      null,
      2,
    ),
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
