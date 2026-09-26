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
const supabaseKey = envVars["SUPABASE_SERVICE_ROLE_KEY"];

const supabase = createClient(supabaseUrl, supabaseKey);

async function testCustomerPersistence() {
  console.log("=== TESTING CUSTOMER PERSISTENCE ===");

  // Create a test customer user in auth
  const testEmail = `test_customer_${Date.now()}@example.com`;
  const { data: authUser, error: authErr } = await supabase.auth.admin.createUser({
    email: testEmail,
    password: "TestPassword123!",
    email_confirm: true,
  });

  if (authErr) {
    console.error("Auth creation error:", authErr);
    return;
  }

  const userId = authUser.user.id;
  console.log("Created test user:", userId, testEmail);

  // 1. Upsert into profiles table
  const profilePayload = {
    id: userId,
    email: testEmail,
    full_name: "Test Customer Name",
    phone: "+919876543210",
    role: "customer",
    updated_at: new Date().toISOString(),
  };

  const { error: profileErr } = await supabase.from("profiles").upsert(profilePayload);
  if (profileErr) {
    console.error("Profile upsert error:", profileErr);
  } else {
    console.log("Profile upserted successfully in profiles table.");
  }

  // 2. Update user_metadata in Supabase Auth
  const customerProfileObj = {
    name: "Test Customer Name",
    phone: "+919876543210",
    locationAddress: "Dharmapuri, Tamil Nadu",
    latitude: 12.1211,
    longitude: 78.1582,
    locationEnabled: true,
    updatedAt: new Date().toISOString(),
  };

  const { data: updatedAuthUser, error: metaErr } = await supabase.auth.admin.updateUserById(
    userId,
    {
      user_metadata: {
        role: "customer",
        full_name: "Test Customer Name",
        customer_profile: customerProfileObj,
      },
    }
  );

  if (metaErr) {
    console.error("Metadata update error:", metaErr);
  } else {
    console.log("Auth user_metadata updated successfully:", updatedAuthUser.user.user_metadata);
  }

  // 3. Verify fetching user profile & user_metadata back
  const { data: fetchedUser } = await supabase.auth.admin.getUserById(userId);
  console.log("\nFetched User Metadata:", fetchedUser.user.user_metadata.customer_profile);

  const { data: fetchedProfile } = await supabase.from("profiles").select("*").eq("id", userId).single();
  console.log("Fetched DB Profile:", fetchedProfile);

  // Cleanup test user
  await supabase.auth.admin.deleteUser(userId);
  console.log("Cleaned up test user.");
}

testCustomerPersistence();
