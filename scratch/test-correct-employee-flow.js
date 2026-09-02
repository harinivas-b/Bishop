import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

const supabaseUrl = "https://crkxdpipyrwpgedesytm.supabase.co";
const supabaseAnonKey = "sb_publishable_6pMdCMERGpnbvA8JQVhqcw_BaBY7Aap";

async function testCorrectFlow() {
  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  console.log("1. Authenticating as existing shop owner or creating test session...");
  
  // Use unique timestamped email to avoid rate limits/collisions
  const uniqueId = Date.now().toString(36);
  const ownerEmail = `bakery_owner_${uniqueId}@gmail.com`;
  const ownerPass = "OwnerPass123!";

  console.log("Signing up owner:", ownerEmail);
  const { data: ownerAuth, error: ownerErr } = await supabase.auth.signUp({
    email: ownerEmail,
    password: ownerPass,
  });

  if (ownerErr) {
    console.error("Owner signup failed:", ownerErr);
    return;
  }

  const ownerId = ownerAuth.user?.id;
  console.log("Owner Auth User ID (in auth.users):", ownerId);

  if (!ownerId) {
    console.error("Owner ID is missing!");
    return;
  }

  // Sign in as owner
  await supabase.auth.signInWithPassword({
    email: ownerEmail,
    password: ownerPass,
  });

  const shopId = crypto.randomUUID();

  // Create Owner Profile & Shop
  const { error: pErr1 } = await supabase.from("profiles").upsert({
    id: ownerId, // EXACT auth.users.id
    email: ownerEmail,
    full_name: "Bakery Owner",
    role: "shopkeeper",
  });
  if (pErr1) console.error("Owner profile err:", pErr1);

  const { error: sErr } = await supabase.from("shops").insert({
    id: shopId,
    name: "Golden Crust Bakery",
    slug: `golden-crust-${uniqueId}`,
    owner_id: ownerId,
  });
  if (sErr) console.error("Shop insert err:", sErr);

  await supabase.from("profiles").update({ shop_id: shopId }).eq("id", ownerId);

  console.log("\n=== STEP-BY-STEP EMPLOYEE CREATION ===");
  const empEmail = `staff_${uniqueId}@gmail.com`;
  const empName = "Alice Baker";
  const empPassword = `Pass_${uniqueId}!`;

  // STEP 1: Create Supabase Auth user for employee
  console.log("Step 1: Creating Supabase Auth user for employee...");
  const rawSupabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
  });

  const { data: empAuthData, error: empAuthErr } = await rawSupabase.auth.signUp({
    email: empEmail,
    password: empPassword,
    options: {
      data: {
        full_name: empName,
      }
    }
  });

  if (empAuthErr) {
    console.error("Step 1 Auth SignUp Error:", empAuthErr);
    return;
  }

  const empAuthUserId = empAuthData.user?.id;
  console.log("Step 1 SUCCESS! Auth User created in auth.users with ID:", empAuthUserId);

  if (!empAuthUserId) {
    console.error("Step 1 FAILED: No Auth User ID returned!");
    return;
  }

  // STEP 2: Create profile row using THAT EXACT auth.users.id
  console.log("\nStep 2: Creating profiles row using EXACT auth.users.id:", empAuthUserId);
  const profilePayload = {
    id: empAuthUserId, // MUST MATCH auth.users.id EXACTLY
    email: empEmail,
    full_name: empName,
    role: "employee",
    shop_id: shopId,
  };

  const { error: profileErr } = await supabase.from("profiles").upsert(profilePayload);

  if (profileErr) {
    console.error("Step 2 FAILED - Profile Error:", profileErr);
    return;
  }
  console.log("Step 2 SUCCESS! Profiles row created with ID:", empAuthUserId);

  // STEP 3: Create employee record linking to shopId and empAuthUserId
  console.log("\nStep 3: Creating employee record linked to shop...");
  const { error: empErr } = await supabase.from("employees").insert({
    shop_id: shopId,
    profile_id: empAuthUserId, // MUST MATCH profiles.id & auth.users.id
    role: "chef",
    salary: 25000,
    is_active: true,
  });

  if (empErr) {
    console.error("Step 3 FAILED - Employee Insert Error:", empErr);
    return;
  }
  console.log("Step 3 SUCCESS! Employee record linked to shop.");

  // STEP 4: Fetch employee list joined with profile
  console.log("\nStep 4: Fetching employees list...");
  const { data: empList, error: listErr } = await supabase
    .from("employees")
    .select(`
      *,
      profile:profiles(*)
    `)
    .eq("shop_id", shopId);

  if (listErr) {
    console.error("Step 4 FAILED - Fetch Error:", listErr);
    return;
  }

  console.log("Step 4 SUCCESS! Employees list:", JSON.stringify(empList, null, 2));
}

testCorrectFlow();
