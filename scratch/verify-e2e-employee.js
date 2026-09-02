import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://crkxdpipyrwpgedesytm.supabase.co";
const supabaseAnonKey = "sb_publishable_6pMdCMERGpnbvA8JQVhqcw_BaBY7Aap";

async function verifyE2EEmployeeFlow() {
  console.log("====================================================");
  console.log("STARTING END-TO-END EMPLOYEE CREATION VERIFICATION");
  console.log("====================================================\n");

  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  // 1. Create a fresh shopkeeper user
  const timeId = Date.now().toString(36);
  const ownerEmail = `test_owner_${timeId}@gmail.com`;
  const ownerPassword = "Password123!";

  console.log(`[TEST STEP 1] Creating fresh Shopkeeper account: ${ownerEmail}`);
  const { data: ownerAuth, error: ownerAuthErr } = await supabase.auth.signUp({
    email: ownerEmail,
    password: ownerPassword,
  });

  if (ownerAuthErr) {
    console.error("❌ Step 1 Failed - Shopkeeper Auth creation failed:", ownerAuthErr);
    return;
  }

  const ownerId = ownerAuth.user?.id;
  console.log(`✅ Step 1 Passed! Shopkeeper Auth User ID: ${ownerId}`);

  // Sign in as shopkeeper to set active auth session
  const { error: signInErr } = await supabase.auth.signInWithPassword({
    email: ownerEmail,
    password: ownerPassword,
  });

  if (signInErr) {
    console.error("❌ Step 1 Failed - Shopkeeper sign in failed:", signInErr);
    return;
  }

  // 2. Create Owner Profile & Shop
  console.log("\n[TEST STEP 2] Setting up Shop & Owner Profile in Supabase...");
  const shopId = `00000000-0000-4000-8000-${timeId.padStart(12, "0").slice(-12)}`;

  const { error: ownerProfErr } = await supabase.from("profiles").upsert({
    id: ownerId,
    email: ownerEmail,
    full_name: "Verification Shop Owner",
    role: "shopkeeper",
  });

  if (ownerProfErr) {
    console.error("❌ Step 2 Failed - Owner profile insert failed:", ownerProfErr);
    return;
  }

  const { error: shopErr } = await supabase.from("shops").insert({
    id: shopId,
    name: "Verification Test Shop",
    slug: `test-shop-${timeId}`,
    owner_id: ownerId,
  });

  if (shopErr) {
    console.error("❌ Step 2 Failed - Shop insert failed:", shopErr);
    return;
  }

  await supabase.from("profiles").update({ shop_id: shopId }).eq("id", ownerId);
  console.log(`✅ Step 2 Passed! Shop created with ID: ${shopId}`);

  // 3. Now simulate exact frontend handleAddEmployee logic from EmployeesPage
  console.log("\n[TEST STEP 3] Executing handleAddEmployee flow as Shopkeeper...");
  const empEmail = `test_emp_${timeId}@gmail.com`;
  const empName = "Sarah Jenkins";
  const empPhone = "+919876500112";
  const empRole = "manager";
  const empSalary = 35000;

  // STEP 3A: Check existing profiles
  let targetProfileId = null;
  const { data: existingProfiles } = await supabase
    .from("profiles")
    .select("id, email, shop_id")
    .eq("email", empEmail);

  if (existingProfiles && existingProfiles.length > 0) {
    targetProfileId = existingProfiles[0].id;
  }

  // STEP 3B: Create Supabase Auth user for employee using raw client
  if (!targetProfileId) {
    console.log(`Creating Employee Auth user: ${empEmail}...`);
    const rawSupabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
    });

    const tempPassword = `Bishop_${Date.now().toString(36)}!`;

    const { data: authData, error: authError } = await rawSupabase.auth.signUp({
      email: empEmail,
      password: tempPassword,
      options: {
        data: {
          full_name: empName,
          phone: empPhone,
        },
      },
    });

    if (authData?.user?.id) {
      targetProfileId = authData.user.id;
    } else if (authError) {
      const { data: foundProf } = await supabase
        .from("profiles")
        .select("id")
        .eq("email", empEmail)
        .maybeSingle();

      if (foundProf?.id) {
        targetProfileId = foundProf.id;
      } else {
        console.error("❌ Step 3 Failed - Auth SignUp Error:", authError);
        return;
      }
    }
  }

  console.log(`✅ Auth User Created/Obtained ID: ${targetProfileId}`);

  // STEP 3C: Upsert Profile row
  console.log("Upserting profiles row...");
  const profilePayload = {
    id: targetProfileId,
    email: empEmail,
    full_name: empName,
    role: "employee",
    shop_id: shopId,
  };

  let { error: profileError } = await supabase.from("profiles").upsert({
    ...profilePayload,
    phone: empPhone,
  });

  if (profileError && (profileError.code === "PGRST204" || profileError.message?.includes("phone"))) {
    console.log("Fallback profiles upsert without phone column...");
    const { error: profileErrorNoPhone } = await supabase.from("profiles").upsert(profilePayload);
    if (profileErrorNoPhone) {
      console.error("❌ Step 3 Failed - Profile upsert failed:", profileErrorNoPhone);
      return;
    }
  } else if (profileError) {
    console.error("❌ Step 3 Failed - Profile upsert failed:", profileError);
    return;
  }

  console.log("✅ Profile created successfully!");

  // STEP 3D: Insert into employees table
  console.log("Inserting into employees table...");
  const { error: empError } = await supabase.from("employees").insert({
    shop_id: shopId,
    profile_id: targetProfileId,
    role: empRole,
    salary: empSalary,
    is_active: true,
  });

  if (empError) {
    console.error("❌ Step 3 Failed - Employee insertion failed:", empError);
    return;
  }

  console.log("✅ Employee record inserted!");

  // 4. Verify retrieval of Employee list (Dashboard view query)
  console.log("\n[TEST STEP 4] Querying Employees list for Dashboard view...");
  const { data: empList, error: fetchErr } = await supabase
    .from("employees")
    .select(`
      *,
      profile:profiles(*)
    `)
    .eq("shop_id", shopId);

  if (fetchErr) {
    console.error("❌ Step 4 Failed - Fetch Employees query failed:", fetchErr);
    return;
  }

  console.log("Fetched Employee Count:", empList?.length);
  console.log("Fetched Employee Record:", JSON.stringify(empList, null, 2));

  // VERIFICATION CHECKS
  const createdEmp = empList?.find((e) => e.profile_id === targetProfileId);

  if (!createdEmp) {
    console.error("❌ VERIFICATION FAILED: Created employee not found in shop list!");
    return;
  }

  if (createdEmp.shop_id !== shopId) {
    console.error("❌ VERIFICATION FAILED: Employee shop_id mismatch!");
    return;
  }

  if (createdEmp.profile?.full_name !== empName || createdEmp.profile?.email !== empEmail) {
    console.error("❌ VERIFICATION FAILED: Profile name/email mismatch!");
    return;
  }

  console.log("\n====================================================");
  console.log("🎉 ALL E2E VERIFICATION CHECKS PASSED!");
  console.log("====================================================");
  console.log("✅ Employee can be added successfully");
}

verifyE2EEmployeeFlow();
