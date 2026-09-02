import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

const supabaseUrl = "https://crkxdpipyrwpgedesytm.supabase.co";
const supabaseAnonKey = "sb_publishable_6pMdCMERGpnbvA8JQVhqcw_BaBY7Aap";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testFullEmployeeFlow() {
  const shopkeeperEmail = `owner_${Date.now()}@gmail.com`;
  const password = "Password123!";

  console.log("1. Signing up shopkeeper:", shopkeeperEmail);
  const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
    email: shopkeeperEmail,
    password: password,
  });

  if (signUpErr) {
    console.error("Shopkeeper signup failed:", signUpErr);
    return;
  }

  const user = signUpData.user;
  console.log("Shopkeeper created ID:", user?.id);

  // Sign in to establish active session
  const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({
    email: shopkeeperEmail,
    password: password,
  });

  if (signInErr) {
    console.error("Shopkeeper signin failed:", signInErr);
    return;
  }

  const shopId = crypto.randomUUID();

  // Insert profile for owner
  console.log("2. Inserting profile for owner...");
  const { error: profErr } = await supabase.from("profiles").upsert({
    id: user.id,
    email: shopkeeperEmail,
    full_name: "Test Owner",
    role: "shopkeeper",
  });

  if (profErr) {
    console.error("Owner profile insert error:", profErr);
    return;
  }

  // Insert shop
  console.log("3. Inserting shop...");
  const { error: shopErr } = await supabase.from("shops").insert({
    id: shopId,
    name: "Test Bakery",
    slug: `test-bakery-${Date.now()}`,
    owner_id: user.id,
  });

  if (shopErr) {
    console.error("Shop insert error:", shopErr);
    return;
  }

  // Update profile with shop_id
  await supabase.from("profiles").update({ shop_id: shopId }).eq("id", user.id);

  console.log("=== SHOPKEEPER SETUP COMPLETE ===");
  console.log("Shop ID:", shopId);

  // NOW TEST ADDING AN EMPLOYEE (Exact code from EmployeesPage.tsx)
  console.log("\n=== TESTING ADD EMPLOYEE FROM DASHBOARD ===");

  const empEmail = `employee_${Date.now()}@gmail.com`;
  const empName = "John Staff";
  const empPhone = "+919876543210";
  const empRole = "staff";

  // Step 1: Create auth user for employee
  const rawSupabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
  });

  const tempPassword = `Bishop_${Date.now().toString(36)}`;

  console.log("Step 1: Signing up employee with rawSupabase...");
  const { data: empAuthData, error: empAuthError } = await rawSupabase.auth.signUp({
    email: empEmail,
    password: tempPassword,
    options: {
      data: {
        full_name: empName,
        phone: empPhone,
      }
    }
  });

  if (empAuthError) {
    console.error("STEP 1 FAILED - Auth SignUp Error:", empAuthError);
    return;
  }

  console.log("Step 1 Success! Employee Auth ID:", empAuthData.user?.id);

  if (!empAuthData.user) {
    console.error("STEP 1 FAILED - No user object returned!");
    return;
  }

  // Step 2: Create profile for employee
  console.log("Step 2: Creating profile for employee using shopkeeper's authenticated client...");
  const { data: profRes, error: profileError } = await supabase.from("profiles").upsert({
    id: empAuthData.user.id,
    email: empEmail,
    full_name: empName,
    role: "employee",
    phone: empPhone,
    shop_id: shopId,
  });

  if (profileError) {
    console.error("STEP 2 FAILED - Profile Error:", profileError);
    return;
  }
  console.log("Step 2 Success! Profile created.");

  // Step 3: Insert employee record
  console.log("Step 3: Inserting employee record into employees table...");
  const { data: empRes, error: empError } = await supabase.from("employees").insert({
    shop_id: shopId,
    profile_id: empAuthData.user.id,
    role: empRole,
    salary: 15000,
  });

  if (empError) {
    console.error("STEP 3 FAILED - Employee Insert Error:", empError);
    return;
  }
  console.log("Step 3 Success! Employee record inserted.");

  // Step 4: Fetch employees list with profile join
  console.log("Step 4: Fetching employees list with profile join...");
  const { data: fetchList, error: fetchErr } = await supabase
    .from("employees")
    .select(`
      *,
      profile:profiles(*)
    `)
    .eq("shop_id", shopId);

  if (fetchErr) {
    console.error("STEP 4 FAILED - Fetch Error:", fetchErr);
    return;
  }

  console.log("Step 4 Success! Employees list fetched:", JSON.stringify(fetchList, null, 2));
}

testFullEmployeeFlow();
