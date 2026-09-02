import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

const supabaseUrl = "https://crkxdpipyrwpgedesytm.supabase.co";
const supabaseAnonKey = "sb_publishable_6pMdCMERGpnbvA8JQVhqcw_BaBY7Aap";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testAsShopkeeper() {
  const shopkeeperEmail = `owner_${Date.now()}@gmail.com`;
  const password = "Password123!";

  console.log("1. Signing up shopkeeper...");
  const { data: signUpData } = await supabase.auth.signUp({
    email: shopkeeperEmail,
    password: password,
  });

  const user = signUpData?.user;
  if (!user) {
    console.log("Signup failed or rate limited");
    return;
  }

  await supabase.auth.signInWithPassword({ email: shopkeeperEmail, password });

  const shopId = crypto.randomUUID();

  // Create owner profile & shop
  await supabase.from("profiles").upsert({
    id: user.id,
    email: shopkeeperEmail,
    full_name: "Shopkeeper",
    role: "shopkeeper",
  });

  await supabase.from("shops").insert({
    id: shopId,
    name: "Ak Bakery",
    slug: `ak-bakery-${Date.now()}`,
    owner_id: user.id,
  });

  await supabase.from("profiles").update({ shop_id: shopId }).eq("id", user.id);

  console.log("Shopkeeper ready. Testing Employee creation without phone column...");

  const empUserId = crypto.randomUUID();
  const empEmail = `emp_${Date.now()}@gmail.com`;

  // Insert profile WITHOUT phone column
  const { data: pData, error: pErr } = await supabase.from("profiles").upsert({
    id: empUserId,
    email: empEmail,
    full_name: "Jane Doe Staff",
    role: "employee",
    shop_id: shopId,
  });

  console.log("Profile insert result:", { pData, pErr });

  // Insert employee record
  const { data: eData, error: eErr } = await supabase.from("employees").insert({
    shop_id: shopId,
    profile_id: empUserId,
    role: "staff",
    salary: 20000,
  });

  console.log("Employee insert result:", { eData, eErr });

  // Fetch employees list
  const { data: list, error: lErr } = await supabase
    .from("employees")
    .select("*, profile:profiles(*)")
    .eq("shop_id", shopId);

  console.log("Fetched Employees list:", { list, lErr });
}

testAsShopkeeper();
