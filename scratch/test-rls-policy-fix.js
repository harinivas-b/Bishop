import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

const supabaseUrl = "https://crkxdpipyrwpgedesytm.supabase.co";
const supabaseAnonKey = "sb_publishable_6pMdCMERGpnbvA8JQVhqcw_BaBY7Aap";

async function testRlsPolicyFix() {
  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  const timeId = Date.now().toString(36);
  const ownerEmail = `owner_rls_${timeId}@gmail.com`;
  const ownerPass = "OwnerPass123!";

  console.log("1. Signing up fresh owner:", ownerEmail);
  const { data: ownerAuth, error: ownerErr } = await supabase.auth.signUp({
    email: ownerEmail,
    password: ownerPass,
  });

  if (ownerErr) {
    console.error("Owner signup error:", ownerErr);
    return;
  }

  const ownerId = ownerAuth.user?.id;
  console.log("Owner User ID:", ownerId);

  // Sign in as owner
  await supabase.auth.signInWithPassword({
    email: ownerEmail,
    password: ownerPass,
  });

  const shopId = crypto.randomUUID();

  // Create owner profile & shop
  await supabase.from("profiles").upsert({
    id: ownerId,
    email: ownerEmail,
    full_name: "Owner Test",
    role: "shopkeeper",
  });

  await supabase.from("shops").insert({
    id: shopId,
    name: "RLS Test Bakery",
    slug: `rls-bakery-${timeId}`,
    owner_id: ownerId,
  });

  await supabase.from("profiles").update({ shop_id: shopId }).eq("id", ownerId);

  console.log("Owner and shop created. Testing Employee Creation as authenticated owner...");

  // Create raw client for employee signup
  const rawSupabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  const empEmail = `emp_rls_${timeId}@gmail.com`;
  const { data: empAuth, error: empAuthErr } = await rawSupabase.auth.signUp({
    email: empEmail,
    password: "EmpPassword123!",
  });

  if (empAuthErr) {
    console.error("Emp auth signup error:", empAuthErr);
    return;
  }

  const empId = empAuth.user?.id;
  console.log("Emp Auth User ID:", empId);

  // Try inserting profile AS THE AUTHENTICATED OWNER
  console.log("Upserting profile with shop_id =", shopId, "as authenticated owner...");
  const { data: pData, error: pErr } = await supabase.from("profiles").upsert({
    id: empId,
    email: empEmail,
    full_name: "RLS Staff",
    role: "employee",
    shop_id: shopId,
  });

  console.log("Profile Upsert Result:", { pData, pErr });

  // Try inserting employee AS THE AUTHENTICATED OWNER
  console.log("Inserting employee record with shop_id =", shopId, "as authenticated owner...");
  const { data: eData, error: eErr } = await supabase.from("employees").insert({
    shop_id: shopId,
    profile_id: empId,
    role: "staff",
    salary: 15000,
    is_active: true,
  });

  console.log("Employee Insert Result:", { eData, eErr });

  // Query employees list
  const { data: list, error: lErr } = await supabase
    .from("employees")
    .select("*, profile:profiles(*)")
    .eq("shop_id", shopId);

  console.log("Employees List Query Result:", { count: list?.length, list, lErr });
}

testRlsPolicyFix();
