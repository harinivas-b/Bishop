import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://crkxdpipyrwpgedesytm.supabase.co";
const supabaseAnonKey = "sb_publishable_6pMdCMERGpnbvA8JQVhqcw_BaBY7Aap";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkShops() {
  const { data, error } = await supabase.from("shops").select("*").limit(1);
  if (error) {
    console.error("Error fetching shops:", error);
  } else {
    console.log("Shops sample record:", data);
  }
}

checkShops();
