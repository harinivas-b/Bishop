const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");

const envPath = path.join(__dirname, "../.env.local");
const envContent = fs.readFileSync(envPath, "utf8");
const envVars = {};
envContent.split("\n").forEach((line) => {
  const parts = line.split("=");
  if (parts.length >= 2 && !line.startsWith("#")) {
    const key = parts[0].trim();
    const val = parts.slice(1).join("=").trim();
    envVars[key] = val;
  }
});

const supabaseUrl = envVars["NEXT_PUBLIC_SUPABASE_URL"];
const serviceKey = envVars["SUPABASE_SERVICE_ROLE_KEY"];
const anonKey = envVars["NEXT_PUBLIC_SUPABASE_ANON_KEY"];

const adminClient = createClient(supabaseUrl, serviceKey);

async function testCustomerE2E() {
  console.log("=== BISHOP CUSTOMER PERSISTENCE E2E TEST ===");

  const testEmail = `cust_e2e_${Date.now()}@example.com`;
  const testPassword = "CustomerPassword123!";

  // 1. Create Customer Auth User
  const { data: created, error: createErr } = await adminClient.auth.admin.createUser({
    email: testEmail,
    password: testPassword,
    email_confirm: true,
  });

  if (createErr) {
    console.error("Failed to create customer user:", createErr);
    return;
  }

  const userId = created.user.id;
  console.log("Step 1: Created Customer User:", userId, testEmail);

  // 2. Sign in as Customer
  const client = createClient(supabaseUrl, anonKey);
  const { data: loginData, error: loginErr } = await client.auth.signInWithPassword({
    email: testEmail,
    password: testPassword,
  });

  if (loginErr) {
    console.error("Sign in failed:", loginErr);
    return;
  }
  console.log("Step 2: Logged in customer successfully.");

  // 3. Save Customer Profile (mimicking handleSave in setup page)
  const profileObj = {
    name: "John Customer",
    phone: "+91 99999 88888",
    locationAddress: "Dharmapuri Main Road, TN",
    latitude: 12.1211,
    longitude: 78.1582,
    locationEnabled: true,
    updatedAt: new Date().toISOString(),
  };

  // Update user_metadata and profiles table
  await client.auth.updateUser({
    data: {
      role: "customer",
      full_name: profileObj.name,
      customer_profile: profileObj,
    },
  });

  await client.from("profiles").upsert({
    id: userId,
    email: testEmail,
    full_name: profileObj.name,
    phone: profileObj.phone,
    role: "customer",
    updated_at: new Date().toISOString(),
  });

  console.log("Step 3: Customer profile saved and linked to User ID:", userId);

  // 4. Sign out
  await client.auth.signOut();
  console.log("Step 4: Customer logged out.");

  // 5. Sign in again with same email
  const client2 = createClient(supabaseUrl, anonKey);
  const { data: reLoginData } = await client2.auth.signInWithPassword({
    email: testEmail,
    password: testPassword,
  });

  console.log("Step 5: Customer re-logged in with same email.");

  // 6. Restore profile from session
  const userObj = reLoginData.user;
  const restoredProfile = userObj?.user_metadata?.customer_profile;

  console.log("Step 6: Restored Customer Profile from Supabase Auth Session:", restoredProfile);

  if (
    restoredProfile &&
    restoredProfile.name === "John Customer" &&
    restoredProfile.locationAddress === "Dharmapuri Main Road, TN"
  ) {
    console.log("\n✅ E2E TEST PASSED: Customer profile automatically restored upon re-login!");
  } else {
    console.error("\n❌ E2E TEST FAILED: Profile was not properly restored.");
  }

  // Cleanup
  await adminClient.auth.admin.deleteUser(userId);
  console.log("Cleaned up test user.");
}

testCustomerE2E();
