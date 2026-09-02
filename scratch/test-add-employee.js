import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://crkxdpipyrwpgedesytm.supabase.co";
const supabaseAnonKey = "sb_publishable_6pMdCMERGpnbvA8JQVhqcw_BaBY7Aap";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function runTest() {
  console.log("1. Signing in as shopkeeper...");
  const { data: signData, error: signErr } = await supabase.auth.signInWithPassword({
    email: "akshaya.j2025ece@sece.ac.in",
    password: "password123", // or test password
  });

  if (signErr) {
    console.error("Sign in failed:", signErr);
    return;
  }
  console.log("Signed in user ID:", signData.user?.id);

  // Get shop
  const { data: shop } = await supabase.from("shops").select("*").limit(1).single();
  console.log("Shop ID:", shop?.id);

  // Try creating employee user with raw client
  const rawSupabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
  });

  const testEmail = `emp_${Date.now()}@test.com`;
  const tempPassword = `Bishop_${Date.now().toString(36)}`;

  console.log("2. Calling rawSupabase.auth.signUp with email:", testEmail);
  const { data: authData, error: authError } = await rawSupabase.auth.signUp({
    email: testEmail,
    password: tempPassword,
    options: {
      data: {
        full_name: "Test Employee",
        phone: "+919876543210",
      }
    }
  });

  if (authError) {
    console.error("Auth signUp error:", authError);
    return;
  }

  console.log("Auth user created ID:", authData.user?.id);

  // 3. Try creating profile
  console.log("3. Creating profile row...");
  const { data: profData, error: profileError } = await supabase.from("profiles").upsert({
    id: authData.user.id,
    email: testEmail,
    full_name: "Test Employee",
    role: "employee",
    phone: "+919876543210",
    shop_id: shop.id,
  });

  if (profileError) {
    console.error("Profile creation error:", profileError);
    return;
  }
  console.log("Profile created successfully!");

  // 4. Try creating employee record
  console.log("4. Inserting employee record...");
  const { data: empData, error: empError } = await supabase.from("employees").insert({
    shop_id: shop.id,
    profile_id: authData.user.id,
    role: "staff",
    salary: 15000,
  });

  if (empError) {
    console.error("Employee insert error:", empError);
    return;
  }

  console.log("Employee inserted successfully!");
}

runTest();
