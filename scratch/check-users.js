import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://crkxdpipyrwpgedesytm.supabase.co";
const supabaseAnonKey = "sb_publishable_6pMdCMERGpnbvA8JQVhqcw_BaBY7Aap";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkProfiles() {
  const { data: profiles, error } = await supabase.from("profiles").select("*");
  console.log("Profiles in DB:", { profiles, error });

  const { data: shops } = await supabase.from("shops").select("*");
  console.log("Shops in DB:", shops);

  const { data: employees } = await supabase.from("employees").select("*");
  console.log("Employees in DB:", employees);
}

checkProfiles();
