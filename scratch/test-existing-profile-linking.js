import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://crkxdpipyrwpgedesytm.supabase.co";
const supabaseAnonKey = "sb_publishable_6pMdCMERGpnbvA8JQVhqcw_BaBY7Aap";

async function testExistingProfileLinking() {
  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  // Get shop
  const { data: shops } = await supabase.from("shops").select("*").limit(1);
  const shop = shops[0];

  console.log("Using Shop ID:", shop.id);

  // Find an existing profile or owner profile
  const { data: profiles } = await supabase.from("profiles").select("*").limit(1);
  if (!profiles || profiles.length === 0) {
    console.log("No profiles found.");
    return;
  }

  const existingProf = profiles[0];
  console.log("Found existing profile ID:", existingProf.id, "email:", existingProf.email);

  // Try linking existing profile to employees table
  console.log("Inserting employee linked to existing profile...");
  const { data: empRes, error: empErr } = await supabase.from("employees").insert({
    shop_id: shop.id,
    profile_id: existingProf.id,
    role: "manager",
    salary: 30000,
    is_active: true,
  });

  if (empErr) {
    console.error("Employee insertion error:", empErr);
    return;
  }

  console.log("Employee inserted successfully!");

  // Query employees joined with profiles
  const { data: list, error: listErr } = await supabase
    .from("employees")
    .select("*, profile:profiles(*)")
    .eq("shop_id", shop.id);

  console.log("Employee list retrieved count:", list?.length);
  console.log("Employee item:", JSON.stringify(list?.[0], null, 2));
}

testExistingProfileLinking();
