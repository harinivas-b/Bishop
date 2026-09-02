import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://crkxdpipyrwpgedesytm.supabase.co";
const supabaseAnonKey = "sb_publishable_6pMdCMERGpnbvA8JQVhqcw_BaBY7Aap";

async function testOwnerQuery() {
  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  // Authenticate as shop owner akshaya.j2025ece@sece.ac.in
  const { data: signData, error: signErr } = await supabase.auth.signInWithPassword({
    email: "akshaya.j2025ece@sece.ac.in",
    password: "Password123!",
  });

  if (signErr) {
    console.log("Sign in with default pass error:", signErr.message);
    return;
  }

  console.log("Signed in successfully as:", signData.user?.id);

  const { data: shop } = await supabase.from("shops").select("*").single();
  console.log("Shop:", shop);

  const { data: employees, error: empErr } = await supabase
    .from("employees")
    .select("*, profile:profiles(*)")
    .eq("shop_id", shop.id);

  console.log("Employees list for shop:", { employees, empErr });
}

testOwnerQuery();
