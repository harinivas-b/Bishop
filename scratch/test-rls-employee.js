import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

const supabaseUrl = "https://crkxdpipyrwpgedesytm.supabase.co";
const supabaseAnonKey = "sb_publishable_6pMdCMERGpnbvA8JQVhqcw_BaBY7Aap";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testRls() {
  const shopkeeperEmail = `owner_${Date.now()}@gmail.com`;
  const password = "Password123!";

  console.log("1. Signing up shopkeeper:", shopkeeperEmail);
  const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
    email: shopkeeperEmail,
    password: password,
  });

  if (signUpErr) {
    console.error("Signup error:", signUpErr);
    return;
  }

  const user = signUpData.user;
  if (!user) {
    console.error("No user created");
    return;
  }

  // Sign in
  const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({
    email: shopkeeperEmail,
    password: password,
  });

  if (signInErr) {
    console.error("Signin error:", signInErr);
    return;
  }

  const shopId = crypto.randomUUID();

  // Create owner profile & shop
  await supabase.from("profiles").upsert({
    id: user.id,
    email: shopkeeperEmail,
    full_name: "Owner User",
    role: "shopkeeper",
  });

  await supabase.from("shops").insert({
    id: shopId,
    name: "Test Shop",
    slug: `test-shop-${Date.now()}`,
    owner_id: user.id,
  });

  await supabase.from("profiles").update({ shop_id: shopId }).eq("id", user.id);

  console.log("Shopkeeper & Shop created. Testing Employee Insertion...");

  // Create employee auth user
  const rawSupabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
  });

  const empEmail = `emp_${Date.now()}@gmail.com`;
  const { data: empAuth, error: empAuthErr } = await rawSupabase.auth.signUp({
    email: empEmail,
    password: "Password123!",
  });

  if (empAuthErr) {
    console.error("Employee signUp error:", empAuthErr);
    return;
  }

  const empUser = empAuth.user;
  console.log("Employee Auth ID:", empUser?.id);

  // 2. Insert Profile for Employee as Shopkeeper
  console.log("Inserting Profile for Employee...");
  const { data: pData, error: pErr } = await supabase.from("profiles").upsert({
    id: empUser.id,
    email: empEmail,
    full_name: "Staff Member",
    role: "employee",
    phone: "+919876543210",
    shop_id: shopId,
  });

  console.log("Profile insert result:", { pData, pErr });

  // 3. Insert Employee record
  console.log("Inserting Employees record...");
  const { data: eData, error: eErr } = await supabase.from("employees").insert({
    shop_id: shopId,
    profile_id: empUser.id,
    role: "staff",
    salary: 12000,
  });

  console.log("Employee insert result:", { eData, eErr });

  // 4. Fetch Employees list with profile join
  console.log("Fetching Employees list...");
  const { data: empList, error: listErr } = await supabase
    .from("employees")
    .select(`
      *,
      profile:profiles(*)
    `)
    .eq("shop_id", shopId);

  console.log("Employees list result:", { empList, listErr });
}

testRls();
