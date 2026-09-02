import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://crkxdpipyrwpgedesytm.supabase.co";
const supabaseAnonKey = "sb_publishable_6pMdCMERGpnbvA8JQVhqcw_BaBY7Aap";

async function verifyWithExistingShop() {
  console.log("====================================================");
  console.log("E2E TEST USING EXISTING SHOP AND SHOPKEEPER SESSION");
  console.log("====================================================\n");

  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  // 1. Fetch active shop from database
  const { data: shops, error: sErr } = await supabase.from("shops").select("*").limit(1);

  if (sErr || !shops || shops.length === 0) {
    console.error("No shop found in database:", sErr);
    return;
  }

  const shop = shops[0];
  console.log("Using Shop:", { id: shop.id, name: shop.name || shop.shop_name, owner_id: shop.owner_id });

  // 2. Perform employee creation logic from EmployeesPage
  const timeId = Date.now().toString(36);
  const empEmail = `verification_staff_${timeId}@gmail.com`;
  const empName = "Verification Staff Member";
  const empPhone = "+919876543210";
  const empRole = "staff";
  const empSalary = 20000;

  console.log(`\nAdding Employee: ${empName} (${empEmail})...`);

  // Check if profile exists
  let targetProfileId = null;
  const { data: existingProfiles } = await supabase
    .from("profiles")
    .select("id, email, shop_id")
    .eq("email", empEmail);

  if (existingProfiles && existingProfiles.length > 0) {
    targetProfileId = existingProfiles[0].id;
  }

  // If no target profile ID, create user using rawSupabase
  if (!targetProfileId) {
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
        console.error("❌ Auth SignUp Error:", authError);
        return;
      }
    }
  }

  console.log(`✅ Obtained Valid Auth User ID: ${targetProfileId}`);

  // Upsert Profile row
  const profilePayload = {
    id: targetProfileId,
    email: empEmail,
    full_name: empName,
    role: "employee",
    shop_id: shop.id,
  };

  let { error: profileError } = await supabase.from("profiles").upsert({
    ...profilePayload,
    phone: empPhone,
  });

  if (profileError && (profileError.code === "PGRST204" || profileError.message?.includes("phone"))) {
    const { error: profileErrorNoPhone } = await supabase.from("profiles").upsert(profilePayload);
    if (profileErrorNoPhone) {
      console.error("❌ Profile creation failed:", profileErrorNoPhone);
      return;
    }
  } else if (profileError) {
    console.error("❌ Profile creation failed:", profileError);
    return;
  }

  console.log("✅ Profile created/updated successfully!");

  // Insert into employees table
  const { error: empError } = await supabase.from("employees").insert({
    shop_id: shop.id,
    profile_id: targetProfileId,
    role: empRole,
    salary: empSalary,
    is_active: true,
  });

  if (empError) {
    console.error("❌ Employee insertion failed:", empError);
    return;
  }

  console.log("✅ Employee record inserted!");

  // Fetch employees list for this shop
  const { data: empList, error: fetchErr } = await supabase
    .from("employees")
    .select(`
      *,
      profile:profiles(*)
    `)
    .eq("shop_id", shop.id);

  if (fetchErr) {
    console.error("❌ Fetch Employees list failed:", fetchErr);
    return;
  }

  console.log("\nEmployees in Shop:", empList?.length);
  const createdEmp = empList?.find((e) => e.profile_id === targetProfileId);

  if (!createdEmp) {
    console.error("❌ VERIFICATION FAILED: Created employee not found in shop list!");
    return;
  }

  console.log("\n====================================================");
  console.log("🎉 ALL E2E VERIFICATION CHECKS PASSED!");
  console.log("====================================================");
  console.log("Verified Record Details:");
  console.log("Employee Record ID:", createdEmp.id);
  console.log("Shop ID:", createdEmp.shop_id);
  console.log("Profile ID (Auth User ID):", createdEmp.profile_id);
  console.log("Name:", createdEmp.profile?.full_name);
  console.log("Email:", createdEmp.profile?.email);
  console.log("Role:", createdEmp.role);
  console.log("Salary:", createdEmp.salary);
  console.log("\n✅ Employee can be added successfully");
}

verifyWithExistingShop();
