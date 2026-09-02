import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://crkxdpipyrwpgedesytm.supabase.co";
const supabaseAnonKey = "sb_publishable_6pMdCMERGpnbvA8JQVhqcw_BaBY7Aap";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testCases() {
  console.log("Checking RLS policies for employees and profiles...");

  // Fetch schema / RLS policies test
  const { data: emp, error: empErr } = await supabase.from("employees").select("*");
  console.log("Employees query result:", { count: emp?.length, empErr });

  const { data: prof, error: profErr } = await supabase.from("profiles").select("*");
  console.log("Profiles query result:", { count: prof?.length, profErr });
}

testCases();
